import { useState, useEffect, useCallback, useMemo } from 'react';
import type { CalendarEventResponse, CalendarEventCreate } from '../types';
import { useToast } from '../components/Toast';
import * as api from '../services/api';

// ── Helpers ─────────────────────────────────────────
const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7 AM – 10 PM
const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function formatWeekRange(monday: Date): string {
  const sunday = new Date(monday);
  sunday.setDate(sunday.getDate() + 6);
  const opts: Intl.DateTimeFormatOptions = { month: 'short', day: 'numeric' };
  return `${monday.toLocaleDateString('en-US', opts)} – ${sunday.toLocaleDateString('en-US', opts)}`;
}

function toISO(d: Date): string {
  return d.toISOString();
}

const EVENT_COLORS: Record<string, string> = {
  study: '#2563EB',
  busy: '#DC2626',
  review: '#16A34A',
};

// ── Component ───────────────────────────────────────

export default function CalendarPage() {
  const { addToast } = useToast();
  const [weekStart, setWeekStart] = useState(() => getMonday(new Date()));
  const [events, setEvents] = useState<CalendarEventResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<{ day: number; hour: number } | null>(null);
  const [form, setForm] = useState({ title: '', event_type: 'study' as 'study' | 'busy' | 'review', notes: '' });

  const weekEnd = useMemo(() => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    return d;
  }, [weekStart]);

  const loadEvents = useCallback(async () => {
    setLoading(true);
    try {
      const data = await api.getSharedEvents(toISO(weekStart), toISO(weekEnd));
      setEvents(data);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, [weekStart, weekEnd]);

  useEffect(() => {
    loadEvents();
  }, [loadEvents]);

  const goToPrev = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() - 7);
    setWeekStart(d);
  };

  const goToNext = () => {
    const d = new Date(weekStart);
    d.setDate(d.getDate() + 7);
    setWeekStart(d);
  };

  const goToThisWeek = () => setWeekStart(getMonday(new Date()));

  const handleSlotClick = (dayIndex: number, hour: number) => {
    setSelectedSlot({ day: dayIndex, hour });
    setForm({ title: '', event_type: 'study', notes: '' });
    setShowModal(true);
  };

  const handleCreateEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim() || !selectedSlot) return;

    const startDate = new Date(weekStart);
    startDate.setDate(startDate.getDate() + selectedSlot.day);
    startDate.setHours(selectedSlot.hour, 0, 0, 0);

    const endDate = new Date(startDate);
    endDate.setHours(startDate.getHours() + 1);

    const payload: CalendarEventCreate = {
      title: form.title,
      start_time: toISO(startDate),
      end_time: toISO(endDate),
      event_type: form.event_type,
      color: EVENT_COLORS[form.event_type],
      notes: form.notes || undefined,
    };

    try {
      await api.createCalendarEvent(payload);
      addToast('Event created!', 'success');
      setShowModal(false);
      loadEvents();
    } catch {
      addToast('Failed to create event', 'error');
    }
  };

  const handleDeleteEvent = async (eventId: string) => {
    try {
      await api.deleteCalendarEvent(eventId);
      setEvents((prev) => prev.filter((e) => e.id !== eventId));
      addToast('Event deleted', 'info');
    } catch {
      addToast('Failed to delete event', 'error');
    }
  };

  // Tính vị trí events trên grid
  const getEventPosition = (event: CalendarEventResponse) => {
    const start = new Date(event.start_time);
    const end = new Date(event.end_time);
    const dayOfWeek = (start.getDay() + 6) % 7; // Mon=0, Sun=6
    const startHour = start.getHours() + start.getMinutes() / 60;
    const endHour = end.getHours() + end.getMinutes() / 60;
    const duration = Math.max(endHour - startHour, 0.5);
    return { dayOfWeek, startHour, duration };
  };

  // Ngày hiện tại
  const today = new Date();
  const todayDayIndex = (today.getDay() + 6) % 7;
  const isThisWeek = getMonday(today).getTime() === weekStart.getTime();

  return (
    <div className="page" id="calendar-page" style={{ maxWidth: '100%' }}>
      {/* Header */}
      <div className="page-header flex items-center justify-between animate-in">
        <div>
          <h1>Study Calendar</h1>
          <p className="text-sm text-secondary">{formatWeekRange(weekStart)}</p>
        </div>
        <div className="flex gap-2">
          <button className="btn btn-ghost btn-sm" onClick={goToPrev}>← Prev</button>
          <button className="btn btn-secondary btn-sm" onClick={goToThisWeek}>Today</button>
          <button className="btn btn-ghost btn-sm" onClick={goToNext}>Next →</button>
        </div>
      </div>

      {/* Legend */}
      <div className="flex gap-4 items-center animate-in animate-in-delay-1" style={{ marginBottom: 'var(--space-4)' }}>
        <div className="flex items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#2563EB' }} />
          <span className="text-xs text-secondary">Study</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#16A34A' }} />
          <span className="text-xs text-secondary">Review</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#DC2626' }} />
          <span className="text-xs text-secondary">Busy</span>
        </div>
        <div className="flex items-center gap-1">
          <div style={{ width: 10, height: 10, borderRadius: 2, background: '#D97706', opacity: 0.7 }} />
          <span className="text-xs text-secondary">Partner's events</span>
        </div>
      </div>

      {/* Calendar Grid */}
      {loading ? (
        <div className="empty-state"><div className="spinner" /></div>
      ) : (
        <div className="card animate-in animate-in-delay-2" style={{ padding: 0, overflow: 'auto' }}>
          <div className="calendar-grid" style={{
            display: 'grid',
            gridTemplateColumns: '60px repeat(7, 1fr)',
            position: 'relative',
            minWidth: 700,
          }}>
            {/* Header row */}
            <div className="calendar-corner" style={{
              borderBottom: '1px solid var(--color-border)',
              borderRight: '1px solid var(--color-border-light)',
              padding: 'var(--space-2)',
              position: 'sticky',
              top: 0,
              background: 'var(--color-surface)',
              zIndex: 3,
            }} />
            {DAYS.map((day, i) => {
              const dayDate = new Date(weekStart);
              dayDate.setDate(dayDate.getDate() + i);
              const isToday = isThisWeek && i === todayDayIndex;
              return (
                <div
                  key={day}
                  className="calendar-day-header"
                  style={{
                    textAlign: 'center',
                    padding: 'var(--space-2) var(--space-1)',
                    borderBottom: '1px solid var(--color-border)',
                    borderRight: i < 6 ? '1px solid var(--color-border-light)' : undefined,
                    background: isToday ? 'var(--color-accent-light)' : 'var(--color-surface)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 2,
                  }}
                >
                  <div className="text-xs text-tertiary">{day}</div>
                  <div style={{
                    fontWeight: isToday ? 'var(--weight-semi)' : 'var(--weight-normal)',
                    color: isToday ? 'var(--color-accent)' : undefined,
                    fontSize: 'var(--text-lg)',
                  }}>
                    {dayDate.getDate()}
                  </div>
                </div>
              );
            })}

            {/* Hour rows */}
            {HOURS.map((hour) => (
              <>
                <div
                  key={`label-${hour}`}
                  className="calendar-hour-label"
                  style={{
                    borderRight: '1px solid var(--color-border-light)',
                    borderBottom: '1px solid var(--color-border-light)',
                    padding: '2px var(--space-2)',
                    fontSize: 'var(--text-xs)',
                    color: 'var(--color-text-tertiary)',
                    textAlign: 'right',
                    height: 48,
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'flex-end',
                  }}
                >
                  {hour > 12 ? `${hour - 12}PM` : hour === 12 ? '12PM' : `${hour}AM`}
                </div>
                {DAYS.map((_, dayIndex) => (
                  <div
                    key={`cell-${hour}-${dayIndex}`}
                    className="calendar-cell"
                    onClick={() => handleSlotClick(dayIndex, hour)}
                    style={{
                      borderBottom: '1px solid var(--color-border-light)',
                      borderRight: dayIndex < 6 ? '1px solid var(--color-border-light)' : undefined,
                      height: 48,
                      cursor: 'pointer',
                      position: 'relative',
                      transition: 'background var(--transition-fast)',
                    }}
                    onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--color-hover)')}
                    onMouseLeave={(e) => (e.currentTarget.style.background = '')}
                  />
                ))}
              </>
            ))}

            {/* Events Overlay */}
            {events.map((event) => {
              const { dayOfWeek, startHour, duration } = getEventPosition(event);
              if (dayOfWeek < 0 || dayOfWeek > 6) return null;
              const topOffset = (startHour - 7) * 48 + 58; // 58 = header height
              const height = duration * 48;
              const leftPercent = ((dayOfWeek) / 7) * 100;

              return (
                <div
                  key={event.id}
                  className="calendar-event"
                  style={{
                    position: 'absolute',
                    top: topOffset,
                    left: `calc(60px + ${leftPercent}% + 2px)`,
                    width: `calc(${100 / 7}% - 4px)`,
                    height: Math.max(height - 2, 20),
                    background: event.is_own ? event.color : '#D97706',
                    opacity: event.is_own ? 0.9 : 0.65,
                    color: '#fff',
                    borderRadius: 'var(--radius-sm)',
                    padding: '2px 6px',
                    fontSize: 'var(--text-xs)',
                    overflow: 'hidden',
                    cursor: 'pointer',
                    zIndex: 1,
                    lineHeight: 1.3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 1,
                    boxShadow: '0 1px 2px rgba(0,0,0,0.1)',
                    transition: 'transform var(--transition-fast), box-shadow var(--transition-fast)',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.transform = 'scale(1.02)';
                    e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.15)';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.boxShadow = '0 1px 2px rgba(0,0,0,0.1)';
                  }}
                  title={`${event.title}${!event.is_own ? ` (${event.user_name})` : ''}\n${event.notes || ''}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (event.is_own && confirm(`Delete "${event.title}"?`)) {
                      handleDeleteEvent(event.id);
                    }
                  }}
                >
                  <strong style={{ fontWeight: 600 }}>{event.title}</strong>
                  {!event.is_own && (
                    <span style={{ opacity: 0.85 }}>{event.user_name}</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Create Event Modal */}
      {showModal && selectedSlot && (
        <div className="overlay" onClick={(e) => e.target === e.currentTarget && setShowModal(false)}>
          <div className="modal animate-scale-in" style={{ maxWidth: 400 }}>
            <div className="modal-header">
              <h2>New Event</h2>
              <button className="btn btn-ghost btn-sm" onClick={() => setShowModal(false)}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <form onSubmit={handleCreateEvent}>
              <div className="flex flex-col gap-4">
                <div>
                  <span className="text-sm text-secondary">
                    {DAYS[selectedSlot.day]}, {(() => {
                      const d = new Date(weekStart);
                      d.setDate(d.getDate() + selectedSlot.day);
                      return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
                    })()} at {selectedSlot.hour > 12 ? `${selectedSlot.hour - 12}:00 PM` : selectedSlot.hour === 12 ? '12:00 PM' : `${selectedSlot.hour}:00 AM`}
                  </span>
                </div>

                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input
                    className="input"
                    value={form.title}
                    onChange={(e) => setForm({ ...form, title: e.target.value })}
                    placeholder="e.g. Grammar Practice"
                    required
                    autoFocus
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Type</label>
                  <div className="flex gap-2">
                    {(['study', 'review', 'busy'] as const).map((type) => (
                      <button
                        key={type}
                        type="button"
                        className={`btn btn-sm ${form.event_type === type ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => setForm({ ...form, event_type: type })}
                        style={form.event_type === type ? { background: EVENT_COLORS[type], borderColor: EVENT_COLORS[type] } : undefined}
                      >
                        {type === 'study' ? '📖 Study' : type === 'review' ? '📇 Review' : '🚫 Busy'}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Notes (optional)</label>
                  <input
                    className="input"
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Any details..."
                  />
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Create Event</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
