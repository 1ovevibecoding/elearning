"use client";

import { useState, useEffect, useRef } from "react";
import {
  Mic, Square, Play, Loader2, ChevronRight, Award,
  Volume2, RotateCcw, CheckCircle2, AlertCircle, Minus
} from "lucide-react";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { ScoreGrid } from "./ui/ScoreGrid";
import { speak } from "@/lib/utils";

const PARTS = ["Part 1", "Part 2", "Part 3"];

const STATUS_STYLE = {
  correct:     { color: "var(--jade-light)",   label: "✓" },
  hesitated:   { color: "var(--amber)",         label: "~" },
  substituted: { color: "var(--coral)",         label: "≠" },
  missing:     { color: "#555",                 label: "✗" },
};

/* ─── Colored Word Map ─── */
function WordMap({ wordAnalysis }) {
  if (!wordAnalysis?.length) return null;
  return (
    <div className="word-map">
      {wordAnalysis.map((w, i) => {
        const style = STATUS_STYLE[w.status] || STATUS_STYLE.correct;
        return (
          <span
            key={i}
            className="word-chip"
            style={{ borderColor: style.color, color: style.color }}
            title={w.reason || ""}
          >
            {w.expected}
            <span className="word-chip-mark">{style.label}</span>
          </span>
        );
      })}
    </div>
  );
}

/* ─── Legend ─── */
function WordMapLegend() {
  return (
    <div className="word-map-legend">
      {[
        { color: "var(--jade-light)", label: "Chuẩn" },
        { color: "var(--amber)",       label: "Do dự" },
        { color: "var(--coral)",       label: "Sai / thay thế" },
        { color: "#555",               label: "Bỏ qua" },
      ].map((l) => (
        <span key={l.label} style={{ color: l.color, fontSize: 11 }}>
          ● {l.label}
        </span>
      ))}
    </div>
  );
}

/* ─── AI Examiner 2-Way Component ─── */
export function AIExaminer({ supabase, userId, history, setHistory }) {
  const [part, setPart] = useState("Part 1");
  const [conversation, setConversation] = useState([]);
  const [sessionId, setSessionId] = useState(null);
  const [status, setStatus] = useState("idle"); // idle|starting|examiner_speaking|waiting|recording|processing|done
  const [currentFeedback, setCurrentFeedback] = useState(null);
  const [sessionSummary, setSessionSummary] = useState(null);
  const [error, setError] = useState(null);

  const rec = useAudioRecorder();
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [conversation]);

  async function callExaminer(action, candidateAnswer) {
    const res = await fetch("/api/ai/examiner", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, part, conversation, candidateAnswer }),
    });
    return res.json();
  }

  async function handleStart() {
    setStatus("starting");
    setConversation([]);
    setSessionSummary(null);
    setCurrentFeedback(null);
    setError(null);

    try {
      const data = await callExaminer("start");
      if (!data.examiner_text) throw new Error("No response");

      const examinerMsg = { role: "examiner", text: data.examiner_text };
      setConversation([examinerMsg]);
      setStatus("examiner_speaking");
      speak(data.examiner_text, 0.9);
      await new Promise((r) => setTimeout(r, data.examiner_text.split(" ").length * 380 + 800));
      setStatus("waiting");
    } catch (e) {
      setError("Không kết nối được AI. Vui lòng thử lại.");
      setStatus("idle");
    }
  }

  async function handleRecordStart() {
    if (!rec.supported) {
      setError("Trình duyệt không hỗ trợ ghi âm. Hãy dùng Chrome.");
      return;
    }
    rec.reset();
    await rec.start();
    setStatus("recording");
  }

  async function handleRecordStop() {
    rec.stop();
    setStatus("processing");
  }

  // When audioBlob is ready, process it
  useEffect(() => {
    if (rec.audioBlob && status === "processing") {
      processRecording(rec.audioBlob);
    }
  }, [rec.audioBlob]);

  async function processRecording(blob) {
    try {
      // 1. Transcribe with Whisper
      const formData = new FormData();
      formData.append("audio", blob, "answer.webm");
      const txRes = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
      const txData = await txRes.json();
      const transcript = txData.transcript || "";

      if (!transcript.trim()) {
        setError("Không nhận được âm thanh rõ. Vui lòng thử lại.");
        setStatus("waiting");
        return;
      }

      // 2. Add candidate turn to conversation
      const candidateMsg = { role: "candidate", text: transcript };
      const updatedConv = [...conversation, candidateMsg];
      setConversation(updatedConv);

      // 3. Get examiner response
      const examData = await callExaminer("respond", transcript);

      setCurrentFeedback(examData.answer_feedback);

      if (examData.is_final && examData.session_summary) {
        setSessionSummary(examData.session_summary);
        const finalMsg = { role: "examiner", text: examData.examiner_text };
        setConversation([...updatedConv, finalMsg]);
        speak(examData.examiner_text, 0.9);
        setStatus("done");

        // Save to Supabase
        const record = {
          user_id: userId,
          part,
          conversation: [...updatedConv, finalMsg],
          final_band: examData.session_summary.final_band,
          final_feedback: examData.session_summary.summary_feedback,
        };
        const { data: inserted } = await supabase
          .from("examiner_sessions")
          .insert(record)
          .select()
          .single();
        if (inserted) setHistory((prev) => [inserted, ...prev]);
      } else {
        const nextMsg = { role: "examiner", text: examData.examiner_text };
        setConversation([...updatedConv, nextMsg]);
        setStatus("examiner_speaking");
        speak(examData.examiner_text, 0.9);
        await new Promise((r) =>
          setTimeout(r, examData.examiner_text.split(" ").length * 380 + 600)
        );
        setStatus("waiting");
      }
    } catch (e) {
      console.error(e);
      setError("Đã có lỗi xảy ra. Vui lòng thử lại.");
      setStatus("waiting");
    }
  }

  const isRunning = !["idle", "done"].includes(status);

  return (
    <div className="panel">
      {/* Controls */}
      <div className="card">
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <div>
            <h3 className="section-title" style={{ margin: 0 }}>
              🎙️ AI Examiner — Phỏng vấn IELTS Speaking
            </h3>
            <p className="small-note">
              AI đóng vai giám khảo thật. Bạn trả lời bằng giọng nói — Whisper sẽ transcribe và AI sẽ phân tích ngay.
            </p>
          </div>
          {!isRunning && (
            <select
              className="select-field"
              value={part}
              onChange={(e) => setPart(e.target.value)}
            >
              {PARTS.map((p) => <option key={p}>{p}</option>)}
            </select>
          )}
        </div>

        <div style={{ marginTop: "12px", display: "flex", gap: "10px", flexWrap: "wrap" }}>
          {status === "idle" || status === "done" ? (
            <button className="btn-primary" onClick={handleStart}>
              <Play size={15} />
              {status === "done" ? "Phỏng vấn mới" : `Bắt đầu ${part}`}
            </button>
          ) : null}

          {status === "waiting" && (
            <button className="btn-primary" onClick={handleRecordStart}>
              <Mic size={15} /> Trả lời (Ghi âm)
            </button>
          )}

          {status === "recording" && (
            <button className="btn-danger" onClick={handleRecordStop}>
              <Square size={15} /> Dừng & Gửi
              <span className="recording-pulse" />
            </button>
          )}

          {(status === "starting" || status === "processing") && (
            <span className="spinner-row">
              <Loader2 size={15} className="spin" />
              {status === "starting" ? "AI đang chuẩn bị..." : "Đang phân tích..."}
            </span>
          )}

          {status === "examiner_speaking" && (
            <span className="spinner-row" style={{ color: "var(--amber)" }}>
              <Volume2 size={15} /> Giám khảo đang nói...
            </span>
          )}

          {isRunning && (
            <button className="btn-ghost" onClick={() => { rec.reset(); setStatus("idle"); }}>
              <RotateCcw size={14} /> Hủy
            </button>
          )}
        </div>

        {error && (
          <div style={{ marginTop: "10px", color: "var(--coral)", fontSize: "13px", display: "flex", gap: "6px", alignItems: "center" }}>
            <AlertCircle size={14} /> {error}
          </div>
        )}
      </div>

      {/* Conversation */}
      {conversation.length > 0 && (
        <div className="card examiner-chat">
          <h3 className="section-title">Cuộc phỏng vấn</h3>
          <div className="chat-messages">
            {conversation.map((msg, i) => (
              <div key={i} className={`chat-bubble ${msg.role}`}>
                <span className="chat-role">
                  {msg.role === "examiner" ? "👔 Examiner" : "🎓 Bạn"}
                </span>
                <p>{msg.text}</p>
                {msg.role === "examiner" && (
                  <button
                    className="btn-ghost"
                    style={{ padding: "3px 8px", fontSize: 11, marginTop: 4 }}
                    onClick={() => speak(msg.text, 0.9)}
                  >
                    <Volume2 size={12} /> Nghe lại
                  </button>
                )}
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Per-turn feedback */}
          {currentFeedback && (
            <div className="ai-feedback" style={{ marginTop: "12px", borderLeft: "3px solid var(--amber)" }}>
              <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                <span className="score-pill">Band ~{currentFeedback.band_estimate}</span>
                <span style={{ fontSize: 12, color: "var(--text-soft)" }}>ước lượng câu trả lời vừa rồi</span>
              </div>
              <p style={{ fontSize: 13, color: "var(--jade-light)" }}>
                ✓ {currentFeedback.strength}
              </p>
              <p style={{ fontSize: 13, color: "var(--amber)", marginTop: 4 }}>
                💡 {currentFeedback.improvement}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Final Summary */}
      {sessionSummary && (
        <div className="card">
          <h3 className="section-title" style={{ color: "var(--amber)" }}>
            <Award size={18} style={{ display: "inline", marginRight: 6 }} />
            Kết quả phỏng vấn — Band tổng: {sessionSummary.final_band}
          </h3>
          <ScoreGrid
            items={[
              ["Trôi chảy & Mạch lạc (FC)", sessionSummary.fluency_coherence],
              ["Vốn từ vựng (LR)", sessionSummary.lexical_resource],
              ["Ngữ pháp & Cấu trúc (GRA)", sessionSummary.grammar],
              ["Phát âm (PR)", sessionSummary.pronunciation || sessionSummary.final_band],
            ]}
          />
          <p className="def-en" style={{ marginTop: 10 }}>{sessionSummary.summary_feedback}</p>
        </div>
      )}

      {/* History */}
      {history.length > 0 && (
        <div className="card">
          <h3 className="section-title">Lịch sử phỏng vấn</h3>
          <div className="history-list">
            {history.slice(0, 6).map((h) => (
              <div key={h.id} className="history-item">
                <div>
                  <strong>{h.part}</strong> · Band {h.final_band}
                </div>
                <span className="small-note">
                  {new Date(h.created_at).toLocaleDateString("vi-VN")}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
