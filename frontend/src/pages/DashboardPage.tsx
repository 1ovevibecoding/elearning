import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { getFlashcardStats, getVocabulary, getStreak, getComparison } from '../services/api';
import type { FlashcardStats, Vocabulary, UserComparison } from '../types';
import StreakBadge from '../components/StreakBadge';
import Heatmap from '../components/Heatmap';
import ProgressRing from '../components/ProgressRing';

export default function DashboardPage() {
  const { user } = useAuth();
  const [stats, setStats] = useState<FlashcardStats | null>(null);
  const [recentWords, setRecentWords] = useState<Vocabulary[]>([]);
  const [streakDays, setStreakDays] = useState(0);
  const [comparison, setComparison] = useState<UserComparison[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    Promise.all([
      getFlashcardStats().catch(() => null),
      getVocabulary(1, 5).catch(() => null),
      getStreak().catch(() => null),
      getComparison().catch(() => []),
    ]).then(([s, v, streak, comp]) => {
      if (cancelled) return;
      if (s) setStats(s);
      if (v) setRecentWords(v.items);
      if (streak) setStreakDays(streak.current_streak);
      if (comp) setComparison(comp);
      setLoading(false);
    });

    return () => { cancelled = true; };
  }, []);

  const today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
  });

  if (loading) {
    return (
      <div className="page" id="dashboard-page">
        <div className="page-header animate-in">
          <div className="skeleton skeleton-title" />
          <div className="skeleton skeleton-text" style={{ width: '30%' }} />
        </div>
        <div className="stat-grid">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="skeleton skeleton-card" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="page" id="dashboard-page">
      {/* Header */}
      <div className="page-header flex items-center justify-between animate-in">
        <div>
          <p className="text-sm text-secondary" style={{ marginBottom: 'var(--space-1)' }}>{today}</p>
          <h1>Welcome back, {user?.name ?? 'learner'}</h1>
        </div>
        <StreakBadge days={streakDays} />
      </div>

      {/* Stats + Progress Ring */}
      <div className="flex gap-6 items-center animate-in animate-in-delay-1" style={{ flexWrap: 'wrap' }}>
        <ProgressRing
          value={stats?.due_today ? Math.max(0, 100 - (stats.due_today / Math.max(stats.total_cards, 1)) * 100) : 100}
          size={110}
          label={`${stats?.due_today ?? 0}`}
          caption="cards due"
          color={(stats?.due_today ?? 0) > 0 ? 'var(--color-accent)' : 'var(--color-green)'}
        />
        <div className="stat-grid" style={{ flex: 1 }} id="dashboard-stats">
          <div className="stat card-hover">
            <div className="stat-value">{stats?.total_cards ?? 0}</div>
            <div className="stat-label">Total Cards</div>
          </div>
          <div className="stat card-hover">
            <div className="stat-value" style={{ color: (stats?.due_today ?? 0) > 0 ? 'var(--color-accent)' : undefined }}>
              {stats?.due_today ?? 0}
            </div>
            <div className="stat-label">Due Today</div>
          </div>
          <div className="stat card-hover">
            <div className="stat-value">{stats?.learning_cards ?? 0}</div>
            <div className="stat-label">Learning</div>
          </div>
          <div className="stat card-hover">
            <div className="stat-value">{stats?.review_cards ?? 0}</div>
            <div className="stat-label">In Review</div>
          </div>
        </div>
      </div>

      {/* Quick Actions */}
      <section style={{ marginTop: 'var(--space-6)' }} className="animate-in animate-in-delay-2">
        <h3 style={{ marginBottom: 'var(--space-3)' }}>Quick Actions</h3>
        <div className="quick-action-grid">
          <Link to="/flashcards" className="quick-action">
            <div className="quick-action-icon" style={{ background: 'var(--color-accent-light)' }}>📇</div>
            <div>
              <div className="quick-action-label">Review Flashcards</div>
              <div className="quick-action-sublabel">
                {(stats?.due_today ?? 0) > 0 ? `${stats!.due_today} cards waiting` : 'All caught up!'}
              </div>
            </div>
          </Link>
          <Link to="/vocabulary" className="quick-action">
            <div className="quick-action-icon" style={{ background: 'var(--color-green-light)' }}>📖</div>
            <div>
              <div className="quick-action-label">Add Vocabulary</div>
              <div className="quick-action-sublabel">Grow your word bank</div>
            </div>
          </Link>
          <Link to="/grammar" className="quick-action">
            <div className="quick-action-icon" style={{ background: 'var(--color-amber-light)' }}>✏️</div>
            <div>
              <div className="quick-action-label">Grammar Check</div>
              <div className="quick-action-sublabel">Fix your writing</div>
            </div>
          </Link>
          <Link to="/calendar" className="quick-action">
            <div className="quick-action-icon" style={{ background: 'var(--color-red-light)' }}>📅</div>
            <div>
              <div className="quick-action-label">Study Calendar</div>
              <div className="quick-action-sublabel">Schedule with your partner</div>
            </div>
          </Link>
        </div>
      </section>

      {/* Progress Comparison */}
      {comparison.length > 1 && (
        <section style={{ marginTop: 'var(--space-6)' }} className="animate-in animate-in-delay-3">
          <h3 style={{ marginBottom: 'var(--space-3)' }}>Progress Comparison</h3>
          <div className="card" style={{ padding: 'var(--space-4)', overflow: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Learner</th>
                  <th style={{ textAlign: 'center' }}>Vocabulary</th>
                  <th style={{ textAlign: 'center' }}>Flashcards</th>
                  <th style={{ textAlign: 'center' }}>Reviews</th>
                </tr>
              </thead>
              <tbody>
                {comparison.map((c) => (
                  <tr key={c.user_id} style={{ background: c.is_current_user ? 'var(--color-accent-light)' : undefined }}>
                    <td>
                      <div className="flex items-center gap-2">
                        <div style={{
                          width: 28, height: 28, borderRadius: '50%',
                          background: c.is_current_user ? 'var(--color-accent)' : 'var(--color-green)',
                          color: '#fff', display: 'flex', alignItems: 'center', justifyContent: 'center',
                          fontSize: 'var(--text-xs)', fontWeight: 'var(--weight-semi)',
                        }}>
                          {c.avatar_initial}
                        </div>
                        <span style={{ fontWeight: 'var(--weight-medium)' }}>
                          {c.name} {c.is_current_user && <span className="text-xs text-tertiary">(you)</span>}
                        </span>
                      </div>
                    </td>
                    <td style={{ textAlign: 'center', fontWeight: 'var(--weight-medium)' }}>{c.total_vocabulary}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'var(--weight-medium)' }}>{c.total_flashcards}</td>
                    <td style={{ textAlign: 'center', fontWeight: 'var(--weight-medium)' }}>{c.total_reviews}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      {/* Learning Activity Heatmap */}
      <section style={{ marginTop: 'var(--space-6)' }} className="animate-in animate-in-delay-4">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-3)' }}>
          <h3>Learning Activity</h3>
          <span className="text-xs text-tertiary">Last 20 weeks</span>
        </div>
        <div className="card" style={{ padding: 'var(--space-4)' }}>
          <Heatmap />
        </div>
      </section>

      {/* Recent Vocabulary */}
      <section style={{ marginTop: 'var(--space-6)' }} className="animate-in animate-in-delay-5">
        <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
          <h3>Recent Words</h3>
          <Link to="/vocabulary" className="btn btn-ghost btn-sm">View all →</Link>
        </div>

        {recentWords.length === 0 ? (
          <div className="empty-state" style={{ padding: 'var(--space-6) var(--space-4)' }}>
            <p>No words saved yet.</p>
            <Link to="/vocabulary" className="btn btn-secondary btn-sm" style={{ marginTop: 'var(--space-3)' }}>
              Add your first word
            </Link>
          </div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead><tr><th>Word</th><th>Definition</th><th>Part of Speech</th></tr></thead>
              <tbody>
                {recentWords.map((w) => (
                  <tr key={w.id}>
                    <td style={{ fontWeight: 'var(--weight-medium)' }}>{w.word}</td>
                    <td className="text-secondary">{w.definition}</td>
                    <td>{w.part_of_speech && <span className="badge">{w.part_of_speech}</span>}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
