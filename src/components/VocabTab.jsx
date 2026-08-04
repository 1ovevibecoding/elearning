"use client";

import { useState } from "react";
import { Plus, Sparkles, ChevronDown, ChevronUp, BrainCircuit, Play } from "lucide-react";
import { Badge } from "./ui/Badge";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { POS_OPTIONS, SM2_RATINGS, sm2, fmtDate } from "@/lib/utils";

/* ─── Single Vocab Card ─── */
function VocabCard({ item, loadingId, setLoadingId, onGenerate, onUpdate, supabase }) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [cloze, setCloze] = useState(null);
  
  const isLoading = loadingId === item.id;
  const isDue = item.due_date && item.due_date <= new Date().toISOString();

  // Handle Feynman submission
  async function handleSubmitFeynman() {
    setLoadingId(item.id);
    try {
      const res = await fetch("/api/ai/feynman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: item.word,
          definition_en: item.definition_en,
          explanation,
        }),
      });
      const result = await res.json();
      if (result.score !== undefined) {
        // Map Feynman score to SM-2 rating automatically
        let q = 0; // again
        if (result.score >= 85) q = 5; // easy
        else if (result.score >= 70) q = 4; // good
        else if (result.score >= 50) q = 2; // hard

        handleSM2(q, result);
      } else {
        alert("Không chấm được, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối, vui lòng thử lại.");
    }
    setLoadingId(null);
  }

  // Handle Cloze Generation
  async function handleGenerateCloze() {
    setLoadingId(item.id);
    setCloze(null);
    try {
      const res = await fetch("/api/ai/cloze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          word: item.word,
          definition_en: item.definition_en,
          example_en: item.example_en,
        }),
      });
      const result = await res.json();
      if (result.exercises) setCloze(result.exercises);
      else alert("Không tạo được bài tập.");
    } catch (e) {
      alert("Lỗi kết nối.");
    }
    setLoadingId(null);
  }

  // Apply SM-2 algorithm
  async function handleSM2(q, feynmanResult = null) {
    const { newEF, newInterval, newReps, dueDate, status } = sm2(
      q,
      item.ease_factor || 2.5,
      item.repetitions || 0,
      item.interval_days || 1
    );

    const updates = {
      ease_factor: newEF,
      interval_days: newInterval,
      repetitions: newReps,
      due_date: dueDate,
      status: status,
    };
    if (feynmanResult) {
      updates.last_feedback = { score: feynmanResult.score, feedback: feynmanResult.feedback };
    }

    try {
      await supabase.from("vocabulary").update(updates).eq("id", item.id);
      onUpdate(item.id, updates);
    } catch (e) {
      alert("Lỗi lưu kết quả.");
    }
  }

  return (
    <div className="card vocab-card">
      <div className="vocab-card-head" onClick={() => setOpen((o) => !o)}>
        <div>
          <span className="vocab-word">{item.word}</span>
          <span className="pos-tag">{item.pos}</span>
        </div>
        <div className="vocab-head-right">
          <Badge tone={item.status === "active" ? "active" : "passive"}>
            {item.status === "active" ? "Chủ động" : "Thụ động"}
          </Badge>
          {isDue && <Badge tone="due">Cần ôn</Badge>}
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div className="vocab-card-body">
          {!item.definition_en ? (
            <button
              className="btn-primary"
              disabled={isLoading}
              onClick={() => onGenerate(item)}
            >
              {isLoading ? <Spinner label="Đang tạo..." /> : <><Sparkles size={15} /> Sinh định nghĩa AI (Anh–Anh)</>}
            </button>
          ) : (
            <>
              <p className="def-en"><strong>Definition:</strong> {item.definition_en}</p>
              <p className="def-en"><strong>Example:</strong> {item.example_en}</p>
              {item.synonyms?.length > 0 && (
                <p className="def-en small-note">Synonyms: {item.synonyms.join(", ")}</p>
              )}

              {/* SM-2 Review Buttons */}
              <div style={{ marginTop: 16, padding: 12, background: "var(--ink-2)", borderRadius: 8, border: "1px solid var(--border-soft)" }}>
                <strong style={{ fontSize: 13, display: "block", marginBottom: 8 }}>Đánh giá trí nhớ (SM-2 SRS)</strong>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {SM2_RATINGS.map((r) => (
                    <button
                      key={r.key}
                      className="btn-ghost"
                      style={{ flex: 1, minWidth: 70, borderColor: r.color, color: r.color, fontSize: 12 }}
                      onClick={() => handleSM2(r.q)}
                    >
                      {r.label}
                    </button>
                  ))}
                </div>
                {item.due_date && (
                  <p className="small-note" style={{ marginTop: 8, textAlign: "center" }}>
                    Lần ôn tới: {fmtDate(item.due_date)} · Interval: {item.interval_days || 1}d · EF: {item.ease_factor || 2.5}
                  </p>
                )}
              </div>

              {/* Active Recall Tools */}
              <div style={{ marginTop: 16, display: "flex", gap: 10 }}>
                <button className="btn-ghost" style={{ flex: 1 }} onClick={handleGenerateCloze} disabled={isLoading}>
                  {isLoading && !cloze ? <Spinner label="Đang tạo..." /> : <><BrainCircuit size={14} /> Cloze Test</>}
                </button>
              </div>

              {/* Cloze Test */}
              {cloze && (
                <div style={{ marginTop: 12, padding: 12, background: "var(--ink-3)", borderRadius: 8, borderLeft: "3px solid var(--jade)" }}>
                  <strong style={{ fontSize: 12, color: "var(--jade-light)" }}>Contextual Cloze Test</strong>
                  {cloze.map((c, i) => (
                    <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
                      <p><strong>{i+1}.</strong> {c.sentence}</p>
                      <p style={{ color: "var(--text-soft)", fontSize: 11, marginTop: 4 }}>Gợi ý: {c.context_hint}</p>
                    </div>
                  ))}
                  <button className="btn-ghost" style={{ marginTop: 8, fontSize: 11, padding: "2px 8px" }} onClick={() => setCloze(null)}>Đóng</button>
                </div>
              )}

              {/* Feynman Technique */}
              <div className="feynman-box" style={{ marginTop: 16 }}>
                <label className="label-text">Feynman: tự giải thích từ này bằng tiếng Anh</label>
                <textarea
                  className="textarea-field"
                  rows={2}
                  placeholder="Explain this word in your own English words..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
                <button
                  className="btn-primary"
                  disabled={isLoading || !explanation.trim()}
                  onClick={handleSubmitFeynman}
                >
                  {isLoading && !cloze ? <Spinner label="Đang chấm..." /> : "Chấm & Cập nhật SRS"}
                </button>

                {item.last_feedback && (
                  <div className="ai-feedback">
                    <span className="score-pill">{item.last_feedback.score}/100</span>
                    <p>{item.last_feedback.feedback}</p>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Vocab Tab ─── */
export function VocabTab({ vocabList, setVocabList, supabase, userId }) {
  const [word, setWord] = useState("");
  const [pos, setPos] = useState(POS_OPTIONS[0]);
  const [filter, setFilter] = useState("all");
  const [loadingId, setLoadingId] = useState(null);

  async function addWord() {
    if (!word.trim()) return;

    const newItem = {
      user_id: userId,
      word: word.trim(),
      pos,
      status: "passive",
      definition_en: "",
      example_en: "",
      synonyms: [],
      srs_level: 0,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      due_date: null,
      last_feedback: null,
    };

    const { data, error } = await supabase
      .from("vocabulary")
      .insert(newItem)
      .select()
      .single();

    if (error) {
      console.error("Insert vocab error:", error);
      setVocabList((prev) => [
        { ...newItem, id: crypto.randomUUID(), created_at: new Date().toISOString() },
        ...prev,
      ]);
    } else {
      setVocabList((prev) => [data, ...prev]);
    }
    setWord("");
  }

  async function handleGenerate(item) {
    setLoadingId(item.id);
    try {
      const res = await fetch("/api/ai/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: item.word, pos: item.pos }),
      });
      const result = await res.json();

      if (result.definition_en) {
        const updates = {
          definition_en: result.definition_en,
          example_en: result.example_en,
          synonyms: result.synonyms || [],
        };
        await supabase.from("vocabulary").update(updates).eq("id", item.id);
        setVocabList((prev) => prev.map((v) => (v.id === item.id ? { ...v, ...updates } : v)));
      } else {
        alert("Không tạo được định nghĩa, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối.");
    }
    setLoadingId(null);
  }

  function handleUpdateLocal(id, updates) {
    setVocabList((prev) => prev.map((v) => (v.id === id ? { ...v, ...updates } : v)));
  }

  const filtered = vocabList.filter((v) => {
    if (filter === "all") return true;
    if (filter === "due") return v.due_date && v.due_date <= new Date().toISOString();
    return v.status === filter;
  });

  return (
    <div className="panel">
      <div className="card form-row">
        <input
          className="input-field"
          placeholder="Nhập từ mới (vd: meticulous)"
          value={word}
          onChange={(e) => setWord(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
        />
        <select className="select-field" value={pos} onChange={(e) => setPos(e.target.value)}>
          {POS_OPTIONS.map((p) => (
            <option key={p}>{p}</option>
          ))}
        </select>
        <button className="btn-primary" onClick={addWord}>
          <Plus size={15} /> Thêm từ
        </button>
      </div>

      <div className="sub-tab-row" style={{ marginTop: 20 }}>
        <button className={`chip ${filter === "all" ? "chip-active" : ""}`} onClick={() => setFilter("all")}>
          Tất cả ({vocabList.length})
        </button>
        <button className={`chip ${filter === "due" ? "chip-active" : ""}`} onClick={() => setFilter("due")}>
          Cần ôn ({vocabList.filter((v) => v.due_date && v.due_date <= new Date().toISOString()).length})
        </button>
        <button className={`chip ${filter === "active" ? "chip-active" : ""}`} onClick={() => setFilter("active")}>
          Chủ động
        </button>
        <button className={`chip ${filter === "passive" ? "chip-active" : ""}`} onClick={() => setFilter("passive")}>
          Thụ động
        </button>
      </div>

      <div className="vocab-list">
        {filtered.length === 0 ? (
          <EmptyState text="Danh sách từ vựng trống." />
        ) : (
          filtered.map((item) => (
            <VocabCard
              key={item.id}
              item={item}
              loadingId={loadingId}
              setLoadingId={setLoadingId}
              onGenerate={handleGenerate}
              onUpdate={handleUpdateLocal}
              supabase={supabase}
            />
          ))
        )}
      </div>
    </div>
  );
}
