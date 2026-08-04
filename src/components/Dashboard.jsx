"use client";

import {
  BookOpen,
  Sparkles,
  Target,
  Flame,
  Plus,
  Mic,
  PenLine,
  BookOpenCheck,
  Headphones,
} from "lucide-react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { StatCard } from "./ui/StatCard";
import { EmptyState } from "./ui/EmptyState";
import { fmtDate } from "@/lib/utils";

export function Dashboard({
  vocabList = [],
  shadowingHistory = [],
  writingHistory = [],
  speakingHistory = [],
  readingHistory = [],
  listeningHistory = [],
  setTab,
}) {
  const totalVocab = vocabList.length;
  const activeVocab = vocabList.filter((v) => v.status === "active").length;
  const nowISO = new Date().toISOString();
  const dueToday = vocabList.filter(
    (v) => v.due_date && v.due_date <= nowISO
  ).length;
  const recentShadow = shadowingHistory.filter(
    (s) => Date.now() - new Date(s.created_at).getTime() < 7 * 86400000
  ).length;

  const totalReadingTests = readingHistory.length;
  const totalListeningTests = listeningHistory.length;

  const lastWriting = writingHistory[writingHistory.length - 1];
  const lastSpeaking = speakingHistory[speakingHistory.length - 1];

  const writingChart = writingHistory.map((w, i) => ({
    attempt: i + 1,
    band: w.band_overall,
  }));
  const speakingChart = speakingHistory.map((s, i) => ({
    attempt: i + 1,
    band: s.band_overall,
  }));

  return (
    <div className="panel">
      <div className="stat-grid">
        <StatCard
          icon={BookOpen}
          label="Từ đã lưu"
          value={totalVocab}
          accent="var(--jade)"
        />
        <StatCard
          icon={Sparkles}
          label="Từ chủ động"
          value={activeVocab}
          accent="var(--amber)"
        />
        <StatCard
          icon={Target}
          label="Cần ôn hôm nay"
          value={dueToday}
          accent="var(--coral)"
        />
        <StatCard
          icon={Flame}
          label="Shadowing (7 ngày)"
          value={recentShadow}
          accent="var(--jade-light)"
        />
        <StatCard
          icon={BookOpenCheck}
          label="Bài Reading"
          value={totalReadingTests}
          accent="var(--amber)"
        />
        <StatCard
          icon={Headphones}
          label="Bài Listening"
          value={totalListeningTests}
          accent="var(--jade)"
        />
      </div>

      <div className="quick-row">
        <button className="btn-primary" onClick={() => setTab("vocab")}>
          <Plus size={15} /> Học từ vựng
        </button>
        <button className="btn-primary" onClick={() => setTab("shadowing")}>
          <Mic size={15} /> Luyện Shadowing
        </button>
        <button className="btn-primary" onClick={() => setTab("ielts")}>
          <PenLine size={15} /> Luyện Writing & Speaking
        </button>
        <button className="btn-ghost" onClick={() => setTab("reading")}>
          <BookOpenCheck size={15} /> Luyện Reading Test
        </button>
        <button className="btn-ghost" onClick={() => setTab("listening")}>
          <Headphones size={15} /> Luyện Listening Test
        </button>
      </div>

      <div className="chart-grid">
        <div className="card">
          <h3 className="section-title">Tiến độ Writing (Band)</h3>
          {writingChart.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={writingChart}>
                <CartesianGrid
                  stroke="var(--border-soft)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="attempt"
                  stroke="var(--text-soft)"
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 9]}
                  stroke="var(--text-soft)"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--ink-2)",
                    border: "1px solid var(--border-soft)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="band"
                  stroke="var(--jade-light)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Chưa có bài Writing nào được chấm." />
          )}
          {lastWriting && (
            <p className="small-note">
              Gần nhất: band {lastWriting.band_overall} ·{" "}
              {fmtDate(lastWriting.created_at)}
            </p>
          )}
        </div>

        <div className="card">
          <h3 className="section-title">Tiến độ Speaking (Band)</h3>
          {speakingChart.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={speakingChart}>
                <CartesianGrid
                  stroke="var(--border-soft)"
                  strokeDasharray="3 3"
                />
                <XAxis
                  dataKey="attempt"
                  stroke="var(--text-soft)"
                  fontSize={11}
                />
                <YAxis
                  domain={[0, 9]}
                  stroke="var(--text-soft)"
                  fontSize={11}
                />
                <Tooltip
                  contentStyle={{
                    background: "var(--ink-2)",
                    border: "1px solid var(--border-soft)",
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="band"
                  stroke="var(--amber)"
                  strokeWidth={2}
                  dot={{ r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Chưa có bài Speaking nào được chấm." />
          )}
          {lastSpeaking && (
            <p className="small-note">
              Gần nhất: band {lastSpeaking.band_overall} ·{" "}
              {fmtDate(lastSpeaking.created_at)}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
