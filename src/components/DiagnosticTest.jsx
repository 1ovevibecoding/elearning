"use client";
/* eslint-disable react-hooks/purity, react-hooks/set-state-in-effect, react-hooks/immutability, react-hooks/exhaustive-deps */
"use client";

import { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  BookOpenCheck,
  Headphones,
  Award,
  Clock,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Compass,
  ShieldCheck,
  Volume2,
  RotateCcw,
  TrendingUp,
  Flame,
  Check,
  Layers,
} from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { speak, fmtDate } from "@/lib/utils";

export function DiagnosticTest({
  supabase,
  userId,
  userStats,
  setUserStats,
  setTab,
  onActivityDone,
}) {
  const [step, setStep] = useState("intro"); // "intro" | "reading" | "listening" | "report"
  const [loading, setLoading] = useState(false);
  const [evaluating, setEvaluating] = useState(false);
  const [testData, setTestData] = useState(null);
  const [readingAnswers, setReadingAnswers] = useState({});
  const [listeningAnswers, setListeningAnswers] = useState({});
  const [evalResult, setEvalResult] = useState(null);
  const [history, setHistory] = useState([]);
  const [applied, setApplied] = useState(false);

  // Audio player states
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioRate, setAudioRate] = useState(1.0);

  // Timer
  const [timeLeft, setTimeLeft] = useState(25 * 60); // 25 mins
  const timerRef = useRef(null);

  // Load diagnostic test history from Supabase
  useEffect(() => {
    if (!supabase || !userId) return;
    async function loadHistory() {
      try {
        const { data, error } = await supabase
          .from("diagnostic_tests")
          .select("*")
          .eq("user_id", userId)
          .order("created_at", { ascending: false });
        if (!error && data) {
          setHistory(data);
        }
      } catch (e) {
        console.error("Failed to load diagnostic history:", e);
      }
    }
    loadHistory();
  }, [supabase, userId]);

  // Restore ongoing diagnostic test session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ielts_diagnostic_active_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.testData && (parsed.step === "reading" || parsed.step === "listening")) {
          setTestData(parsed.testData);
          setStep(parsed.step);
          setReadingAnswers(parsed.readingAnswers || {});
          setListeningAnswers(parsed.listeningAnswers || {});
          setTimeLeft(parsed.timeLeft || 25 * 60);
        }
      }
    } catch (e) {
      console.error("Failed to restore diagnostic session", e);
    }
  }, []);

  // Auto-save active diagnostic session to localStorage
  useEffect(() => {
    if (testData && (step === "reading" || step === "listening")) {
      try {
        localStorage.setItem(
          "ielts_diagnostic_active_session",
          JSON.stringify({
            testData,
            step,
            readingAnswers,
            listeningAnswers,
            timeLeft,
          })
        );
      } catch (e) {}
    }
  }, [testData, step, readingAnswers, listeningAnswers, timeLeft]);

  // Timer countdown
  useEffect(() => {
    if (step === "reading" || step === "listening") {
      timerRef.current = setInterval(() => {
        setTimeLeft((prev) => (prev > 0 ? prev - 1 : 0));
      }, 1000);
    } else {
      clearInterval(timerRef.current);
    }
    return () => clearInterval(timerRef.current);
  }, [step]);

  function formatTime(secs) {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  }

  // 1. Generate new test
  async function handleStartTest() {
    try {
      localStorage.removeItem("ielts_diagnostic_active_session");
    } catch (e) {}

    setLoading(true);
    setReadingAnswers({});
    setListeningAnswers({});
    setEvalResult(null);
    setApplied(false);
    setTimeLeft(25 * 60);


    try {
      const res = await fetch("/api/ai/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate" }),
      });
      const data = await res.json();
      if (data.reading && data.listening) {
        setTestData(data);
        setStep("reading");
      } else {
        alert("Không thể khởi tạo bài test. Vui lòng bấm thử lại!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối máy chủ khi sinh bài test.");
    }
    setLoading(false);
  }

  // 2. Audio playback controls
  function handlePlayAudio() {
    if (!testData?.listening?.transcript) return;
    if (isPlaying) {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
      setIsPlaying(false);
    } else {
      setIsPlaying(true);
      speak(testData.listening.transcript, "en-US", audioRate, () => {
        setIsPlaying(false);
      });
    }
  }

  // 3. Submit and Evaluate
  async function handleEvaluate() {
    if (evaluating) return;
    setEvaluating(true);

    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      setIsPlaying(false);
    }

    try {
      const res = await fetch("/api/ai/diagnostic", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "evaluate",
          userAnswers: {
            readingAnswers,
            listeningAnswers,
            testData,
          },
        }),
      });

      const result = await res.json();
      if (result.estimated_band !== undefined) {
        setEvalResult(result);
        setStep("report");
        try {
          localStorage.removeItem("ielts_diagnostic_active_session");
        } catch (e) {}


        // Save to Supabase
        if (supabase) {
          const record = {
            user_id: userId,
            reading_score: result.reading_score,
            reading_total: result.reading_total,
            listening_score: result.listening_score,
            listening_total: result.listening_total,
            estimated_band: result.estimated_band,
            reading_band: result.reading_band,
            listening_band: result.listening_band,
            cefr_level: result.cefr_level,
            strengths: result.strengths,
            weaknesses: result.weaknesses,
            study_roadmap: result.study_roadmap,
            raw_answers: { readingAnswers, listeningAnswers },
          };

          const { data: inserted, error } = await supabase
            .from("diagnostic_tests")
            .insert(record)
            .select()
            .single();

          if (!error && inserted) {
            setHistory((prev) => [inserted, ...prev]);
          }
        }
      } else {
        alert("Không thể phân tích bài làm. Vui lòng thử lại!");
      }
    } catch (e) {
      console.error(e);
      alert("Lỗi kết nối khi đánh giá kết quả.");
    }
    setEvaluating(false);
  }

  // 4. Apply to User Profile & Claim +100 XP
  async function handleApplyProfile() {
    if (!evalResult || applied) return;
    try {
      if (supabase && userId) {
        await supabase.from("user_stats").upsert({
          user_id: userId,
          target_band: evalResult.estimated_band < 7.0 ? 7.0 : evalResult.estimated_band + 0.5,
        });
        if (setUserStats) {
          setUserStats((p) => ({
            ...p,
            target_band: evalResult.estimated_band < 7.0 ? 7.0 : evalResult.estimated_band + 0.5,
          }));
        }
      }
      setApplied(true);
      if (onActivityDone) {
        // Grant bonus XP for diagnostic completion
        onActivityDone("reading");
        onActivityDone("listening");
      }
      alert(`🎉 Đã cập nhật kết quả và cộng điểm thưởng thành công!`);
    } catch (e) {
      console.error(e);
    }
  }

  // Count answered
  const rAnsweredCount = Object.keys(readingAnswers).filter((k) => (readingAnswers[k] || "").trim()).length;
  const lAnsweredCount = Object.keys(listeningAnswers).filter((k) => (listeningAnswers[k] || "").trim()).length;

  return (
    <div className="panel diagnostic-container">
      {/* ─── STEP 0: INTRO / DASHBOARD OF DIAGNOSTIC ─── */}
      {step === "intro" && (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(30, 41, 38, 0.95) 0%, rgba(18, 26, 29, 0.95) 100%)",
              border: "1px solid rgba(218, 119, 86, 0.35)",
              padding: "28px",
            }}
          >
            <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className="chip chip-active" style={{ fontSize: 11, background: "var(--jade)", color: "#fff" }}>
                    🎯 Khảo Sát Năng Lực Đầu Vào
                  </span>
                  <span className="chip" style={{ fontSize: 11 }}>
                    Reading & Listening Test
                  </span>
                </div>
                <h2 style={{ fontSize: 24, fontWeight: 700, margin: "4px 0 10px", color: "var(--text-bright)" }}>
                  Bài Đánh Giá Trình Độ Đầu Vào IELTS Chuẩn Hóa
                </h2>
                <p style={{ fontSize: 14, color: "var(--text-soft)", maxWidth: 640, lineHeight: 1.6 }}>
                  Bài kiểm tra cô đọng gồm <strong>18 câu hỏi chuẩn Cambridge</strong> giúp xác định chính xác trình độ IELTS hiện tại (Band 3.5 – 8.5), phân tích điểm mạnh, điểm yếu và tự động đề xuất lộ trình học phù hợp nhất cho bạn.
                </p>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 8, minWidth: 200 }}>
                <button
                  className="btn-primary"
                  onClick={handleStartTest}
                  disabled={loading}
                  style={{
                    padding: "12px 20px",
                    fontSize: 15,
                    fontWeight: 700,
                    boxShadow: "0 0 20px rgba(218, 119, 86, 0.4)",
                  }}
                >
                  {loading ? (
                    <Spinner label="Đang tạo đề thi AI..." />
                  ) : (
                    <>
                      <Sparkles size={18} /> Bắt đầu Test ngay
                    </>
                  )}
                </button>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, fontSize: 12, color: "var(--text-soft)" }}>
                  <Clock size={13} /> Thời gian: ~20–25 phút
                </div>
              </div>
            </div>

            {/* Test structure cards */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14, marginTop: 24 }}>
              <div style={{ background: "var(--ink-2)", padding: "14px", borderRadius: 8, border: "1px solid var(--border-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--jade-light)" }}>
                  <BookOpenCheck size={16} /> <strong>Phần 1: Reading (10 câu)</strong>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: 0 }}>
                  1 bài đọc học thuật đa cấp độ. Dạng câu hỏi: True/False/Not Given, MCQ, Điền từ tóm tắt.
                </p>
              </div>

              <div style={{ background: "var(--ink-2)", padding: "14px", borderRadius: 8, border: "1px solid var(--border-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "var(--amber)" }}>
                  <Headphones size={16} /> <strong>Phần 2: Listening (8 câu)</strong>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: 0 }}>
                  2 đoạn hội thoại & bài giảng học thuật. Dạng câu hỏi: Form Completion & Multiple Choice.
                </p>
              </div>

              <div style={{ background: "var(--ink-2)", padding: "14px", borderRadius: 8, border: "1px solid var(--border-soft)" }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, color: "#818cf8" }}>
                  <TrendingUp size={16} /> <strong>Phần 3: Lộ trình & Nhận +100 XP</strong>
                </div>
                <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: 0 }}>
                  Nhận báo cáo phân tích chi tiết kỹ năng, CEFR, Estimated Band và mở khóa lộ trình học.
                </p>
              </div>
            </div>
          </div>

          {/* Past Diagnostic History */}
          <div className="card">
            <h3 className="section-title">
              <Compass size={16} style={{ display: "inline", marginRight: 6, color: "var(--jade)" }} />
              Lịch sử các lần Test Đầu Vào
            </h3>
            {history.length === 0 ? (
              <EmptyState text="Bạn chưa thực hiện bài test đầu vào nào. Bấm nút 'Bắt đầu Test ngay' để kiểm tra trình độ!" />
            ) : (
              <div className="history-list">
                {history.map((h, i) => (
                  <div
                    key={h.id || i}
                    className="history-item"
                    style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px" }}
                  >
                    <div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                        <span style={{ fontWeight: 700, fontSize: 15, color: "var(--text-bright)" }}>
                          IELTS Estimated Band: <span style={{ color: "var(--amber)" }}>{h.estimated_band}</span>
                        </span>
                        <span className="chip" style={{ fontSize: 11 }}>
                          {h.cefr_level || "B2"}
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: "var(--text-soft)", marginTop: 4 }}>
                        Reading: {h.reading_score}/{h.reading_total || 10} (Band {h.reading_band}) · Listening: {h.listening_score}/{h.listening_total || 8} (Band {h.listening_band})
                      </div>
                    </div>
                    <span className="small-note">{fmtDate(h.created_at)}</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── STEP 1: READING TEST ─── */}
      {step === "reading" && testData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header Bar */}
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 20px",
              background: "var(--ink-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <span className="chip chip-active" style={{ fontSize: 12, background: "var(--jade)" }}>
                PHẦN 1: READING
              </span>
              <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Tiến độ: <strong style={{ color: "var(--amber)" }}>{rAnsweredCount}/10</strong> câu
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "IBM Plex Mono", fontSize: 14, color: timeLeft < 300 ? "var(--coral)" : "var(--amber)" }}>
                <Clock size={16} /> {formatTime(timeLeft)}
              </div>
              <button
                className="btn-primary"
                onClick={() => setStep("listening")}
                style={{ padding: "8px 16px", fontSize: 13 }}
              >
                Tiếp tục sang Listening <ArrowRight size={14} />
              </button>
            </div>
          </div>

          {/* Reading Split Pane */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18, alignItems: "start" }}>
            {/* Left: Passage */}
            <div
              className="card"
              style={{
                maxHeight: "75vh",
                overflowY: "auto",
                position: "sticky",
                top: 20,
              }}
            >
              <h3 style={{ fontSize: 18, fontWeight: 700, margin: "0 0 12px", color: "var(--jade-light)" }}>
                {testData.reading.title}
              </h3>
              <div style={{ fontSize: 13.5, lineHeight: 1.75, color: "var(--text-bright)", whiteSpace: "pre-line" }}>
                {testData.reading.passage}
              </div>
            </div>

            {/* Right: Questions */}
            <div style={{ display: "flex", flexDirection: "column", gap: 16, maxHeight: "75vh", overflowY: "auto" }}>
              {(testData.reading.sections || []).map((sec, si) => (
                <div key={si} className="card" style={{ padding: "16px" }}>
                  <div className="ielts-section-instruction">
                    {sec.instruction}
                  </div>

                  {(sec.questions || []).map((q) => (
                    <div
                      key={q.id}
                      style={{
                        marginBottom: 14,
                        padding: "12px",
                        borderRadius: 8,
                        background: "var(--ink-3)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      <p style={{ fontWeight: 600, fontSize: 13.5, margin: "0 0 10px" }}>
                        <span style={{ color: "var(--jade-light)", marginRight: 6 }}>Câu {q.id}.</span>
                        {q.question}
                      </p>

                      {/* Multiple choice / TFNG options */}
                      {q.options && q.options.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                cursor: "pointer",
                                padding: "6px 10px",
                                borderRadius: 6,
                                background: readingAnswers[q.id] === opt ? "rgba(218, 119, 86,0.2)" : "transparent",
                                border: readingAnswers[q.id] === opt ? "1px solid var(--jade)" : "1px solid transparent",
                              }}
                            >
                              <input
                                type="radio"
                                name={`diag_r_q_${q.id}`}
                                value={opt}
                                checked={readingAnswers[q.id] === opt}
                                onChange={() => setReadingAnswers((p) => ({ ...p, [q.id]: opt }))}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Short Answer / Gap fill */}
                      {(!q.options || q.options.length === 0) && (
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Điền từ (tối đa 2 từ)..."
                          value={readingAnswers[q.id] || ""}
                          onChange={(e) => setReadingAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                          style={{ fontSize: 13, marginTop: 4 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ─── STEP 2: LISTENING TEST ─── */}
      {step === "listening" && testData && (
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Header Bar */}
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 20px",
              background: "var(--ink-2)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="btn-ghost"
                onClick={() => setStep("reading")}
                style={{ padding: "6px 12px", fontSize: 12 }}
              >
                <ArrowLeft size={14} /> Quay lại Reading
              </button>
              <span className="chip chip-active" style={{ fontSize: 12, background: "var(--amber)", color: "#111" }}>
                PHẦN 2: LISTENING
              </span>
              <span style={{ fontSize: 13, color: "var(--text-soft)" }}>
                Tiến độ: <strong style={{ color: "var(--jade-light)" }}>{lAnsweredCount}/8</strong> câu
              </span>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 6, fontFamily: "IBM Plex Mono", fontSize: 14, color: "var(--amber)" }}>
                <Clock size={16} /> {formatTime(timeLeft)}
              </div>
              <button
                className="btn-primary"
                onClick={handleEvaluate}
                disabled={evaluating}
                style={{
                  padding: "8px 20px",
                  fontSize: 13,
                  fontWeight: 700,
                  boxShadow: "0 0 16px rgba(218, 119, 86,0.3)",
                }}
              >
                {evaluating ? (
                  <Spinner label="AI đang chấm điểm..." />
                ) : (
                  <>
                    <ShieldCheck size={16} /> Nộp bài & Xem Đánh Giá
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Audio Player Bar */}
          <div
            className="card"
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              flexWrap: "wrap",
              gap: 14,
              border: "1px solid rgba(201, 163, 90,0.3)",
              background: "linear-gradient(135deg, rgba(30, 26, 18, 0.9) 0%, rgba(20, 20, 24, 0.95) 100%)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <button
                className="btn-primary"
                onClick={handlePlayAudio}
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: "50%",
                  padding: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  background: isPlaying ? "var(--coral)" : "var(--amber)",
                  color: "#111",
                }}
              >
                <Volume2 size={20} />
              </button>
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: "var(--text-bright)" }}>
                  {isPlaying ? "Đang phát audio bài nghe..." : "Bấm để nghe audio hội thoại & bài giảng"}
                </div>
                <div style={{ fontSize: 12, color: "var(--text-soft)" }}>
                  Giọng bản ngữ chuẩn IELTS · Có thể nghe lại hoặc chỉnh tốc độ
                </div>
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 12, color: "var(--text-soft)" }}>Tốc độ:</span>
              {[0.8, 1.0, 1.2].map((r) => (
                <button
                  key={r}
                  className={`chip ${audioRate === r ? "chip-active" : ""}`}
                  onClick={() => setAudioRate(r)}
                  style={{ fontSize: 11, padding: "4px 8px" }}
                >
                  {r}x
                </button>
              ))}
            </div>
          </div>

          {/* Questions list */}
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {(testData.listening.sections || []).map((sec, si) => (
              <div key={si} className="card" style={{ padding: "18px" }}>
                <div className="ielts-section-instruction">
                  {sec.instruction}
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 12 }}>
                  {(sec.questions || []).map((q) => (
                    <div
                      key={q.id}
                      style={{
                        padding: "12px",
                        borderRadius: 8,
                        background: "var(--ink-3)",
                        border: "1px solid var(--border-soft)",
                      }}
                    >
                      <p style={{ fontWeight: 600, fontSize: 13.5, margin: "0 0 10px" }}>
                        <span style={{ color: "var(--amber)", marginRight: 6 }}>Câu {q.id}.</span>
                        {q.question}
                      </p>

                      {/* Multiple choice */}
                      {q.options && q.options.length > 0 && (
                        <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                          {q.options.map((opt) => (
                            <label
                              key={opt}
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                                fontSize: 13,
                                cursor: "pointer",
                                padding: "6px 10px",
                                borderRadius: 6,
                                background: listeningAnswers[q.id] === opt ? "rgba(201, 163, 90,0.15)" : "transparent",
                                border: listeningAnswers[q.id] === opt ? "1px solid var(--amber)" : "1px solid transparent",
                              }}
                            >
                              <input
                                type="radio"
                                name={`diag_l_q_${q.id}`}
                                value={opt}
                                checked={listeningAnswers[q.id] === opt}
                                onChange={() => setListeningAnswers((p) => ({ ...p, [q.id]: opt }))}
                              />
                              {opt}
                            </label>
                          ))}
                        </div>
                      )}

                      {/* Short Answer */}
                      {(!q.options || q.options.length === 0) && (
                        <input
                          type="text"
                          className="input-field"
                          placeholder="Điền từ hoặc số..."
                          value={listeningAnswers[q.id] || ""}
                          onChange={(e) => setListeningAnswers((p) => ({ ...p, [q.id]: e.target.value }))}
                          style={{ fontSize: 13, marginTop: 4 }}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ─── STEP 3: COMPREHENSIVE DIAGNOSTIC REPORT ─── */}
      {step === "report" && evalResult && (
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          {/* Main Hero Card */}
          <div
            className="card"
            style={{
              background: "linear-gradient(135deg, rgba(26, 40, 36, 0.95) 0%, rgba(18, 22, 27, 0.95) 100%)",
              border: "1px solid rgba(218, 119, 86, 0.4)",
              padding: "24px",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 16 }}>
              <div>
                <span className="chip chip-active" style={{ fontSize: 11, background: "var(--jade)" }}>
                  🎉 Báo Cáo Khảo Sát Năng Lực Đầu Vào
                </span>
                <h2 style={{ fontSize: 26, fontWeight: 700, margin: "8px 0 4px", color: "var(--text-bright)" }}>
                  Đánh Giá Trình Độ & Lộ Trình Cá Nhân Hóa
                </h2>
                <p style={{ fontSize: 13.5, color: "var(--text-soft)", margin: 0 }}>
                  {evalResult.summary_feedback}
                </p>
              </div>

              <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                <div style={{ textAlign: "center", background: "var(--ink-3)", padding: "12px 18px", borderRadius: 10, border: "1px solid var(--border-soft)" }}>
                  <div style={{ fontSize: 11, color: "var(--text-soft)", textTransform: "uppercase" }}>IELTS Estimated</div>
                  <div style={{ fontFamily: "IBM Plex Mono", fontSize: 32, fontWeight: 800, color: "var(--amber)" }}>
                    {evalResult.estimated_band}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--jade-light)", fontWeight: 600 }}>
                    CEFR: {evalResult.cefr_level}
                  </div>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                  <div className="chip" style={{ fontSize: 12, padding: "4px 10px" }}>
                    📖 Reading: <strong>Band {evalResult.reading_band}</strong> ({evalResult.reading_score}/{evalResult.reading_total})
                  </div>
                  <div className="chip" style={{ fontSize: 12, padding: "4px 10px" }}>
                    🎧 Listening: <strong>Band {evalResult.listening_band}</strong> ({evalResult.listening_score}/{evalResult.listening_total})
                  </div>
                </div>
              </div>
            </div>

            {/* Profile sync button */}
            <div style={{ marginTop: 20, paddingTop: 16, borderTop: "1px solid var(--border-soft)", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
              <div style={{ fontSize: 13, color: "var(--text-soft)" }}>
                {applied
                  ? "✓ Đã áp dụng mục tiêu Band vào hồ sơ học tập và cộng điểm thành công!"
                  : "💡 Bấm nút dưới đây để thiết lập mục tiêu học tập và nhận ngay +100 XP khởi đầu."}
              </div>
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  className="btn-primary"
                  onClick={handleApplyProfile}
                  disabled={applied}
                  style={{
                    padding: "8px 16px",
                    fontSize: 13,
                    fontWeight: 700,
                    background: applied ? "var(--ink-3)" : "var(--jade)",
                    color: applied ? "var(--text-soft)" : "#fff",
                  }}
                >
                  {applied ? (
                    <>
                      <Check size={15} /> Đã cập nhật hồ sơ
                    </>
                  ) : (
                    <>
                      <Award size={15} /> Cập nhật hồ sơ (+100 XP)
                    </>
                  )}
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => setStep("intro")}
                  style={{ padding: "8px 14px", fontSize: 13 }}
                >
                  <RotateCcw size={14} /> Về trang Test
                </button>
              </div>
            </div>
          </div>

          {/* Strengths & Weaknesses 2-Column Grid */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: 16 }}>
            {/* Strengths */}
            <div className="card" style={{ borderLeft: "4px solid var(--jade)" }}>
              <h3 className="section-title" style={{ color: "var(--jade-light)" }}>
                <CheckCircle2 size={16} style={{ display: "inline", marginRight: 6 }} />
                Điểm mạnh nổi bật (Strengths)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(evalResult.strengths || []).map((st, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-bright)" }}>
                    <span style={{ color: "var(--jade)", fontSize: 14 }}>✓</span>
                    <span>{st}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Weaknesses */}
            <div className="card" style={{ borderLeft: "4px solid var(--coral)" }}>
              <h3 className="section-title" style={{ color: "var(--coral)" }}>
                <AlertCircle size={16} style={{ display: "inline", marginRight: 6 }} />
                Điểm cần khắc phục (Weaknesses)
              </h3>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {(evalResult.weaknesses || []).map((wk, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "flex-start", gap: 8, fontSize: 13, color: "var(--text-bright)" }}>
                    <span style={{ color: "var(--coral)", fontSize: 14 }}>!</span>
                    <span>{wk}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Personalized Study Roadmap */}
          <div className="card">
            <h3 className="section-title">
              <Compass size={16} style={{ display: "inline", marginRight: 6, color: "var(--amber)" }} />
              Lộ Trình Học Cá Nhân Hóa Đề Xuất (Personalized Study Roadmap)
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 14, marginTop: 12 }}>
              {(evalResult.study_roadmap || []).map((rm, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--ink-2)",
                    padding: "16px",
                    borderRadius: 8,
                    border: "1px solid var(--border-soft)",
                    position: "relative",
                  }}
                >
                  <div
                    style={{
                      position: "absolute",
                      top: 12,
                      right: 12,
                      width: 24,
                      height: 24,
                      borderRadius: "50%",
                      background: "var(--ink-3)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontFamily: "IBM Plex Mono",
                      fontSize: 12,
                      fontWeight: 700,
                      color: "var(--amber)",
                    }}
                  >
                    {rm.step || i + 1}
                  </div>
                  <span className="chip" style={{ fontSize: 10, padding: "2px 6px", marginBottom: 6, color: "var(--jade-light)" }}>
                    {rm.target_skill || "Kỹ năng"}
                  </span>
                  <h4 style={{ fontSize: 14, fontWeight: 700, margin: "4px 0 6px", color: "var(--text-bright)" }}>
                    {rm.title}
                  </h4>
                  <p style={{ fontSize: 12.5, color: "var(--text-soft)", margin: 0, lineHeight: 1.5 }}>
                    {rm.action}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Detailed Question Review */}
          <div className="card">
            <h3 className="section-title">
              <Layers size={16} style={{ display: "inline", marginRight: 6, color: "var(--jade)" }} />
              Xem Lại Chi Tiết Từng Câu Hỏi
            </h3>

            {/* Reading Details */}
            <h4 style={{ fontSize: 14, color: "var(--jade-light)", margin: "14px 0 10px" }}>
              📖 Phần 1: Reading ({evalResult.reading_score}/{evalResult.reading_total})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(evalResult.reading_details || []).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "var(--ink-3)",
                    borderLeft: `3px solid ${d.isCorrect ? "var(--jade)" : "var(--coral)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Câu {d.id}</span>
                    <span style={{ fontSize: 12, color: d.isCorrect ? "var(--jade-light)" : "var(--coral)", fontWeight: 600 }}>
                      {d.isCorrect ? "✓ Chính xác" : `✗ Bạn chọn: ${d.userAnswer} — Đáp án đúng: ${d.correctAnswer}`}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "4px 0 0" }}>{d.explanation}</p>
                </div>
              ))}
            </div>

            {/* Listening Details */}
            <h4 style={{ fontSize: 14, color: "var(--amber)", margin: "20px 0 10px" }}>
              🎧 Phần 2: Listening ({evalResult.listening_score}/{evalResult.listening_total})
            </h4>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {(evalResult.listening_details || []).map((d) => (
                <div
                  key={d.id}
                  style={{
                    padding: "10px 14px",
                    borderRadius: 6,
                    background: "var(--ink-3)",
                    borderLeft: `3px solid ${d.isCorrect ? "var(--jade)" : "var(--coral)"}`,
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <span style={{ fontSize: 13, fontWeight: 600 }}>Câu {d.id}</span>
                    <span style={{ fontSize: 12, color: d.isCorrect ? "var(--jade-light)" : "var(--coral)", fontWeight: 600 }}>
                      {d.isCorrect ? "✓ Chính xác" : `✗ Bạn chọn: ${d.userAnswer} — Đáp án đúng: ${d.correctAnswer}`}
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: "var(--text-soft)", margin: "4px 0 0" }}>{d.explanation}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
