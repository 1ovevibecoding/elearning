"use client";

import { useState } from "react";
import { Sparkles, Mic, Square } from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { ScoreGrid } from "./ui/ScoreGrid";
import { useSpeechRecognition } from "@/hooks/useSpeechRecognition";
import { AIExaminer } from "./AIExaminer";
import { TASK_TYPES, SPEAKING_PARTS, fmtDate } from "@/lib/utils";

/* ─── Writing Panel ─── */
function WritingPanel({ history, setHistory, supabase, userId }) {
  const [taskType, setTaskType] = useState(TASK_TYPES[1]);
  const [prompt, setPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [annotateLoading, setAnnotateLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [annotations, setAnnotations] = useState(null);

  async function handleGeneratePrompt() {
    setGenLoading(true);
    try {
      const res = await fetch("/api/ai/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", taskType }),
      });
      const data = await res.json();
      if (data.prompt) setPrompt(data.prompt);
    } catch (e) {
      alert("Không tạo được đề, vui lòng thử lại.");
    }
    setGenLoading(false);
  }

  async function handleGrade() {
    if (!essay.trim() || !prompt.trim()) return;
    setGradeLoading(true);
    try {
      const res = await fetch("/api/ai/writing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grade", taskType, prompt, essay }),
      });
      const data = await res.json();
      if (data.band_overall !== undefined) {
        setResult(data);

        const record = {
          user_id: userId,
          task_type: taskType,
          prompt,
          essay,
          band_overall: data.band_overall,
          task_achievement: data.task_achievement,
          coherence_cohesion: data.coherence_cohesion,
          lexical_resource: data.lexical_resource,
          grammar: data.grammar,
          feedback: data.feedback || "",
          top_errors: data.top_errors || [],
        };

        const { data: inserted, error } = await supabase
          .from("writing_attempts")
          .insert(record)
          .select()
          .single();

        if (error) {
          console.error("Insert writing error:", error);
          setHistory((prev) => [
            ...prev,
            { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() },
          ]);
        } else {
          setHistory((prev) => [...prev, inserted]);
        }
      } else {
        alert("Không chấm được bài, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối, vui lòng thử lại.");
    }
    setGradeLoading(false);
  }

  async function handleAnnotate() {
    if (!essay.trim()) return;
    setAnnotateLoading(true);
    setAnnotations(null);
    try {
      const res = await fetch("/api/ai/writing-annotate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ taskType, essay }),
      });
      const data = await res.json();
      if (data.sentence_feedback) setAnnotations(data);
      else alert("Không thể phân tích lỗi chi tiết.");
    } catch (e) {
      alert("Lỗi kết nối, vui lòng thử lại.");
    }
    setAnnotateLoading(false);
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <select
          className="select-field"
          value={taskType}
          onChange={(e) => setTaskType(e.target.value)}
        >
          {TASK_TYPES.map((t) => (
            <option key={t}>{t}</option>
          ))}
        </select>
        <button
          className="btn-ghost"
          disabled={genLoading}
          onClick={handleGeneratePrompt}
        >
          {genLoading ? (
            <Spinner label="Đang tạo đề..." />
          ) : (
            <>
              <Sparkles size={15} /> Sinh đề ngẫu nhiên
            </>
          )}
        </button>
      </div>

      <div className="card">
        <label className="label-text">Đề bài</label>
        <textarea
          className="textarea-field"
          rows={2}
          placeholder="Dán đề bài của bạn hoặc bấm 'Sinh đề ngẫu nhiên'..."
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
        <label className="label-text">Bài làm của bạn</label>
        <textarea
          className="textarea-field"
          rows={8}
          placeholder="Viết bài luận của bạn ở đây..."
          value={essay}
          onChange={(e) => setEssay(e.target.value)}
        />
        <div style={{ display: "flex", gap: "10px", marginTop: "10px" }}>
          <button
            className="btn-primary"
            disabled={gradeLoading || !essay.trim() || !prompt.trim()}
            onClick={handleGrade}
          >
            {gradeLoading ? <Spinner label="Đang chấm..." /> : "Chấm bài (Band score)"}
          </button>
          <button
            className="btn-ghost"
            style={{ borderColor: "var(--amber)", color: "var(--amber)" }}
            disabled={annotateLoading || !essay.trim()}
            onClick={handleAnnotate}
          >
            {annotateLoading ? <Spinner label="Đang phân tích..." /> : "🔍 Sửa lỗi chi tiết (Inline Annotations)"}
          </button>
        </div>
      </div>

      {annotations && (
        <div className="card" style={{ borderColor: "var(--amber)" }}>
          <h3 className="section-title" style={{ color: "var(--amber)" }}>🔍 Inline Annotations & Upgrades</h3>
          {annotations.overall_tip && (
            <div style={{ marginBottom: 12, padding: "8px 12px", background: "rgba(214,169,75,0.1)", borderLeft: "3px solid var(--amber)", fontSize: 13 }}>
              💡 {annotations.overall_tip}
            </div>
          )}
          
          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 13 }}>1. Lỗi từng câu (Sentence Feedback)</strong>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 10 }}>
              {annotations.sentence_feedback.map((sf, i) => (
                <div key={i} style={{ padding: 10, background: "var(--ink-2)", borderRadius: 6, fontSize: 13 }}>
                  <div style={{ color: "var(--coral)", textDecoration: "line-through", marginBottom: 4 }}>{sf.original}</div>
                  <div style={{ color: "var(--jade-light)", marginBottom: 4 }}>✓ {sf.improved_sentence}</div>
                  {sf.issues?.map((iss, j) => (
                    <div key={j} style={{ color: "var(--text-soft)", fontSize: 12, marginLeft: 12 }}>
                      • <strong>{iss.original_phrase}</strong> ➔ {iss.suggestion}: {iss.explanation}
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <strong style={{ fontSize: 13 }}>2. Từ nối (Coherence & Cohesion)</strong>
            <div style={{ marginTop: 8, fontSize: 13, color: "var(--text-soft)" }}>
              <p>Đã dùng: <span style={{ color: "var(--jade-light)" }}>{annotations.linking_words_found?.join(", ") || "Không có"}</span></p>
              <p style={{ marginTop: 4 }}>Gợi ý thêm: <span style={{ color: "var(--amber)" }}>{annotations.linking_words_missing?.join(", ")}</span></p>
            </div>
          </div>

          <div>
            <strong style={{ fontSize: 13 }}>3. Nâng cấp từ vựng (Lexical Resource)</strong>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 6 }}>
              {annotations.vocabulary_upgrades?.map((v, i) => (
                <div key={i} style={{ fontSize: 13, color: "var(--text-soft)" }}>
                  <span style={{ textDecoration: "line-through", color: "var(--coral)" }}>{v.basic}</span> ➔{" "}
                  <span style={{ color: "var(--jade)" }}>{v.advanced?.join(" / ")}</span>{" "}
                  <span className="score-pill" style={{ padding: "2px 6px", fontSize: 10 }}>{v.band}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {result && (
        <div className="card">
          <h3 className="section-title">
            Kết quả — Band tổng: {result.band_overall}
          </h3>
          <ScoreGrid
            items={[
              ["Nhiệm vụ", result.task_achievement],
              ["Mạch lạc & Liên kết", result.coherence_cohesion],
              ["Từ vựng", result.lexical_resource],
              ["Ngữ pháp", result.grammar],
            ]}
          />
          <p className="def-en">{result.feedback}</p>
          {result.top_errors && result.top_errors.length > 0 && (
            <ul className="error-list">
              {result.top_errors.map((e, i) => (
                <li key={i}>{e}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Lịch sử Writing</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có bài Writing nào." />
        ) : (
          <div className="history-list">
            {[...history]
              .reverse()
              .slice(0, 8)
              .map((h) => (
                <div key={h.id} className="history-item">
                  <div>
                    <strong>{h.task_type}</strong> · band {h.band_overall}
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

/* ─── Speaking Panel ─── */
function SpeakingPanel({ history, setHistory, supabase, userId }) {
  const [part, setPart] = useState(SPEAKING_PARTS[0]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [result, setResult] = useState(null);
  const rec = useSpeechRecognition();

  async function handleGenerateQuestion() {
    setGenLoading(true);
    try {
      const res = await fetch("/api/ai/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "generate", part }),
      });
      const data = await res.json();
      if (data.question) setQuestion(data.question);
    } catch (e) {
      alert("Không tạo được câu hỏi, vui lòng thử lại.");
    }
    setGenLoading(false);
  }

  async function handleGrade() {
    if (!answer.trim() || !question.trim()) return;
    setGradeLoading(true);
    try {
      const res = await fetch("/api/ai/speaking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "grade", part, question, answer }),
      });
      const data = await res.json();
      if (data.band_overall !== undefined) {
        setResult(data);

        const record = {
          user_id: userId,
          part,
          question,
          answer,
          band_overall: data.band_overall,
          fluency_coherence: data.fluency_coherence,
          lexical_resource: data.lexical_resource,
          grammar: data.grammar,
          feedback: data.feedback || "",
        };

        const { data: inserted, error } = await supabase
          .from("speaking_attempts")
          .insert(record)
          .select()
          .single();

        if (error) {
          console.error("Insert speaking error:", error);
          setHistory((prev) => [
            ...prev,
            { ...record, id: crypto.randomUUID(), created_at: new Date().toISOString() },
          ]);
        } else {
          setHistory((prev) => [...prev, inserted]);
        }
      } else {
        alert("Không chấm được, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối, vui lòng thử lại.");
    }
    setGradeLoading(false);
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <select
          className="select-field"
          value={part}
          onChange={(e) => setPart(e.target.value)}
        >
          {SPEAKING_PARTS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button
          className="btn-ghost"
          disabled={genLoading}
          onClick={handleGenerateQuestion}
        >
          {genLoading ? (
            <Spinner label="Đang tạo câu hỏi..." />
          ) : (
            <>
              <Sparkles size={15} /> Sinh câu hỏi
            </>
          )}
        </button>
      </div>

      <div className="card">
        <label className="label-text">Câu hỏi</label>
        <textarea
          className="textarea-field"
          rows={2}
          placeholder="Bấm 'Sinh câu hỏi' hoặc tự nhập..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />

        <label className="label-text">Câu trả lời của bạn</label>
        <textarea
          className="textarea-field"
          rows={5}
          placeholder="Gõ câu trả lời, hoặc dùng micro để đọc rồi sao chép bản ghi vào đây..."
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
        />

        <div className="shadow-controls">
          {rec.supported ? (
            !rec.listening ? (
              <button
                className="btn-ghost"
                onClick={() => {
                  rec.reset();
                  rec.start();
                }}
              >
                <Mic size={15} /> Ghi âm câu trả lời
              </button>
            ) : (
              <button className="btn-danger" onClick={rec.stop}>
                <Square size={15} /> Dừng ghi
              </button>
            )
          ) : (
            <span className="small-note">
              Trình duyệt chưa hỗ trợ nhận diện giọng nói.
            </span>
          )}
          {rec.transcript && !rec.listening && (
            <button
              className="btn-ghost"
              onClick={() => setAnswer(rec.transcript)}
            >
              Dùng bản ghi này
            </button>
          )}
        </div>

        <button
          className="btn-primary"
          disabled={gradeLoading || !answer.trim() || !question.trim()}
          onClick={handleGrade}
        >
          {gradeLoading ? (
            <Spinner label="Đang chấm..." />
          ) : (
            "Chấm câu trả lời"
          )}
        </button>
        <p className="small-note">
          Lưu ý: chưa đánh giá phát âm/ngữ điệu thật vì hệ thống chỉ phân
          tích văn bản, không phân tích âm thanh trực tiếp.
        </p>
      </div>

      {result && (
        <div className="card">
          <h3 className="section-title">
            Kết quả — Band tổng: {result.band_overall}
          </h3>
          <ScoreGrid
            items={[
              ["Trôi chảy & Mạch lạc", result.fluency_coherence],
              ["Từ vựng", result.lexical_resource],
              ["Ngữ pháp", result.grammar],
            ]}
          />
          <p className="def-en">{result.feedback}</p>
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Lịch sử Speaking</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có lượt Speaking nào." />
        ) : (
          <div className="history-list">
            {[...history]
              .reverse()
              .slice(0, 8)
              .map((h) => (
                <div key={h.id} className="history-item">
                  <div>
                    <strong>{h.part}</strong> · band {h.band_overall}
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

/* ─── IELTS Skills Tab (container) ─── */
export function IeltsTab({
  writingHistory,
  setWritingHistory,
  speakingHistory,
  setSpeakingHistory,
  examinerHistory,
  setExaminerHistory,
  supabase,
  userId,
}) {
  const [sub, setSub] = useState("writing");
  return (
    <div>
      <div className="sub-tab-row">
        <button
          className={`chip ${sub === "writing" ? "chip-active" : ""}`}
          onClick={() => setSub("writing")}
        >
          ✍️ Writing
        </button>
        <button
          className={`chip ${sub === "speaking" ? "chip-active" : ""}`}
          onClick={() => setSub("speaking")}
        >
          🎤 Speaking (Text)
        </button>
        <button
          className={`chip ${sub === "examiner" ? "chip-active" : ""}`}
          onClick={() => setSub("examiner")}
        >
          🎙️ AI Examiner
        </button>
      </div>
      {sub === "writing" && (
        <WritingPanel
          history={writingHistory}
          setHistory={setWritingHistory}
          supabase={supabase}
          userId={userId}
        />
      )}
      {sub === "speaking" && (
        <SpeakingPanel
          history={speakingHistory}
          setHistory={setSpeakingHistory}
          supabase={supabase}
          userId={userId}
        />
      )}
      {sub === "examiner" && (
        <AIExaminer
          supabase={supabase}
          userId={userId}
          history={examinerHistory}
          setHistory={setExaminerHistory}
        />
      )}
    </div>
  );
}
