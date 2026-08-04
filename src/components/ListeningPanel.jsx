"use client";

import { useState, useEffect } from "react";
import { Sparkles, Volume2, Clock, CheckCircle2, XCircle } from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { speak, fmtDate } from "@/lib/utils";

export function ListeningPanel({ history, setHistory, supabase, userId }) {
  const [topic, setTopic] = useState("");
  const [testData, setTestData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [genLoading, setGenLoading] = useState(false);
  const [gradedResult, setGradedResult] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speed, setSpeed] = useState(1);

  async function handleGenerateTest() {
    setGenLoading(true);
    setGradedResult(null);
    setUserAnswers({});
    setTestData(null);
    setShowTranscript(false);
    try {
      const res = await fetch("/api/ai/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", topic }),
      });
      const data = await res.json();
      if (data.transcript) {
        setTestData(data);
      } else {
        alert("Không tạo được bài Listening, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối server.");
    }
    setGenLoading(false);
  }

  async function handleGrade() {
    if (!testData) return;
    try {
      const answersArr = testData.questions.map((q) => userAnswers[q.id] || "");
      const res = await fetch("/api/ai/listening", {
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
      setShowTranscript(true);

      // Save to Supabase
      const record = {
        user_id: userId,
        audio_topic: testData.topic || topic || "General",
        transcript: testData.transcript,
        questions: testData.questions,
        user_answers: userAnswers,
        score: data.score,
        total_questions: data.total,
      };

      const { data: inserted, error } = await supabase
        .from("listening_tests")
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
          placeholder="Chủ đề bài nghe (vd: Travel Booking, Campus Orientation...)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          className="btn-primary"
          disabled={genLoading}
          onClick={handleGenerateTest}
        >
          {genLoading ? <Spinner label="AI đang tạo bài nghe..." /> : <><Sparkles size={15} /> Tạo bài Listening mới</>}
        </button>
      </div>

      {testData && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px", flexWrap: "wrap", gap: "10px" }}>
            <h3 className="section-title" style={{ margin: 0 }}>Audio Player & Bài nghe</h3>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <span style={{ fontSize: "12px", color: "var(--text-soft)" }}>
                {testData.accent === "en-GB" ? "🇬🇧 British" : 
                 testData.accent === "en-AU" ? "🇦🇺 Australian" : 
                 testData.accent === "en-US" ? "🇺🇸 American" : "🌎 Global"}
              </span>
              <select className="select-field" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ padding: "4px 8px" }}>
                <option value={0.8}>Tốc độ 0.8x (Chậm)</option>
                <option value={1}>Tốc độ 1.0x (Chuẩn)</option>
                <option value={1.2}>Tốc độ 1.2x (Nhanh)</option>
              </select>
              <button className="btn-primary" onClick={() => speak(testData.transcript, speed, testData.accent)}>
                <Volume2 size={16} /> Phát Audio bài nghe
              </button>
            </div>
          </div>

          {showTranscript && (
            <div style={{ background: "var(--ink)", padding: "12px", borderRadius: "8px", marginBottom: "16px", borderLeft: "3px solid var(--amber)" }}>
              <p style={{ fontWeight: "600", fontSize: "12px", color: "var(--amber)", marginBottom: "4px" }}>TRANSCRIPT BÀI NGHE:</p>
              <p style={{ fontSize: "13px", lineHeight: "1.6" }}>{testData.transcript}</p>
            </div>
          )}

          <h4 style={{ margin: "16px 0 10px", fontSize: "14px" }}>Câu hỏi bài nghe (Questions)</h4>
          {testData.questions.map((q, idx) => (
            <div key={q.id} style={{ marginBottom: "14px", paddingBottom: "10px", borderBottom: "1px solid var(--border-soft)" }}>
              <p style={{ fontWeight: "600", fontSize: "13px" }}>Câu {idx + 1}: {q.question}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "6px" }}>
                {q.options.map((opt) => (
                  <label key={opt} style={{ display: "flex", alignItems: "center", gap: "8px", fontSize: "13px", cursor: "pointer" }}>
                    <input
                      type="radio"
                      name={`l_q_${q.id}`}
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
            <button className="btn-primary" onClick={handleGrade} style={{ width: "100%", justifyContent: "center", marginTop: "10px" }}>
              Nộp bài & Chấm điểm
            </button>
          ) : (
            <div style={{ textAlign: "center", padding: "10px", background: "var(--ink)", borderRadius: "8px", marginTop: "10px" }}>
              <h4 style={{ color: "var(--amber)", margin: 0 }}>Kết quả: {gradedResult.score} / {gradedResult.total} câu đúng</h4>
              {!showTranscript && (
                <button className="btn-ghost" onClick={() => setShowTranscript(true)} style={{ marginTop: "8px" }}>
                  Xem Transcript bài nghe
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="card">
        <h3 className="section-title">Lịch sử làm bài Listening</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có bài kiểm tra Listening nào." />
        ) : (
          <div className="history-list">
            {history.map((h) => (
              <div key={h.id} className="history-item">
                <div>
                  <strong>{h.audio_topic}</strong> · Kết quả: {h.score}/{h.total_questions}
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
