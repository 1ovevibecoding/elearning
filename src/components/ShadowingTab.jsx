"use client";

import { useState, useEffect } from "react";
import { Sparkles, Volume2, Mic, Square, Loader2, RotateCcw } from "lucide-react";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { useAudioRecorder } from "@/hooks/useAudioRecorder";
import { LEVEL_OPTIONS, speak, fmtDate } from "@/lib/utils";

/* ─── Word Chip with color ─── */
const STATUS_COLOR = {
  correct:     "var(--jade-light)",
  hesitated:   "var(--amber)",
  substituted: "var(--coral)",
  missing:     "#444",
};

function WordMap({ wordAnalysis }) {
  if (!wordAnalysis?.length) return null;
  return (
    <div className="word-map">
      {wordAnalysis.map((w, i) => (
        <span
          key={i}
          className="word-chip"
          style={{ borderColor: STATUS_COLOR[w.status] || "var(--jade-light)", color: STATUS_COLOR[w.status] || "var(--jade-light)" }}
          title={w.reason || ""}
        >
          {w.expected}
        </span>
      ))}
    </div>
  );
}

function WordMapLegend() {
  return (
    <div className="word-map-legend">
      <span style={{ color: "var(--jade-light)", fontSize: 11 }}>● Chuẩn</span>
      <span style={{ color: "var(--amber)", fontSize: 11 }}>● Do dự / chậm</span>
      <span style={{ color: "var(--coral)", fontSize: 11 }}>● Sai / thay thế</span>
      <span style={{ color: "#555", fontSize: 11 }}>● Bỏ qua</span>
    </div>
  );
}

export function ShadowingTab({ history, setHistory, supabase, userId }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(LEVEL_OPTIONS[1]);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [analysisResult, setAnalysisResult] = useState(null);
  const [transcript, setTranscript] = useState("");
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const rec = useAudioRecorder();

  async function handleGenerate() {
    setLoading(true);
    setScript("");
    setAnalysisResult(null);
    setTranscript("");
    rec.reset();
    try {
      const res = await fetch("/api/ai/shadowing", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ topic, level }),
      });
      const result = await res.json();
      if (result.script) setScript(result.script);
      else alert("Không tạo được bài, vui lòng thử lại.");
    } catch {
      alert("Lỗi kết nối server.");
    }
    setLoading(false);
  }

  // When audioBlob is ready after stopping, auto-analyze
  useEffect(() => {
    if (rec.audioBlob && !rec.isRecording) {
      analyzeRecording(rec.audioBlob);
    }
  }, [rec.audioBlob]);

  async function analyzeRecording(blob) {
    if (!script) return;
    setIsAnalyzing(true);
    setAnalysisResult(null);

    try {
      // Step 1: Transcribe with Whisper
      const formData = new FormData();
      formData.append("audio", blob, "shadowing.webm");
      const txRes = await fetch("/api/ai/transcribe", { method: "POST", body: formData });
      const txData = await txRes.json();
      const spokenTranscript = txData.transcript || "";
      setTranscript(spokenTranscript);

      if (!spokenTranscript.trim()) {
        alert("Không nhận được giọng nói rõ. Hãy nói gần mic hơn và thử lại.");
        setIsAnalyzing(false);
        return;
      }

      // Step 2: Pronunciation analysis
      const pRes = await fetch("/api/ai/pronunciation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          expectedText: script,
          actualTranscript: spokenTranscript,
          words: txData.words || [],
        }),
      });
      const pData = await pRes.json();
      setAnalysisResult(pData);

      // Step 3: Save to Supabase
      const record = {
        user_id: userId,
        session_type: "shadowing",
        expected_text: script,
        actual_transcript: spokenTranscript,
        word_analysis: pData.word_analysis || [],
        overall_score: pData.overall_score || 0,
        ai_feedback: pData.overall_feedback || "",
        audio_duration_ms: rec.durationMs,
      };

      const { data: inserted, error } = await supabase
        .from("pronunciation_sessions")
        .insert(record)
        .select()
        .single();

      // Also save to old shadowing_sessions for dashboard stats
      await supabase.from("shadowing_sessions").insert({
        user_id: userId,
        topic: topic || "General",
        level,
        script,
        accuracy: pData.overall_score || 0,
        user_transcript: spokenTranscript,
      });

      if (!error && inserted) {
        setHistory((prev) => [
          {
            id: inserted.id,
            topic: topic || "General",
            level,
            accuracy: pData.overall_score,
            created_at: inserted.created_at,
          },
          ...prev,
        ]);
      }
    } catch (e) {
      console.error(e);
      alert("Đã có lỗi khi phân tích. Vui lòng thử lại.");
    }
    setIsAnalyzing(false);
  }

  return (
    <div className="panel">
      {/* Generate */}
      <div className="card form-row">
        <input
          className="input-field"
          placeholder="Chủ đề shadowing (vd: environment, technology, travel...)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <select className="select-field" value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVEL_OPTIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button className="btn-primary" disabled={loading} onClick={handleGenerate}>
          {loading ? <Spinner label="Đang soạn..." /> : <><Sparkles size={15} /> Sinh bài luyện</>}
        </button>
      </div>

      {/* Script + Controls */}
      {script && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Script luyện tập</h3>
            <div style={{ display: "flex", gap: "8px" }}>
              <button className="btn-ghost" onClick={() => speak(script, 0.8)}>
                <Volume2 size={14} /> 0.8x
              </button>
              <button className="btn-ghost" onClick={() => speak(script, 1)}>
                <Volume2 size={14} /> 1.0x
              </button>
              <button className="btn-ghost" onClick={() => speak(script, 1.2)}>
                <Volume2 size={14} /> 1.2x
              </button>
            </div>
          </div>

          <p className="shadow-script">{script}</p>

          <div className="shadow-controls" style={{ marginTop: 12 }}>
            {!rec.isRecording ? (
              <button
                className="btn-primary"
                onClick={() => { rec.reset(); setAnalysisResult(null); setTranscript(""); rec.start(); }}
                disabled={isAnalyzing}
              >
                <Mic size={15} /> Bắt đầu Shadowing (Ghi âm thực)
              </button>
            ) : (
              <button className="btn-danger" onClick={rec.stop}>
                <Square size={15} /> Dừng & Phân tích
                <span className="recording-pulse" />
              </button>
            )}
            {isAnalyzing && (
              <span className="spinner-row">
                <Loader2 size={15} className="spin" />
                Whisper đang phân tích âm thanh...
              </span>
            )}
            {(analysisResult || rec.isRecording) && (
              <button className="btn-ghost" onClick={() => { rec.reset(); setAnalysisResult(null); setTranscript(""); }}>
                <RotateCcw size={14} /> Thử lại
              </button>
            )}
          </div>

          {/* Transcript */}
          {transcript && !isAnalyzing && (
            <div style={{ marginTop: 10, padding: "10px 12px", background: "var(--ink)", borderRadius: 8, fontSize: 13, color: "var(--text-soft)", borderLeft: "3px solid var(--amber)" }}>
              <strong style={{ color: "var(--amber)", display: "block", marginBottom: 4, fontSize: 11 }}>WHISPER TRANSCRIPTION:</strong>
              {transcript}
            </div>
          )}
        </div>
      )}

      {/* Pronunciation Analysis */}
      {analysisResult && (
        <div className="card">
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <h3 className="section-title" style={{ margin: 0 }}>Phân tích phát âm</h3>
            <span className="score-pill">{analysisResult.overall_score}/100</span>
          </div>

          <WordMapLegend />
          <WordMap wordAnalysis={analysisResult.word_analysis} />

          {analysisResult.overall_feedback && (
            <div className="ai-feedback" style={{ marginTop: 12 }}>
              <p style={{ fontSize: 13 }}>{analysisResult.overall_feedback}</p>
            </div>
          )}

          {analysisResult.top_issues?.length > 0 && (
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, fontWeight: 600, color: "var(--text-soft)", marginBottom: 6 }}>ĐIỂM CẦN CẢI THIỆN:</p>
              <ul className="error-list">
                {analysisResult.top_issues.map((issue, i) => (
                  <li key={i} style={{ color: "var(--amber)" }}>{issue}</li>
                ))}
              </ul>
            </div>
          )}

          {analysisResult.tip && (
            <div style={{ marginTop: 10, padding: "8px 12px", background: "var(--jade-glow)", borderRadius: 8, fontSize: 13, borderLeft: "3px solid var(--jade)" }}>
              💡 <strong>Mẹo:</strong> {analysisResult.tip}
            </div>
          )}
        </div>
      )}

      {/* History */}
      <div className="card">
        <h3 className="section-title">Lịch sử luyện tập</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có buổi shadowing nào. Thử tạo bài luyện đầu tiên!" />
        ) : (
          <div className="history-list">
            {history.slice(0, 8).map((h) => (
              <div key={h.id} className="history-item">
                <div>
                  <strong>{h.topic}</strong>
                  <span style={{ color: "var(--text-soft)", marginLeft: 6 }}>· {h.level}</span>
                </div>
                <div className="history-right">
                  <span className="score-pill">{h.accuracy}/100</span>
                  <span className="small-note">{fmtDate(h.created_at)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
