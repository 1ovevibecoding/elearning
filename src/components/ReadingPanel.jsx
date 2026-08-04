"use client";

import { useState, useEffect } from "react";
import { Sparkles, Clock, CheckCircle2, XCircle, RotateCcw } from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { fmtDate } from "@/lib/utils";

export function ReadingPanel({ history, setHistory, supabase, userId }) {
  const [topic, setTopic] = useState("");
  const [testData, setTestData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [genLoading, setGenLoading] = useState(false);
  const [gradedResult, setGradedResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(2400); // 40 mins timer for full test
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState("");

  useEffect(() => {
    let timer;
    if (isTimerRunning && timeLeft > 0) {
      timer = setInterval(() => setTimeLeft((prev) => prev - 1), 1000);
    } else if (timeLeft === 0 && isTimerRunning) {
      setIsTimerRunning(false);
      handleGrade();
    }
    return () => clearInterval(timer);
  }, [isTimerRunning, timeLeft]);

  const formatTimer = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
  };

  async function handleGenerateTest() {
    setGenLoading(true);
    setGradedResult(null);
    setUserAnswers({});
    setTestData(null);
    setNotes("");
    try {
      const res = await fetch("/api/ai/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", topic }),
      });
      const data = await res.json();
      if (data.passage) {
        setTestData(data);
        setTimeLeft(2400);
        setIsTimerRunning(true);
      } else {
        alert("Không tạo được bài đọc, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối server.");
    }
    setGenLoading(false);
  }

  // Simple Highlighter using Selection API
  function handleHighlight() {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("mark");
    span.style.backgroundColor = "rgba(214, 169, 75, 0.4)"; // amber tint
    span.style.color = "inherit";
    span.style.borderRadius = "2px";
    range.surroundContents(span);
    selection.removeAllRanges();
  }

  async function handleGrade() {
    if (!testData) return;
    setIsTimerRunning(false);
    try {
      const answersArr = testData.questions.map((q) => userAnswers[q.id] || "");
      const res = await fetch("/api/ai/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "grade",
          questions: testData.questions,
          userAnswers: answersArr,
        }),
      });
      const data = await res.json();
      setGradedResult(data);

      // Save attempt to Supabase
      const record = {
        user_id: userId,
        passage_title: testData.title,
        passage_text: testData.passage,
        questions: testData.questions,
        user_answers: userAnswers,
        score: data.score,
        total_questions: data.total,
        time_spent_seconds: 1200 - timeLeft,
      };

      const { data: inserted, error } = await supabase
        .from("reading_tests")
        .insert(record)
        .select()
        .single();

      if (!error && inserted) {
        setHistory((prev) => [inserted, ...prev]);
      }
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <input
          className="input-field"
          placeholder="Chủ đề bài đọc (vd: Climate Change, Artificial Intelligence...)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          className="btn-primary"
          disabled={genLoading}
          onClick={handleGenerateTest}
        >
          {genLoading ? <Spinner label="AI đang tạo bài đọc..." /> : <><Sparkles size={15} /> Tạo đề Reading mới</>}
        </button>
      </div>

      {testData && (
        <div className="reading-split-view" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          {/* Passage Column */}
          <div className="card" style={{ maxHeight: "650px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "10px" }}>
              <h3 className="section-title" style={{ margin: 0 }}>{testData.title}</h3>
              <div style={{ display: "flex", gap: "10px" }}>
                <button className="btn-ghost" style={{ padding: "4px 8px", fontSize: "12px", borderColor: "var(--amber)", color: "var(--amber)" }} onClick={handleHighlight}>
                  <Sparkles size={12} /> Highlight (Tô vàng)
                </button>
                <span className="chip chip-active" style={{ display: "flex", alignItems: "center", gap: "4px" }}>
                  <Clock size={14} /> {formatTimer(timeLeft)}
                </span>
              </div>
            </div>
            
            <div 
              className="shadow-script" 
              style={{ fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-line", flex: 1, padding: "10px", background: "var(--ink-2)", borderRadius: "6px" }}
              dangerouslySetInnerHTML={{ __html: testData.passage }}
            />
            
            <div style={{ marginTop: "16px" }}>
              <strong style={{ fontSize: "13px", color: "var(--text-soft)" }}>📝 Take Notes (Nháp)</strong>
              <textarea
                className="textarea-field"
                rows={3}
                placeholder="Ghi chú keywords, từ vựng hoặc ý chính vào đây..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                style={{ marginTop: "8px", background: "var(--ink-3)" }}
              />
            </div>
          </div>

          {/* Question Column */}
          <div className="card" style={{ maxHeight: "650px", overflowY: "auto" }}>
            <h3 className="section-title">Câu hỏi (Questions)</h3>
            {testData.questions.map((q, idx) => (
              <div key={q.id} style={{ marginBottom: "16px", paddingBottom: "12px", borderBottom: "1px solid var(--border-soft)" }}>
                <p style={{ fontWeight: "600", fontSize: "13px" }}>Câu {idx + 1}: {q.question}</p>
                <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "8px" }}>
                  {q.options.map((opt) => (
                    <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                      <input
                        type="radio"
                        name={`q_${q.id}`}
                        value={opt}
                        checked={userAnswers[q.id] === opt}
                        onChange={() => setUserAnswers((prev) => ({ ...prev, [q.id]: opt }))}
                        disabled={!!gradedResult}
                      />
                      {opt}
                    </label>
                  ))}
                </div>

                {gradedResult && (
                  <div className="ai-feedback" style={{ marginTop: "8px" }}>
                    {gradedResult.details[idx].isCorrect ? (
                      <p style={{ color: "var(--jade-light)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <CheckCircle2 size={14} /> Chính xác!
                      </p>
                    ) : (
                      <p style={{ color: "var(--coral)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px" }}>
                        <XCircle size={14} /> Sai. Đáp án đúng: {q.answer}
                      </p>
                    )}
                    <p style={{ fontSize: "12px", marginTop: "4px" }}>{q.explanation}</p>
                  </div>
                )}
              </div>
            ))}

            {!gradedResult ? (
              <button className="btn-primary" onClick={handleGrade} style={{ width: "100%", justifyContent: "center" }}>
                Nộp bài & Chấm điểm
              </button>
            ) : (
              <div style={{ textAlign: "center", padding: "10px", background: "var(--ink)", borderRadius: "8px" }}>
                <h4 style={{ color: "var(--amber)", margin: 0 }}>Kết quả: {gradedResult.score} / {gradedResult.total} câu đúng</h4>
              </div>
            )}
          </div>
        </div>
      )}

      {/* History */}
      <div className="card">
        <h3 className="section-title">Lịch sử làm bài Reading</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có bài kiểm tra Reading nào." />
        ) : (
          <div className="history-list">
            {history.map((h) => (
              <div key={h.id} className="history-item">
                <div>
                  <strong>{h.passage_title}</strong> · Kết quả: {h.score}/{h.total_questions}
                </div>
                <span className="small-note">{fmtDate(h.created_at)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
