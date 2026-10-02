import { useState, useEffect, useRef } from "react";
import { Sparkles, Clock, CheckCircle2, XCircle, Flag, BookmarkPlus, BookOpen, Layers } from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { fmtDate, rawToBand } from "@/lib/utils";

export function ReadingPanel({ history, setHistory, supabase, userId, setVocabList, onActivityDone }) {
  const [topic, setTopic] = useState("");
  const [examMode, setExamMode] = useState("practice"); // 'mock_60' | 'practice' | 'untimed'
  const [testData, setTestData] = useState(null);
  const [userAnswers, setUserAnswers] = useState({});
  const [flagged, setFlagged] = useState({});
  const [genLoading, setGenLoading] = useState(false);
  const [gradedResult, setGradedResult] = useState(null);
  const [timeLeft, setTimeLeft] = useState(1200); // default 20m
  const [isTimerRunning, setIsTimerRunning] = useState(false);
  const [notes, setNotes] = useState("");
  
  // 1-Click Vocab Extraction State
  const [selectedText, setSelectedText] = useState("");
  const [extractLoading, setExtractLoading] = useState(false);
  const [vocabToast, setVocabToast] = useState(null);
  const passageRef = useRef(null);

  // Restore ongoing test session from localStorage on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem("ielts_reading_active_session");
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed?.testData && !parsed?.gradedResult) {
          setTestData(parsed.testData);
          setUserAnswers(parsed.userAnswers || {});
          setFlagged(parsed.flagged || {});
          setNotes(parsed.notes || "");
          setTimeLeft(parsed.timeLeft || 1200);
          setExamMode(parsed.examMode || "practice");
          if (parsed.examMode !== "untimed") setIsTimerRunning(true);
        }
      }
    } catch (e) {
      console.error("Failed to restore reading session", e);
    }
  }, []);

  // Auto-save active test session to localStorage
  useEffect(() => {
    if (testData && !gradedResult) {
      try {
        localStorage.setItem(
          "ielts_reading_active_session",
          JSON.stringify({
            testData,
            userAnswers,
            flagged,
            notes,
            timeLeft,
            examMode,
          })
        );
      } catch (e) {}
    }
  }, [testData, userAnswers, flagged, notes, timeLeft, examMode, gradedResult]);

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
      localStorage.removeItem("ielts_reading_active_session");
    } catch (e) {}

    setGenLoading(true);
    setGradedResult(null);
    setUserAnswers({});
    setFlagged({});
    setTestData(null);
    setNotes("");
    
    let time = 1200;
    if (examMode === "mock_60") time = 3600;
    else if (examMode === "untimed") time = 99999;
    setTimeLeft(time);


    try {
      const res = await fetch("/api/ai/reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", topic }),
      });
      const data = await res.json();
      if (data.passage) {
        setTestData(data);
        if (examMode !== "untimed") setIsTimerRunning(true);
      } else {
        alert("Không tạo được bài đọc, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối server.");
    }
    setGenLoading(false);
  }

  // Handle Text Selection for 1-Click Vocab
  function handleMouseUpPassage() {
    const sel = window.getSelection();
    const txt = sel ? sel.toString().trim() : "";
    if (txt && txt.length > 2 && txt.length < 50) {
      setSelectedText(txt);
    } else {
      setSelectedText("");
    }
  }

  // 1-Click Save Word to SRS
  async function handleSaveSelectedVocab() {
    if (!selectedText) return;
    setExtractLoading(true);
    try {
      const res = await fetch("/api/ai/vocab-extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: selectedText, contextSentence: testData?.passage?.slice(0, 300) }),
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

  // Simple Highlighter
  function handleHighlight() {
    const selection = window.getSelection();
    if (!selection.rangeCount || selection.isCollapsed) return;
    const range = selection.getRangeAt(0);
    const span = document.createElement("mark");
    span.style.backgroundColor = "rgba(201, 163, 90, 0.4)";
    span.style.color = "inherit";
    span.style.borderRadius = "3px";
    span.style.padding = "1px 3px";
    try {
      range.surroundContents(span);
    } catch (e) {}
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

      const band = rawToBand(data.score, data.total);

      // Save attempt to Supabase
      const record = {
        user_id: userId,
        passage_title: testData.title,
        passage_text: testData.passage,
        questions: testData.questions,
        user_answers: userAnswers,
        score: data.score,
        total_questions: data.total,
        time_spent_seconds: (examMode === "mock_60" ? 3600 : 1200) - timeLeft,
      };

      if (supabase) {
        const { data: inserted, error } = await supabase
          .from("reading_tests")
          .insert(record)
          .select()
          .single();

        if (!error && inserted) {
          setHistory((prev) => [{ ...inserted, band }, ...prev]);
        }
      }
      // Fire gamification
      if (onActivityDone) onActivityDone("reading");
      try {
        localStorage.removeItem("ielts_reading_active_session");
      } catch (e) {}
    } catch (e) {
      console.error(e);
    }
  }

  return (
    <div className="panel">
      {/* Configuration Header */}
      <div className="card form-row" style={{ flexWrap: "wrap", gap: "10px" }}>
        <input
          className="input-field"
          style={{ flex: "1 1 240px" }}
          placeholder="Chủ đề bài đọc (vd: Climate Change, Deep Sea Exploration, AI Ethics...)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <select 
          className="select-field"
          value={examMode}
          onChange={(e) => setExamMode(e.target.value)}
          style={{ width: "auto" }}
        >
          <option value="practice">Luyện tập (20 phút)</option>
          <option value="mock_60">Thi thử chuẩn (60 phút)</option>
          <option value="untimed">Không giới hạn giờ</option>
        </select>
        <button
          className="btn-primary"
          disabled={genLoading}
          onClick={handleGenerateTest}
        >
          {genLoading ? <Spinner label="AI đang sinh đề thi..." /> : <><Sparkles size={15} /> Tạo đề Reading mới</>}
        </button>
      </div>

      {/* Toast Notification */}
      {vocabToast && (
        <div style={{ padding: "10px 16px", background: "var(--jade)", color: "#000", fontWeight: "600", borderRadius: "8px", marginBottom: "16px", animation: "fadeIn 0.3s" }}>
          ✓ {vocabToast}
        </div>
      )}

      {testData && (
        <>
          {/* Question Palette & Exam Status Bar */}
          <div className="card" style={{ padding: "12px 16px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", background: "var(--ink-2)" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
              <Layers size={16} color="var(--amber)" />
              <strong style={{ fontSize: "13px" }}>Bảng câu hỏi:</strong>
              <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                {testData.questions.map((q, idx) => {
                  const isAnswered = !!userAnswers[q.id];
                  const isFlag = !!flagged[q.id];
                  return (
                    <button
                      key={q.id}
                      onClick={() => {
                        const el = document.getElementById(`q_block_${q.id}`);
                        if (el) el.scrollIntoView({ behavior: "smooth" });
                      }}
                      style={{
                        width: "28px",
                        height: "28px",
                        borderRadius: "6px",
                        fontSize: "12px",
                        fontWeight: "600",
                        border: isFlag ? "2px solid var(--amber)" : "1px solid var(--border-soft)",
                        background: isAnswered ? "var(--jade-light)" : "var(--ink-3)",
                        color: isAnswered ? "#000" : "var(--text-main)",
                        cursor: "pointer",
                      }}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
              {selectedText && (
                <button
                  className="btn-ghost"
                  style={{ borderColor: "var(--jade-light)", color: "var(--jade-light)", fontSize: "12px", padding: "6px 12px" }}
                  onClick={handleSaveSelectedVocab}
                  disabled={extractLoading}
                >
                  <BookmarkPlus size={14} /> {extractLoading ? "Đang trích xuất..." : `Lưu từ "${selectedText}"`}
                </button>
              )}
              <button className="btn-ghost" style={{ padding: "6px 12px", fontSize: "12px", borderColor: "var(--amber)", color: "var(--amber)" }} onClick={handleHighlight}>
                <Sparkles size={12} /> Tô màu
              </button>
              {examMode !== "untimed" && (
                <span className="chip chip-active" style={{ fontSize: "13px", padding: "6px 12px", fontWeight: "700" }}>
                  <Clock size={14} /> {formatTimer(timeLeft)}
                </span>
              )}
            </div>
          </div>

          {/* Split Screen Container */}
          <div className="reading-split-view" style={{ display: "grid", gridTemplateColumns: "1.1fr 0.9fr", gap: "16px", marginTop: "16px" }}>
            {/* Passage Column */}
            <div className="card" style={{ maxHeight: "700px", overflowY: "auto", display: "flex", flexDirection: "column" }}>
              <h3 className="section-title" style={{ margin: "0 0 12px 0", color: "var(--amber)" }}>{testData.title}</h3>
              
              <div 
                ref={passageRef}
                onMouseUp={handleMouseUpPassage}
                className="shadow-script" 
                style={{ fontSize: "14.5px", lineHeight: "1.8", whiteSpace: "pre-line", flex: 1, padding: "14px", background: "var(--ink-2)", borderRadius: "8px", userSelect: "text" }}
                dangerouslySetInnerHTML={{ __html: testData.passage }}
              />
              
              <div style={{ marginTop: "16px" }}>
                <strong style={{ fontSize: "13px", color: "var(--text-soft)" }}>📝 Take Notes & Keywords (Nháp bài đọc)</strong>
                <textarea
                  className="textarea-field"
                  rows={2}
                  placeholder="Ghi chú keywords quan trọng hoặc ý chính..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  style={{ marginTop: "8px", background: "var(--ink-3)", fontSize: "13px" }}
                />
              </div>
            </div>

            {/* Question Column — section-aware rendering */}
            <div className="card" style={{ maxHeight: "700px", overflowY: "auto" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "12px" }}>
                <h3 className="section-title" style={{ margin: 0 }}>Questions ({testData.questions.length})</h3>
                <span className="small-note">Câu 1-13 &mdash; 3 dạng câu hỏi IELTS</span>
              </div>

              {(testData.sections || []).map((section, si) => (
                <div key={si} style={{ marginBottom: 24 }}>
                  <div className="ielts-section-instruction">
                    {section.instruction}
                  </div>
                  {(section.questions || []).map((q, idx) => {
                    const globalIdx = testData.questions.findIndex(x => x.id === q.id);
                    return (
                      <div
                        key={q.id}
                        id={`q_block_${q.id}`}
                        style={{
                          marginBottom: "12px",
                          padding: "12px",
                          borderRadius: "8px",
                          background: flagged[q.id] ? "rgba(201, 163, 90, 0.08)" : "var(--ink-2)",
                          border: "1px solid var(--border-soft)"
                        }}
                      >
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                          <p style={{ fontWeight: "600", fontSize: "13.5px", margin: 0 }}>
                            <span style={{ color: "var(--amber)", marginRight: "6px" }}>{q.id}.</span> {q.question}
                          </p>
                          <button
                            onClick={() => setFlagged((prev) => ({ ...prev, [q.id]: !prev[q.id] }))}
                            style={{ background: "none", border: "none", cursor: "pointer", color: flagged[q.id] ? "var(--amber)" : "var(--text-soft)", padding: "2px" }}
                            title="Gắn cờ xem lại"
                          >
                            <Flag size={14} />
                          </button>
                        </div>

                        {/* MCQ / T-F-NG options */}
                        {q.options && q.options.length > 0 && (
                          <div style={{ display: "flex", flexDirection: "column", gap: "8px", marginTop: "10px" }}>
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
                        )}

                        {/* Short Answer / Gap Fill */}
                        {(!q.options || q.options.length === 0) && (
                          <input
                            type="text"
                            className="input-field"
                            style={{ marginTop: 8, fontSize: 13 }}
                            placeholder="Điền câu trả lời (tối đa 2 từ)..."
                            value={userAnswers[q.id] || ""}
                            onChange={(e) => setUserAnswers((prev) => ({ ...prev, [q.id]: e.target.value }))}
                            disabled={!!gradedResult}
                          />
                        )}

                        {gradedResult && (
                          <div className="ai-feedback" style={{ marginTop: "10px", padding: "8px 12px" }}>
                            {gradedResult.details[globalIdx]?.isCorrect ? (
                              <p style={{ color: "var(--jade-light)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", margin: 0 }}>
                                <CheckCircle2 size={14} /> Chính xác!
                              </p>
                            ) : (
                              <p style={{ color: "var(--coral)", fontWeight: "600", display: "flex", alignItems: "center", gap: "4px", margin: 0 }}>
                                <XCircle size={14} /> Đáp án đúng: <strong>{q.answer}</strong>
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
                <button className="btn-primary" onClick={handleGrade} style={{ width: "100%", justifyContent: "center", padding: "12px" }}>
                  <CheckCircle2 size={16} /> Nộp bài &amp; Xem Band điểm IELTS
                </button>
              ) : (
                <div style={{ textAlign: "center", padding: "16px", background: "var(--ink)", borderRadius: "8px", border: "1px solid var(--amber)" }}>
                  <h4 style={{ color: "var(--amber)", margin: "0 0 6px 0", fontSize: "16px" }}>
                    Kết quả: {gradedResult.score} / {gradedResult.total} ({Math.round((gradedResult.score / gradedResult.total) * 100)}%)
                  </h4>
                  <div style={{ display: "inline-block", padding: "4px 12px", background: "var(--jade)", color: "#000", fontWeight: "700", borderRadius: "20px", fontSize: "14px" }}>
                    Estimated Band: {rawToBand(gradedResult.score, gradedResult.total)}
                  </div>
                </div>
              )}
            </div>

          </div>
        </>
      )}


      {/* History */}
      <div className="card" style={{ marginTop: "16px" }}>
        <h3 className="section-title">Lịch sử làm bài Reading</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có bài kiểm tra Reading nào." />
        ) : (
          <div className="history-list">
            {history.map((h) => (
              <div key={h.id} className="history-item">
                <div>
                  <strong>{h.passage_title}</strong> · Đúng: {h.score}/{h.total_questions}
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

