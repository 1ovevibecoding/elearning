/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/immutability, react-hooks/exhaustive-deps */
"use client";

import { useMemo } from "react";
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
  Compass,
  ArrowRight,
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

  const recentShadow = useMemo(() => {
    const now = Date.now();
    return shadowingHistory.filter(
      (s) => now - new Date(s.created_at).getTime() < 7 * 86400000
    ).length;
  }, [shadowingHistory]);

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
      {/* ─── Diagnostic Banner ─── */}
      <div
        className="card"
        style={{
          background: "linear-gradient(135deg, rgba(30, 48, 44, 0.95) 0%, rgba(18, 28, 30, 0.95) 100%)",
          border: "1px solid rgba(218, 119, 86, 0.4)",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: 16,
          padding: "16px 20px",
          marginBottom: 16,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <div
            style={{
              width: 44,
              height: 44,
              borderRadius: "50%",
              background: "rgba(218, 119, 86, 0.2)",
              border: "1px solid var(--jade)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "var(--jade-light)",
            }}
          >
            <Compass size={22} />
          </div>
          <div>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <strong style={{ fontSize: 15, color: "var(--text-bright)" }}>
                Test Đầu Vào Reading & Listening
              </strong>
              <span className="chip chip-active" style={{ fontSize: 10, padding: "1px 6px", background: "var(--jade)" }}>
                Khuyên Dùng
              </span>
            </div>
            <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: "2px 0 0" }}>
              Làm bài kiểm tra 18 câu chuẩn Cambridge để AI chẩn đoán Band điểm và lập lộ trình học cá nhân hóa.
            </p>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => setTab("diagnostic")}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            fontWeight: 700,
            boxShadow: "0 0 12px rgba(218, 119, 86,0.3)",
          }}
        >
          Làm bài Test ngay <ArrowRight size={14} />
        </button>
      </div>

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
