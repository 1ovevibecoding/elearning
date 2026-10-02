"use client";

import { useState, useMemo } from "react";
import {
  Sparkles, ChevronDown, ChevronUp, BrainCircuit,
  BookOpen, CheckSquare, Square, X, Languages,
  Loader2, BookText, Layers, Trash2, Volume2
} from "lucide-react";
import { Badge } from "./ui/Badge";
import { Spinner } from "./ui/Spinner";
import { EmptyState } from "./ui/EmptyState";
import { SM2_RATINGS, sm2, fmtDate, speak } from "@/lib/utils";

/* ─── Constants & Helpers ─── */
const POS_ABBREV = {
  noun: "n.", "danh từ": "n.", adjective: "adj.", "tính từ": "adj.",
  verb: "v.", "động từ": "v.", adverb: "adv.", "trạng từ": "adv.",
  preposition: "prep.", "giới từ": "prep.", conjunction: "conj.", "liên từ": "conj.",
};
function getPosAbbrev(pos) {
  return POS_ABBREV[(pos || "").toLowerCase()] || pos?.slice(0, 4) + ".";
}

const CEFR_COLORS = {
  A1: { bg: "rgba(46, 204, 113, 0.15)", border: "rgba(46, 204, 113, 0.35)", text: "#2ecc71" },
  A2: { bg: "rgba(39, 174, 96, 0.15)",  border: "rgba(39, 174, 96, 0.35)",  text: "#27ae60" },
  B1: { bg: "rgba(52, 152, 219, 0.15)", border: "rgba(52, 152, 219, 0.35)", text: "#3498db" },
  B2: { bg: "rgba(155, 89, 182, 0.15)", border: "rgba(155, 89, 182, 0.35)", text: "#9b59b6" },
  C1: { bg: "rgba(230, 126, 34, 0.15)", border: "rgba(230, 126, 34, 0.35)", text: "#e67e22" },
  C2: { bg: "rgba(231, 76, 60, 0.15)",  border: "rgba(231, 76, 60, 0.35)",  text: "#e74c3c" },
};

function CefrBadge({ level }) {
  const lvl = (level || "B2").toUpperCase();
  const style = CEFR_COLORS[lvl] || CEFR_COLORS.B2;
  return (
    <span
      className="cefr-badge"
      style={{
        background: style.bg,
        borderColor: style.border,
        color: style.text,
      }}
    >
      {lvl}
    </span>
  );
}

/* ─── Word Family Row ─── */
function WordFamilyRow({ entry, onTranslated }) {
  const [loading, setLoading] = useState(false);

  async function handleTranslate() {
    setLoading(true);
    try {
      const res = await fetch("/api/ai/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: entry.word, pos: entry.pos, action: "translate_vi" }),
      });
      const data = await res.json();
      const vi = data.meaning_vi || data.definition_vi || null;
      if (vi) onTranslated(entry.word, vi);
    } catch (e) {
      console.error("Translate error", e);
    }
    setLoading(false);
  }

  return (
    <div className="word-family-row">
      <span className="wf-pos-badge">{getPosAbbrev(entry.pos)}</span>
      <div className="wf-main">
        <span className="wf-word">{entry.word}</span>
        <span className="wf-meaning-en">{entry.meaning_en}</span>
        {entry.is_translated && entry.meaning_vi && (
          <span className="wf-meaning-vi">→ {entry.meaning_vi}</span>
        )}
      </div>
      {!entry.is_translated && (
        <button
          className="btn-translate"
          onClick={handleTranslate}
          disabled={loading}
          title="Dịch sang tiếng Việt"
        >
          {loading ? <Loader2 size={11} className="spin" /> : <Languages size={11} />}
          {loading ? "" : "Dịch"}
        </button>
      )}
    </div>
  );
}

/* ─── SRS Reading Modal ─── */
function ReadingModal({ passage, onClose }) {
  const [answers, setAnswers] = useState({});
  const [revealed, setRevealed] = useState({});

  if (!passage) return null;

  function renderPassage(text, words) {
    if (!words || words.length === 0) return text;
    const pattern = new RegExp(`\\b(${words.map(w => w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")).join("|")})\\b`, "gi");
    const parts = text.split(pattern);
    return parts.map((part, i) =>
      pattern.test(part)
        ? <mark key={i} className="vocab-highlight">{part}</mark>
        : part
    );
  }

  return (
    <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="reading-modal">
        <div className="reading-modal-header">
          <div>
            <h2 className="reading-modal-title">{passage.title}</h2>
            <span className="reading-topic-badge">{passage.topic}</span>
          </div>
          <button className="btn-close-modal" onClick={onClose}><X size={18} /></button>
        </div>

        <div className="reading-modal-body">
          <div className="used-words-bar">
            <span className="used-words-label"><Layers size={12} /> Từ vựng trong bài:</span>
            {passage.highlighted_words?.map(w => (
              <span key={w} className="used-word-chip">{w}</span>
            ))}
          </div>

          <div className="reading-passage">
            <p className="passage-text">
              {renderPassage(passage.passage, passage.highlighted_words)}
            </p>
          </div>

          {passage.questions?.length > 0 && (
            <div className="reading-questions">
              <h3 className="qs-title">Câu hỏi hiểu bài</h3>
              {passage.questions.map((q, i) => (
                <div key={i} className="reading-q-block">
                  <div className="q-type-badge">{q.type === "vocabulary" ? "📚 Từ vựng" : q.type === "inference" ? "🔍 Suy luận" : "📖 Hiểu bài"}</div>
                  <p className="q-text"><strong>{i + 1}.</strong> {q.q}</p>
                  <textarea
                    className="textarea-field"
                    rows={2}
                    placeholder="Viết câu trả lời của bạn..."
                    value={answers[i] || ""}
                    onChange={(e) => setAnswers(a => ({ ...a, [i]: e.target.value }))}
                  />
                  {revealed[i] ? (
                    <div className="q-answer-reveal">
                      <strong>Gợi ý đáp án:</strong> {q.answer}
                    </div>
                  ) : (
                    <button className="btn-reveal" onClick={() => setRevealed(r => ({ ...r, [i]: true }))}>
                      Xem đáp án
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}

          {passage.writing_prompt && (
            <div className="writing-prompt-box">
              <div className="wp-header"><BookText size={14} /> Bài tập Writing</div>
              <p className="wp-text">{passage.writing_prompt}</p>
              <textarea
                className="textarea-field"
                rows={5}
                placeholder="Viết đoạn văn của bạn tại đây (dùng tối đa những từ được highlight)..."
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

/* ─── Single Vocab Card ─── */
function VocabCard({ item, loadingId, setLoadingId, onUpdate, onDelete, supabase, selected, onToggleSelect }) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const [cloze, setCloze] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const isLoading = loadingId === item.id;
  const isDue = item.due_date && item.due_date <= new Date().toISOString();
  const wordFamily = item.word_family || [];

  async function handleDelete(e) {
    e.stopPropagation();
    if (!window.confirm(`Bạn có chắc chắn muốn xóa từ "${item.word}"?`)) return;
    setDeleting(true);
    await onDelete(item.id);
  }

  async function handleTranslateFamily(targetWord, meaningVi) {
    const newFamily = wordFamily.map(f =>
      f.word === targetWord ? { ...f, meaning_vi: meaningVi, is_translated: true } : f
    );
    await supabase.from("vocabulary").update({ word_family: newFamily }).eq("id", item.id);
    onUpdate(item.id, { word_family: newFamily });
  }

  async function handleSubmitFeynman() {
    setLoadingId(item.id);
    try {
      const res = await fetch("/api/ai/feynman", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: item.word, definition_en: item.definition_en, explanation }),
      });
      const result = await res.json();
      if (result.score !== undefined) {
        let q = 0;
        if (result.score >= 85) q = 5;
        else if (result.score >= 70) q = 4;
        else if (result.score >= 50) q = 2;
        handleSM2(q, result);
      } else {
        alert("Không chấm được, vui lòng thử lại.");
      }
    } catch (e) {
      alert("Lỗi kết nối, vui lòng thử lại.");
    }
    setLoadingId(null);
  }

  async function handleGenerateCloze() {
    setLoadingId(item.id);
    setCloze(null);
    try {
      const res = await fetch("/api/ai/cloze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: item.word, definition_en: item.definition_en, example_en: item.example_en }),
      });
      const result = await res.json();
      if (result.exercises) setCloze(result.exercises);
      else alert("Không tạo được bài tập.");
    } catch (e) {
      alert("Lỗi kết nối.");
    }
    setLoadingId(null);
  }

  async function handleSM2(q, feynmanResult = null) {
    const { newEF, newInterval, newReps, dueDate, status } = sm2(
      q, item.ease_factor || 2.5, item.repetitions || 0, item.interval_days || 1
    );
    const updates = { ease_factor: newEF, interval_days: newInterval, repetitions: newReps, due_date: dueDate, status };
    if (feynmanResult) updates.last_feedback = { score: feynmanResult.score, feedback: feynmanResult.feedback };
    try {
      await supabase.from("vocabulary").update(updates).eq("id", item.id);
      onUpdate(item.id, updates);
    } catch (e) {
      alert("Lỗi lưu kết quả.");
    }
  }

  const isActive = item.status === "active";

  return (
    <div className={`card vocab-card ${selected ? "vocab-card-selected" : ""} ${deleting ? "deleting" : ""}`}>
      <div className="vocab-card-head" onClick={() => setOpen(o => !o)}>
        <div className="vocab-head-left">
          <button
            className="vocab-checkbox"
            onClick={(e) => { e.stopPropagation(); onToggleSelect(item.id); }}
            title={selected ? "Bỏ chọn" : "Chọn để tạo bài đọc"}
          >
            {selected
              ? <CheckSquare size={16} color="var(--jade)" />
              : <Square size={16} color="var(--text-soft)" />}
          </button>
          <button
            className="btn-speak"
            onClick={(e) => { e.stopPropagation(); speak(item.word, 0.85, "en-GB"); }}
            title="Nghe phát âm"
          >
            <Volume2 size={14} />
          </button>
          <span className="vocab-word">{item.word}</span>
          {item.ipa && <span className="vocab-ipa">{item.ipa}</span>}
          <span className="pos-tag">{item.pos || "Danh từ"}</span>
          <CefrBadge level={item.cefr_level || "B2"} />
        </div>
        <div className="vocab-head-right">
          <Badge tone={isActive ? "active" : "passive"}>
            {isActive ? "Chủ động" : "Thụ động"}
          </Badge>
          {isDue && <Badge tone="due">Cần ôn</Badge>}
          <button
            className="btn-delete-word"
            onClick={handleDelete}
            disabled={deleting}
            title="Xóa từ này"
          >
            {deleting ? <Loader2 size={14} className="spin" /> : <Trash2 size={14} />}
          </button>
          {open ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </div>

      {open && (
        <div className="vocab-card-body">
          <p className="def-en"><strong>Definition:</strong> {item.definition_en}</p>
          <p className="def-en"><strong>Example:</strong> {item.example_en}</p>
          {item.synonyms?.length > 0 && (
            <p className="def-en small-note">Synonyms: {item.synonyms.join(", ")}</p>
          )}
          {item.vocab_type_reason && (
            <p className="vocab-type-reason">
              <span className={`type-dot ${isActive ? "dot-active" : "dot-passive"}`} />
              {item.vocab_type_reason}
            </p>
          )}

          {/* Word Family */}
          {wordFamily.length > 0 && (
            <div className="word-family-section">
              <div className="wf-header">
                <BookOpen size={13} /> Word Family
              </div>
              <div className="word-family-list">
                {wordFamily.map((entry, i) => (
                  <WordFamilyRow
                    key={i}
                    entry={entry}
                    onTranslated={handleTranslateFamily}
                  />
                ))}
              </div>
            </div>
          )}

          {/* SM-2 Review */}
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

          {cloze && (
            <div style={{ marginTop: 12, padding: 12, background: "var(--ink-3)", borderRadius: 8, borderLeft: "3px solid var(--jade)" }}>
              <strong style={{ fontSize: 12, color: "var(--jade-light)" }}>Contextual Cloze Test</strong>
              {cloze.map((c, i) => (
                <div key={i} style={{ marginTop: 8, fontSize: 13 }}>
                  <p><strong>{i + 1}.</strong> {c.sentence}</p>
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
        </div>
      )}
    </div>
  );
}

/* ─── Day Group Header ─── */
function DayGroupHeader({ dateStr, count, dueCount }) {
  const label = (() => {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    if (dateStr === today) return "Hôm nay";
    if (dateStr === yesterday) return "Hôm qua";
    return fmtDate(dateStr);
  })();

  return (
    <div className="day-group-header">
      <span className="day-label">{label}</span>
      <span className="day-count">{count} từ</span>
      {dueCount > 0 && <span className="day-due-badge">{dueCount} cần ôn</span>}
    </div>
  );
}

/* ─── Vocab Tab Main Component ─── */
import { useApp } from "@/context/AppContext";

export function VocabTab({ vocabList, setVocabList }) {
  const { supabase, userId, onActivityDone, showToast } = useApp();
  const [word, setWord] = useState("");
  const [filter, setFilter] = useState("all");
  const [groupByDay, setGroupByDay] = useState(false);
  const [loadingId, setLoadingId] = useState(null);
  const [addingWord, setAddingWord] = useState(false);
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [readingLoading, setReadingLoading] = useState(false);
  const [readingPassage, setReadingPassage] = useState(null);
  const [duplicateWarning, setDuplicateWarning] = useState("");

  /* Check & Add Word — Auto AI analysis & Duplicate rejection */
  async function addWord() {
    if (!word.trim() || addingWord) return;
    const trimmed = word.trim();

    // Check duplicate
    const isDuplicate = vocabList.some(
      v => v.word.toLowerCase() === trimmed.toLowerCase()
    );
    if (isDuplicate) {
      setDuplicateWarning(`Từ "${trimmed}" đã có trong danh sách từ vựng của bạn!`);
      setTimeout(() => setDuplicateWarning(""), 4000);
      return;
    }

    setDuplicateWarning("");
    setAddingWord(true);
    setWord("");

    // Create item placeholder
    const placeholder = {
      user_id: userId,
      word: trimmed,
      pos: "Danh từ",
      cefr_level: "B2",
      status: "passive",
      definition_en: "",
      example_en: "",
      synonyms: [],
      word_family: [],
      vocab_type_reason: "",
      srs_level: 0,
      ease_factor: 2.5,
      interval_days: 1,
      repetitions: 0,
      due_date: null,
      last_feedback: null,
      study_date: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    };

    const { data: inserted, error: insertErr } = await supabase
      .from("vocabulary")
      .insert({ ...placeholder })
      .select()
      .single();

    const tempId = inserted?.id || crypto.randomUUID();
    const tempItem = { ...placeholder, id: tempId };

    setVocabList(prev => [tempItem, ...prev]);

    // Call AI to analyze POS, CEFR level, active/passive & word family
    try {
      const res = await fetch("/api/ai/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmed }),
      });
      const result = await res.json();

      if (result.definition_en) {
        const updates = {
          definition_en: result.definition_en || "",
          example_en: result.example_en || "",
          synonyms: result.synonyms || [],
          ipa: result.ipa || "",
          pos: result.pos_detected || "Danh từ",
          cefr_level: result.cefr_level || "B2",
          status: result.vocab_type === "active" ? "active" : "passive",
          vocab_type_reason: result.vocab_type_reason || "",
          word_family: result.word_family || [],
        };

        await supabase.from("vocabulary").update(updates).eq("id", tempId);
        setVocabList(prev => prev.map(v => v.id === tempId ? { ...v, ...updates } : v));
        // Fire gamification (+5 XP per word)
        if (onActivityDone) onActivityDone("vocab");
      }
    } catch (e) {
      console.error("AI enrich failed", e);
    }

    setAddingWord(false);
  }

  /* Delete word */
  async function handleDeleteWord(id) {
    try {
      await supabase.from("vocabulary").delete().eq("id", id);
      setVocabList(prev => prev.filter(v => v.id !== id));
      setSelectedIds(prev => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    } catch (e) {
      showToast("Lỗi khi xóa từ.", "error");
    }
  }

  /* Clean all duplicate words in DB */
  async function handleCleanDuplicates() {
    const seen = new Set();
    const toDeleteIds = [];

    vocabList.forEach(v => {
      const norm = v.word.toLowerCase();
      if (seen.has(norm)) {
        toDeleteIds.push(v.id);
      } else {
        seen.add(norm);
      }
    });

    if (toDeleteIds.length === 0) {
      showToast("Không có từ nào bị trùng lặp!");
      return;
    }

    if (!window.confirm(`Tìm thấy ${toDeleteIds.length} từ trùng lặp. Bạn có muốn xóa chúng không?`)) return;

    try {
      await supabase.from("vocabulary").delete().in("id", toDeleteIds);
      setVocabList(prev => prev.filter(v => !toDeleteIds.includes(v.id)));
      showToast(`Đã dọn dẹp ${toDeleteIds.length} từ trùng lặp!`, "success");
    } catch (e) {
      showToast("Lỗi khi dọn từ trùng.", "error");
    }
  }

  function handleUpdateLocal(id, updates) {
    setVocabList(prev => prev.map(v => v.id === id ? { ...v, ...updates } : v));
  }

  function toggleSelect(id) {
    setSelectedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  /* Generate SRS reading passage */
  async function handleGenerateReading() {
    if (selectedIds.size === 0 || readingLoading) return;
    setReadingLoading(true);
    const selectedWords = vocabList
      .filter(v => selectedIds.has(v.id))
      .map(v => v.word);
    try {
      const res = await fetch("/api/ai/vocab-reading", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ words: selectedWords, level: "Band 6.5" }),
      });
      const data = await res.json();
      if (data.passage) setReadingPassage(data);
      else alert("Không tạo được bài đọc, thử lại.");
    } catch (e) {
      alert("Lỗi kết nối.");
    }
    setReadingLoading(false);
  }

  /* Filter logic */
  const filtered = useMemo(() => {
    return vocabList.filter(v => {
      if (filter === "all") return true;
      if (filter === "due") return v.due_date && v.due_date <= new Date().toISOString();
      return v.status === filter;
    });
  }, [vocabList, filter]);

  /* Detect duplicates count */
  const duplicateCount = useMemo(() => {
    const counts = {};
    vocabList.forEach(v => {
      const norm = v.word.toLowerCase();
      counts[norm] = (counts[norm] || 0) + 1;
    });
    return Object.values(counts).filter(c => c > 1).reduce((a, b) => a + (b - 1), 0);
  }, [vocabList]);

  /* Group by study date */
  const grouped = useMemo(() => {
    if (!groupByDay) return null;
    const map = {};
    filtered.forEach(v => {
      const key = v.study_date || v.created_at?.slice(0, 10) || "unknown";
      if (!map[key]) map[key] = [];
      map[key].push(v);
    });
    return Object.entries(map).sort((a, b) => b[0].localeCompare(a[0]));
  }, [filtered, groupByDay]);

  const dueCount = vocabList.filter(v => v.due_date && v.due_date <= new Date().toISOString()).length;

  return (
    <div className="panel">
      {/* ─── Add Word Form (Manual POS dropdown removed, auto AI analysis) ─── */}
      <div className="card form-row">
        <input
          className="input-field"
          style={{ flex: 1 }}
          placeholder="Nhập từ mới (vd: meticulous, Ubiquitous, Paraphrase)"
          value={word}
          onChange={(e) => { setWord(e.target.value); setDuplicateWarning(""); }}
          onKeyDown={(e) => e.key === "Enter" && addWord()}
          disabled={addingWord}
        />
        <button className="btn-primary" onClick={addWord} disabled={addingWord || !word.trim()}>
          {addingWord
            ? <><Loader2 size={14} className="spin" /> Đang phân tích AI...</>
            : <><Sparkles size={14} /> Thêm & Phân tích AI</>}
        </button>
      </div>

      {duplicateWarning && (
        <div className="duplicate-warning-banner">
          ⚠️ {duplicateWarning}
        </div>
      )}

      {addingWord && (
        <div className="ai-analyzing-bar">
          <Loader2 size={13} className="spin" />
          AI đang tự động xác định: Loại từ (POS), Cấp độ CEFR (A1-C2), Chủ động/Thụ động & Word Family...
        </div>
      )}

      {/* ─── Filter & View Toggle Bar ─── */}
      <div className="filter-bar" style={{ marginTop: 20 }}>
        <div className="sub-tab-row">
          <button className={`chip ${filter === "all" ? "chip-active" : ""}`} onClick={() => setFilter("all")}>
            Tất cả ({vocabList.length})
          </button>
          <button className={`chip ${filter === "due" ? "chip-active" : ""}`} onClick={() => setFilter("due")}>
            Cần ôn ({dueCount})
          </button>
          <button className={`chip ${filter === "active" ? "chip-active" : ""}`} onClick={() => setFilter("active")}>
            Chủ động
          </button>
          <button className={`chip ${filter === "passive" ? "chip-active" : ""}`} onClick={() => setFilter("passive")}>
            Thụ động
          </button>
        </div>

        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          {duplicateCount > 0 && (
            <button
              className="chip chip-warn"
              onClick={handleCleanDuplicates}
              title="Xóa các từ trùng lặp"
            >
              🧹 Dọn {duplicateCount} từ trùng
            </button>
          )}
          <button
            className={`chip ${groupByDay ? "chip-active" : ""}`}
            onClick={() => setGroupByDay(g => !g)}
            title="Nhóm theo ngày học"
          >
            <Layers size={13} /> Theo ngày
          </button>
        </div>
      </div>

      {/* ─── Vocab List ─── */}
      <div className="vocab-list">
        {filtered.length === 0 ? (
          <EmptyState text="Danh sách từ vựng trống." />
        ) : groupByDay && grouped ? (
          grouped.map(([dateStr, items]) => (
            <div key={dateStr} className="day-group">
              <DayGroupHeader
                dateStr={dateStr}
                count={items.length}
                dueCount={items.filter(v => v.due_date && v.due_date <= new Date().toISOString()).length}
              />
              {items.map(item => (
                <VocabCard
                  key={item.id}
                  item={item}
                  loadingId={loadingId}
                  setLoadingId={setLoadingId}
                  onUpdate={handleUpdateLocal}
                  onDelete={handleDeleteWord}
                  supabase={supabase}
                  selected={selectedIds.has(item.id)}
                  onToggleSelect={toggleSelect}
                />
              ))}
            </div>
          ))
        ) : (
          filtered.map(item => (
            <VocabCard
              key={item.id}
              item={item}
              loadingId={loadingId}
              setLoadingId={setLoadingId}
              onUpdate={handleUpdateLocal}
              onDelete={handleDeleteWord}
              supabase={supabase}
              selected={selectedIds.has(item.id)}
              onToggleSelect={toggleSelect}
            />
          ))
        )}
      </div>

      {/* ─── Floating Reading Generator Bar ─── */}
      {selectedIds.size > 0 && (
        <div className="floating-reading-bar">
          <span className="floating-count">
            <CheckSquare size={14} /> {selectedIds.size} từ đã chọn
          </span>
          <button
            className="btn-generate-reading"
            onClick={handleGenerateReading}
            disabled={readingLoading}
          >
            {readingLoading
              ? <><Loader2 size={14} className="spin" /> Đang tạo bài đọc...</>
              : <><BookText size={14} /> Tạo bài đọc SRS</>}
          </button>
          <button className="btn-clear-sel" onClick={() => setSelectedIds(new Set())}>
            <X size={14} />
          </button>
        </div>
      )}

      {/* ─── Reading Modal ─── */}
      {readingPassage && (
        <ReadingModal
          passage={readingPassage}
          onClose={() => setReadingPassage(null)}
        />
      )}
    </div>
  );
}
