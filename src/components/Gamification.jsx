"use client";

import { useMemo } from "react";
import { Flame, Target, BookOpen, Mic, PenLine, BookOpenCheck, Headphones, Sparkles } from "lucide-react";

const MONTHS = ["Th1","Th2","Th3","Th4","Th5","Th6","Th7","Th8","Th9","Th10","Th11","Th12"];
const DAYS   = ["CN","T2","T3","T4","T5","T6","T7"];

function getIntensity(activity) {
  if (!activity) return 0;
  let score = 0;
  if (activity.words_studied >= 5) score++;
  if (activity.shadowing_done) score++;
  if (activity.reading_done) score++;
  if (activity.listening_done) score++;
  if (activity.writing_done || activity.speaking_done) score++;
  return score; // 0-5
}

const INTENSITY_COLORS = [
  "var(--ink-3)",
  "rgba(62,133,119,0.2)",
  "rgba(62,133,119,0.4)",
  "rgba(62,133,119,0.65)",
  "rgba(62,133,119,0.85)",
  "var(--jade)",
];

export function ActivityHeatmap({ activities = [], currentStreak = 0, longestStreak = 0 }) {
  // Build last 16 weeks (112 days) grid
  const cells = useMemo(() => {
    const actMap = {};
    activities.forEach((a) => { actMap[a.activity_date] = a; });

    const today = new Date();
    const result = [];
    for (let i = 111; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(today.getDate() - i);
      const dateStr = d.toISOString().slice(0, 10);
      result.push({
        date: dateStr,
        day: d.getDay(),
        month: d.getMonth(),
        label: `${d.getDate()} ${MONTHS[d.getMonth()]}`,
        activity: actMap[dateStr] || null,
        intensity: getIntensity(actMap[dateStr]),
      });
    }
    return result;
  }, [activities]);

  // Split into columns of 7 (weeks)
  const weeks = useMemo(() => {
    const w = [];
    for (let i = 0; i < cells.length; i += 7) {
      w.push(cells.slice(i, i + 7));
    }
    return w;
  }, [cells]);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          <Flame size={16} style={{ display: "inline", color: "var(--coral)", marginRight: 6 }} />
          Chuỗi ngày học
        </h3>
        <div style={{ display: "flex", gap: 16 }}>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 20, fontWeight: 700, color: "var(--coral)" }}>
              {currentStreak}🔥
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Hiện tại</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 20, fontWeight: 700, color: "var(--amber)" }}>
              {longestStreak}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Kỷ lục</div>
          </div>
        </div>
      </div>

      <div style={{ overflowX: "auto" }}>
        <div style={{ display: "flex", gap: 3, minWidth: "fit-content" }}>
          {weeks.map((week, wi) => (
            <div key={wi} style={{ display: "flex", flexDirection: "column", gap: 3 }}>
              {week.map((cell) => (
                <div
                  key={cell.date}
                  title={`${cell.label}: ${cell.intensity === 0 ? "Chưa học" : `${cell.intensity * 20}% mục tiêu hoàn thành`}`}
                  style={{
                    width: 12,
                    height: 12,
                    borderRadius: 2,
                    background: INTENSITY_COLORS[cell.intensity],
                    cursor: "help",
                    transition: "transform 0.1s ease",
                  }}
                  onMouseEnter={(e) => (e.target.style.transform = "scale(1.4)")}
                  onMouseLeave={(e) => (e.target.style.transform = "scale(1)")}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 8, fontSize: 11, color: "var(--text-soft)" }}>
        Ít
        {INTENSITY_COLORS.map((c, i) => (
          <div key={i} style={{ width: 10, height: 10, borderRadius: 2, background: c }} />
        ))}
        Nhiều
      </div>
    </div>
  );
}

/* ─── Daily Missions Panel ─── */
export function DailyMissions({ todayActivity, stats, setTab }) {
  const missions = [
    {
      icon: BookOpen, key: "words", label: `Học ${stats?.daily_words_goal || 10} từ vựng`,
      done: (todayActivity?.words_studied || 0) >= (stats?.daily_words_goal || 10),
      progress: Math.min(todayActivity?.words_studied || 0, stats?.daily_words_goal || 10),
      goal: stats?.daily_words_goal || 10,
      tab: "vocab", xp: 50,
    },
    {
      icon: Mic, key: "shadowing", label: "Luyện 1 bài Shadowing",
      done: !!todayActivity?.shadowing_done, tab: "shadowing", xp: 20,
    },
    {
      icon: BookOpenCheck, key: "reading", label: "Làm 1 bài Reading Test",
      done: !!todayActivity?.reading_done, tab: "reading", xp: 30,
    },
    {
      icon: Headphones, key: "listening", label: "Làm 1 bài Listening Test",
      done: !!todayActivity?.listening_done, tab: "listening", xp: 25,
    },
    {
      icon: PenLine, key: "writing", label: "Viết 1 bài Writing / Speaking",
      done: !!todayActivity?.writing_done || !!todayActivity?.speaking_done, tab: "ielts", xp: 35,
    },
  ];

  const completedCount = missions.filter((m) => m.done).length;
  const totalXP = missions.filter((m) => m.done).reduce((s, m) => s + m.xp, 0);

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h3 className="section-title" style={{ margin: 0 }}>
          <Target size={16} style={{ display: "inline", color: "var(--jade)", marginRight: 6 }} />
          Nhiệm vụ hôm nay ({completedCount}/{missions.length})
        </h3>
        <span style={{ fontFamily: "IBM Plex Mono", fontSize: 13, color: "var(--amber)", fontWeight: 700 }}>
          ⚡ {totalXP} XP
        </span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {missions.map((m) => (
          <div
            key={m.key}
            className="mission-item"
            style={{ opacity: m.done ? 0.65 : 1 }}
            onClick={() => !m.done && setTab(m.tab)}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div
                style={{
                  width: 28, height: 28, borderRadius: 8,
                  background: m.done ? "var(--jade)" : "var(--ink-3)",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  flexShrink: 0,
                }}
              >
                {m.done
                  ? <span style={{ fontSize: 14 }}>✓</span>
                  : <m.icon size={14} style={{ color: "var(--text-soft)" }} />}
              </div>
              <div style={{ flex: 1 }}>
                <p style={{ fontSize: 13, fontWeight: m.done ? 400 : 600, textDecoration: m.done ? "line-through" : "none" }}>
                  {m.label}
                </p>
                {m.progress !== undefined && !m.done && (
                  <div style={{ marginTop: 4, height: 4, background: "var(--ink)", borderRadius: 2, overflow: "hidden" }}>
                    <div style={{ height: "100%", width: `${(m.progress / m.goal) * 100}%`, background: "var(--jade)", transition: "width 0.3s" }} />
                  </div>
                )}
              </div>
              <span style={{ fontSize: 11, color: "var(--amber)", fontFamily: "IBM Plex Mono" }}>+{m.xp}XP</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Target Band Planner ─── */
export function TargetBandPlanner({ stats, onSave }) {
  const daysLeft = stats?.exam_date
    ? Math.max(0, Math.ceil((new Date(stats.exam_date) - new Date()) / 86400000))
    : null;

  return (
    <div className="card" style={{ borderColor: "rgba(214,169,75,0.3)" }}>
      <h3 className="section-title" style={{ color: "var(--amber)" }}>
        🎯 Mục tiêu IELTS
      </h3>
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <div style={{ textAlign: "center", flex: 1, minWidth: 80 }}>
          <div style={{ fontFamily: "IBM Plex Mono", fontSize: 28, fontWeight: 700, color: "var(--amber)" }}>
            {stats?.target_band || "7.0"}
          </div>
          <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Band mục tiêu</div>
        </div>
        {daysLeft !== null && (
          <div style={{ textAlign: "center", flex: 1, minWidth: 80 }}>
            <div style={{ fontFamily: "IBM Plex Mono", fontSize: 28, fontWeight: 700, color: "var(--jade-light)" }}>
              {daysLeft}
            </div>
            <div style={{ fontSize: 11, color: "var(--text-soft)" }}>Ngày còn lại</div>
          </div>
        )}
        <div style={{ flex: 2, minWidth: 160 }}>
          <label style={{ fontSize: 12, color: "var(--text-soft)", display: "block", marginBottom: 4 }}>Band mục tiêu</label>
          <select
            className="select-field"
            defaultValue={stats?.target_band || 7.0}
            onChange={(e) => onSave({ target_band: parseFloat(e.target.value) })}
            style={{ width: "100%", marginBottom: 8 }}
          >
            {[5.0,5.5,6.0,6.5,7.0,7.5,8.0,8.5,9.0].map((b) => (
              <option key={b} value={b}>Band {b}</option>
            ))}
          </select>
          <label style={{ fontSize: 12, color: "var(--text-soft)", display: "block", marginBottom: 4 }}>Ngày thi dự kiến</label>
          <input
            type="date"
            className="input-field"
            defaultValue={stats?.exam_date || ""}
            style={{ width: "100%" }}
            onChange={(e) => onSave({ exam_date: e.target.value })}
          />
        </div>
      </div>
    </div>
  );
}
