"use client";
/* eslint-disable react-hooks/set-state-in-effect, react-hooks/exhaustive-deps, react-hooks/purity, react-hooks/immutability */
import { useState, useEffect } from "react";
import { Sparkles, Volume2, Clock, CheckCircle2, XCircle, BookmarkPlus, Layers, Flag } from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { speak, fmtDate, rawToBand } from "@/lib/utils";

export function ListeningPanel({ history, setHistory, supabase, userId, setVocabList, onActivityDone }) {
  const [topic, setTopic] = useState("");
  const [testData, setTestData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [genLoading, setGenLoading] = useState(false);
  const [gradedResult, setGradedResult] = useState(null);
  const [showTranscript, setShowTranscript] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [timeLeft, setTimeLeft] = useState(1800); // 30m
  const [isTimerRunning, setIsTimerRunning] = useState(false);

  // 1-Click Vocab
  const [selectedText, setSelectedText] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);
  const [vocabToast, setVocabToast] = useState(null);

  // Restore ongoing test session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ielts_listening_active_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.testData && !parsed?.gradedResult) {
          setTestData(parsed.testData);
          setUserAnswers(parsed.userAnswers || {});
          setFlagged(parsed.flagged || {});
          setTimeLeft(parsed.timeLeft || 1800);
          setSpeed(parsed.speed || 1);
          setIsTimerRunning(true);
        }
      }
    } catch (e) {
      console.error("Failed to restore listening session", e);
    }
  }, []);

  // Auto-save active listening session to localStorage
  useEffect(() => {
    if (testData && !gradedResult) {
      try {
        localStorage.setItem(
          "ielts_listening_active_session",
          JSON.stringify({
            testData,
            userAnswers,
            flagged,
            timeLeft,
            speed,
          })
        );
      } catch (e) {}
    }
  }, [testData, userAnswers, flagged, timeLeft, speed, gradedResult]);

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
    try {
      localStorage.removeItem("ielts_listening_active_session");
    } catch (e) {}

    setGenLoading(true);
    setGradedResult(null);
    setUserAnswers({});
    setFlagged({});
    setTestData(null);
    setShowTranscript(false);
    setTimeLeft(1800);


    try {
      const res = await fetch("/api/ai/listening", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", topic }),
      });
      const data = await res.json();
      if (data.transcript) {
        setTestData(data);
        setIsTimerRunning(true);
      } else {
        alert("Không tạo được bài Listening, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối server.");
    }
    setGenLoading(false);
  }

  function handleMouseUpTranscript() {
    const sel = window.getSelection();
    const txt = sel ? sel.toString().trim() : "";
    if (txt && txt.length > 2 && txt.length < 50) {
      setSelectedText(txt);
    } else {
      setSelectedText("");
    }
  }

  async function handleSaveSelectedVocab() {
    if (!selectedText) return;
    setExtractLoading(true);
    try {
      const res = await fetch("/api/ai/vocab-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: selectedText, contextSentence: testData?.transcript?.slice(0, 300) }),
      });
      const data = await res.json();
      if (data.word) {
        const newVocab = {
          user_id: userId,
          word: data.word,
          pos: data.pos || "Danh từ",
          definition_en: data.definition_en || "",
          example_en: data.example_en || "",
          synonyms: data.synonyms || [],
          status: "passive",
          ease_factor: 2.5,
          interval_days: 1,
          repetitions: 0,
        };

        if (supabase) {
          const { data: inserted } = await supabase.from("vocabulary").insert(newVocab).select().single();
          if (inserted && setVocabList) {
            setVocabList((prev) => [inserted, ...prev]);
          }
        }
        setVocabToast(`Đã lưu "${data.word}" (${data.pos}) vào kho từ vựng SM-2!`);
        setTimeout(() => setVocabToast(null), 4000);
        setSelectedText("");
      }
    } catch (e) {
      console.error(e);
    }
    setExtractLoading(false);
  }

  async function handleGrade() {
    if (!testData) return;
    setIsTimerRunning(false);
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

      const band = rawToBand(data.score, data.total);

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

      if (supabase) {
        const { data: inserted, error } = await supabase
          .from("listening_tests")
          .insert(record)
          .select()
          .single();

        if (!error && inserted) {
          setHistory((prev) => [{ ...inserted, band }, ...prev]);
        }
      }
      // Fire gamification
      if (onActivityDone) onActivityDone("listening");
      try {
        localStorage.removeItem("ielts_listening_active_session");
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <input
          className="input-field"
          placeholder="Chủ đề bài nghe (vd: Travel Booking, Campus Orientation, Academic Lecture...)"
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

      {vocabToast && (
        <div style={{ padding: "10px 16px", background: "var(--jade)", color: "#000", fontWeight: "600", borderRadius: "8px", marginBottom: "16px" }}>
          ✓ {vocabToast}
        </div>
      )}

      {testData && (
        <div className="card">
          {/* Audio Player & Controls */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "16px", flexWrap: "wrap", gap: "10px", background: "var(--ink-2)", padding: "12px 16px", borderRadius: "8px" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
              <span className="chip" style={{ fontSize: "12px" }}>
                {testData.accent === "en-GB" ? "🇬🇧 British Accent" : 
                 testData.accent === "en-AU" ? "🇦🇺 Australian Accent" : 
                 testData.accent === "en-US" ? "🇺🇸 American Accent" : "🌎 Global Accent"}
              </span>
              <span className="chip chip-active" style={{ fontSize: "12px" }}>
                <Clock size={12} /> {formatTimer(timeLeft)}
              </span>
            </div>

            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <select className="select-field" value={speed} onChange={(e) => setSpeed(parseFloat(e.target.value))} style={{ padding: "4px 8px", width: "auto" }}>
                <option value={0.8}>0.8x (Chậm)</option>
                <option value={1}>1.0x (Chuẩn)</option>
                <option value={1.2}>1.2x (Nhanh)</option>
              </select>
              <button className="btn-primary" onClick={() => speak(testData.transcript, speed, testData.accent)}>
                <Volume2 size={16} /> Phát Audio bài nghe
              </button>
            </div>
          </div>

          {/* Transcript (Show after grading or on toggle) */}
          {showTranscript && (
            <div 
              onMouseUp={handleMouseUpTranscript}
              style={{ background: "var(--ink-2)", padding: "16px", borderRadius: "8px", marginBottom: "16px", borderLeft: "3px solid var(--amber)", userSelect: "text" }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <p style={{ fontWeight: "700", fontSize: "13px", color: "var(--amber)", margin: 0 }}>TRANSCRIPT BÀI NGHE (Bôi đen từ để trích xuất từ vựng):</p>
                {selectedText && (
                  <button
                    className="btn-ghost"
                    style={{ borderColor: "var(--jade-light)", color: "var(--jade-light)", fontSize: "12px", padding: "4px 10px" }}
                    onClick={handleSaveSelectedVocab}
                    disabled={extractLoading}
                  >
                    <BookmarkPlus size={13} /> Lưu từ &quot;{selectedText}&quot;
                  </button>
                )}
              </div>
              <p style={{ fontSize: "14px", lineHeight: "1.8", margin: 0 }}>{testData.transcript}</p>
            </div>
          )}

          {/* Question Palette */}
          <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "16px" }}>
            <Layers size={15} color="var(--amber)" />
            <strong style={{ fontSize: "12px" }}>Chuyển câu:</strong>
            <div style={{ display: "flex", gap: "6px" }}>
              {testData.questions.map((q, idx) => (
                <button
                  key={q.id}
                  onClick={() => {
                    const el = document.getElementById(`l_q_block_${q.id}`);
                    if (el) el.scrollIntoView({ behavior: "smooth" });
                  }}
                  style={{
                    width: "26px",
                    height: "26px",
                    borderRadius: "4px",
                    fontSize: "11px",
                    fontWeight: "600",
                    border: flagged[q.id] ? "2px solid var(--amber)" : "1px solid var(--border-soft)",
                    background: userAnswers[q.id] ? "var(--jade-light)" : "var(--ink-3)",
                    color: userAnswers[q.id] ? "#000" : "var(--text-main)",
                    cursor: "pointer",
                  }}
                >
                  {idx + 1}
                </button>
              ))}
            </div>
          </div>

          <h4 style={{ margin: "16px 0 10px", fontSize: "14px", color: "var(--amber)" }}>
            Câu hỏi bài nghe — {testData.questions.length} câu
          </h4>

          {/* Section-based rendering */}
          {(testData.sections || []).map((section, si) => (
            <div key={si} style={{ marginBottom: 24 }}>
              <div className="ielts-section-instruction">
                {section.instruction}
              </div>
              {section.context && (
                <div style={{ padding: "8px 12px", background: "var(--ink-3)", borderRadius: 6, marginBottom: 10, fontSize: 12, color: "var(--text-soft)", fontStyle: "italic" }}>
                  {section.context}
                </div>
              )}
              {(section.questions || []).map((q, idx) => {
                const globalIdx = testData.questions.findIndex(x => x.id === q.id);
                return (
                  <div key={q.id} id={`l_q_block_${q.id}`} style={{ marginBottom: "14px", padding: "12px", borderRadius: "8px", background: "var(--ink-2)", border: "1px solid var(--border-soft)" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <p style={{ fontWeight: "600", fontSize: "13.5px", margin: 0 }}>
                        <span style={{ color: "var(--amber)", marginRight: "6px" }}>{q.id}.</span> {q.question}
                      </p>
                      <button
                        onClick={() => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                        style={{ background: "none", border: "none", cursor: "pointer", color: flagged[q.id] ? "var(--amber)" : "var(--text-soft)" }}
                      >
                        <Flag size={13} />
                      </button>
                    </div>

                    {/* MCQ options */}
                    {q.options && q.options.length > 0 && (
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px", marginTop: "10px" }}>
                        {q.options.map((opt) => (
                          <label
                            key={opt}
                            style={{
                              display: "flex", alignItems: "center", gap: "8px",
                              fontSize: "13px", cursor: "pointer",
                              padding: "6px 10px", borderRadius: "6px",
                              background: userAnswers[q.id] === opt ? "var(--ink-3)" : "transparent",
                              border: userAnswers[q.id] === opt ? "1px solid var(--amber)" : "1px solid transparent"
                            }}
                          >
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
                    )}

                    {/* Form completion (short answer) */}
                    {(!q.options || q.options.length === 0) && (
                      <input
                        type="text"
                        className="input-field"
                        style={{ marginTop: 8, fontSize: 13 }}
                        placeholder="Điền câu trả lời (tối đa 2 từ/số)..."
                        value={userAnswers[q.id] || ""}
                        onChange={(e) => setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                        disabled={!!gradedResult}
                      />
                    )}

                    {gradedResult && (
                      <div className="ai-feedback" style={{ marginTop: "8px" }}>
                        {gradedResult.details[globalIdx]?.isCorrect ? (
                          <p style={{ color: "var(--jade-light)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", margin: 0 }}>
                            <CheckCircle2 size={14} /> Chính xác!
                          </p>
                        ) : (
                          <p style={{ color: "var(--coral)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", margin: 0 }}>
                            <XCircle size={14} /> Sai. Đáp án: <strong>{q.answer}</strong>
                          </p>
                        )}
                        <p style={{ fontSize: "12px", marginTop: "4px", color: "var(--text-soft)" }}>{q.explanation}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}

          {!gradedResult ? (
            <button className="btn-primary" onClick={handleGrade} style={{ width: "100%", justifyContent: "center", marginTop: "10px", padding: "12px" }}>
              <CheckCircle2 size={16} /> Nộp bài & Xem Band điểm IELTS
            </button>
          ) : (
            <div style={{ textAlign: "center", padding: "16px", background: "var(--ink)", borderRadius: "8px", marginTop: "12px", border: "1px solid var(--amber)" }}>
              <h4 style={{ color: "var(--amber)", margin: "0 0 6px 0", fontSize: "16px" }}>
                Kết quả: {gradedResult.score} / {gradedResult.total} câu đúng
              </h4>
              <div style={{ display: "inline-block", padding: "4px 12px", background: "var(--jade)", color: "#000", fontWeight: "700", borderRadius: "20px", fontSize: "14px", marginBottom: "10px" }}>
                Estimated Band: {rawToBand(gradedResult.score, gradedResult.total)}
              </div>
              <div>
                {!showTranscript && (
                  <button className="btn-ghost" onClick={() => setShowTranscript(true)} style={{ marginTop: "4px" }}>
                    Xem Transcript & Trích xuất từ vựng
                  </button>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h3 className="section-title">Lịch sử làm bài Listening</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có bài kiểm tra Listening nào." />
        ) : (
          <div className="history-list">
            {history.map((h) => (
              <div key={h.id} className="history-item">
                <div>
                  <strong>{h.audio_topic}</strong> · Đúng: {h.score}/{h.total_questions}
                  <span className="chip" style={{ marginLeft: "10px", fontSize: "11px" }}>
                    Band {h.band || rawToBand(h.score, h.total_questions)}
                  </span>
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

