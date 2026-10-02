"use client";

import { useState, useEffect, useRef } from "react";
import {
  BookPlus,
  Volume2,
  Sparkles,
  CheckCircle2,
  X,
  Search,
  BookmarkCheck,
  Loader2,
  AlertCircle,
} from "lucide-react";
import { speak } from "@/lib/utils";

function cleanWord(str) {
  if (!str) return "";
  // Remove leading/trailing punctuation and whitespace
  return str.trim().replace(/^[^a-zA-Z0-9]+|[^a-zA-Z0-9]+$/g, "");
}

export function QuickSelectionVocab({
  supabase,
  userId,
  vocabList = [],
  setVocabList,
  onActivityDone,
}) {
  const [contextMenu, setContextMenu] = useState(null); // { x, y, word }
  const [floatingPill, setFloatingPill] = useState(null); // { x, y, word }
  const [quickLookup, setQuickLookup] = useState(null); // { x, y, word, data, loading }
  const [toast, setToast] = useState(null); // { message, type }
  const toastTimeoutRef = useRef(null);

  function showToast(message, type = "info", duration = 3500) {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setToast({ message, type });
    toastTimeoutRef.current = setTimeout(() => {
      setToast(null);
    }, duration);
  }

  // ─── 1. GLOBAL CONTEXT MENU (RIGHT-CLICK) ───
  useEffect(() => {
    function handleContextMenu(e) {
      const selection = window.getSelection();
      const rawText = selection ? selection.toString() : "";
      const word = cleanWord(rawText);

      // Only trigger if user selected text (1 to 5 words, max 50 chars)
      if (word && word.length >= 2 && word.length <= 50 && word.split(/\s+/).length <= 5) {
        e.preventDefault();
        setFloatingPill(null); // hide floating pill if context menu opened

        // Adjust position so it doesn't overflow viewport
        const x = Math.min(e.clientX, window.innerWidth - 220);
        const y = Math.min(e.clientY, window.innerHeight - 180);

        setContextMenu({ x, y, word, rawText: rawText.trim() });
      } else {
        setContextMenu(null);
      }
    }

    function handleClickOutside(e) {
      // Close context menu if clicked outside
      if (!e.target.closest(".custom-context-menu") && !e.target.closest(".custom-lookup-modal")) {
        setContextMenu(null);
      }
      if (!e.target.closest(".floating-selection-pill") && !e.target.closest(".custom-lookup-modal")) {
        setFloatingPill(null);
      }
    }

    window.addEventListener("contextmenu", handleContextMenu);
    window.addEventListener("mousedown", handleClickOutside);

    return () => {
      window.removeEventListener("contextmenu", handleContextMenu);
      window.removeEventListener("mousedown", handleClickOutside);
    };
  }, []);

  // ─── 2. FLOATING SELECTION TOOLTIP ON MOUSE UP ───
  useEffect(() => {
    function handleMouseUp(e) {
      // Ignore if clicking on buttons, inputs, context menus
      if (
        e.target.closest("input") ||
        e.target.closest("textarea") ||
        e.target.closest("button") ||
        e.target.closest(".custom-context-menu") ||
        e.target.closest(".custom-lookup-modal") ||
        e.target.closest(".floating-selection-pill")
      ) {
        return;
      }

      setTimeout(() => {
        const selection = window.getSelection();
        const rawText = selection ? selection.toString() : "";
        const word = cleanWord(rawText);

        if (
          word &&
          word.length >= 2 &&
          word.length <= 40 &&
          word.split(/\s+/).length <= 4 &&
          selection.rangeCount > 0
        ) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();

          if (rect.width > 0 && rect.height > 0) {
            const x = Math.max(10, Math.min(rect.left + rect.width / 2, window.innerWidth - 160));
            const y = Math.max(10, rect.top - 42); // float right above selection
            setFloatingPill({ x, y, word });
          }
        } else {
          setFloatingPill(null);
        }
      }, 100);
    }

    document.addEventListener("mouseup", handleMouseUp);
    return () => document.removeEventListener("mouseup", handleMouseUp);
  }, []);

  // ─── 3. ACTION: SAVE WORD TO VOCABULARY & SM-2 ───
  async function handleAddWord(targetWord) {
    setContextMenu(null);
    setFloatingPill(null);
    const trimmed = cleanWord(targetWord);
    if (!trimmed) return;

    // Check duplicate in vocabList
    const isDuplicate = vocabList.some(
      (v) => (v.word || "").toLowerCase() === trimmed.toLowerCase()
    );

    if (isDuplicate) {
      showToast(`Từ "${trimmed}" đã có trong sổ từ vựng của bạn!`, "warning");
      return;
    }

    showToast(`Đang lưu "${trimmed}" và AI đang phân tích...`, "info", 5000);

    const placeholder = {
      user_id: userId,
      word: trimmed,
      pos: "",
      cefr_level: "",
      ipa: "",
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

    let tempId = crypto.randomUUID();

    if (supabase && userId) {
      const { data: inserted } = await supabase
        .from("vocabulary")
        .insert({ ...placeholder })
        .select()
        .single();
      if (inserted?.id) tempId = inserted.id;
    }

    const tempItem = { ...placeholder, id: tempId };
    setVocabList((prev) => [tempItem, ...prev]);

    // AI Enrichment
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

        if (supabase && userId) {
          await supabase.from("vocabulary").update(updates).eq("id", tempId);
        }

        setVocabList((prev) =>
          prev.map((v) => (v.id === tempId ? { ...v, ...updates } : v))
        );

        if (onActivityDone) onActivityDone("vocab");

        showToast(
          `🎉 Đã thêm "${trimmed}" (${result.pos_detected || "Từ"} · ${result.cefr_level || "B2"}) vào sổ từ vựng (+5 XP)!`,
          "success",
          4000
        );
      } else {
        showToast(`Đã lưu "${trimmed}" vào sổ từ vựng.`, "success");
      }
    } catch (e) {
      console.error(e);
      showToast(`Đã lưu "${trimmed}" (chưa kịp phân tích AI).`, "info");
    }
  }

  // ─── 4. ACTION: QUICK LOOKUP WITH AI POPUP ───
  async function handleQuickLookup(targetWord, e) {
    const trimmed = cleanWord(targetWord);
    if (!trimmed) return;

    setContextMenu(null);
    setFloatingPill(null);

    const x = Math.min(e ? e.clientX : window.innerWidth / 2 - 160, window.innerWidth - 340);
    const y = Math.min(e ? e.clientY : window.innerHeight / 2 - 120, window.innerHeight - 300);

    setQuickLookup({ x, y, word: trimmed, data: null, loading: true });

    try {
      const res = await fetch("/api/ai/vocab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ word: trimmed }),
      });
      const data = await res.json();
      setQuickLookup((p) => (p ? { ...p, data, loading: false } : null));
    } catch (err) {
      setQuickLookup((p) =>
        p
          ? {
              ...p,
              loading: false,
              data: { definition_en: "Không thể tải nghĩa của từ lúc này." },
            }
          : null
      );
    }
  }

  return (
    <>
      {/* ─── FLOATING SELECTION PILL (Appears above highlighted text) ─── */}
      {floatingPill && !contextMenu && (
        <div
          className="floating-selection-pill"
          style={{
            position: "fixed",
            left: `${floatingPill.x}px`,
            top: `${floatingPill.y}px`,
            transform: "translateX(-50%)",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: 4,
            background: "rgba(18, 24, 27, 0.95)",
            backdropFilter: "blur(10px)",
            border: "1px solid rgba(218, 119, 86, 0.5)",
            borderRadius: 20,
            padding: "4px 8px",
            boxShadow: "0 8px 24px rgba(0, 0, 0, 0.5), 0 0 12px rgba(218, 119, 86, 0.25)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <button
            onClick={() => handleAddWord(floatingPill.word)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 5,
              background: "none",
              border: "none",
              color: "var(--jade-light)",
              fontSize: 12,
              fontWeight: 600,
              cursor: "pointer",
              padding: "3px 8px",
              borderRadius: 14,
            }}
            title="Lưu ngay từ này vào sổ từ vựng SM-2"
          >
            <BookPlus size={14} /> + Thêm từ
          </button>

          <span style={{ color: "var(--border-soft)", fontSize: 10 }}>|</span>

          <button
            onClick={() => speak(floatingPill.word)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 4,
              background: "none",
              border: "none",
              color: "var(--amber)",
              fontSize: 12,
              cursor: "pointer",
              padding: "3px 6px",
              borderRadius: 14,
            }}
            title="Phát âm"
          >
            <Volume2 size={13} />
          </button>
        </div>
      )}

      {/* ─── CUSTOM RIGHT-CLICK CONTEXT MENU ─── */}
      {contextMenu && (
        <div
          className="custom-context-menu"
          style={{
            position: "fixed",
            left: `${contextMenu.x}px`,
            top: `${contextMenu.y}px`,
            zIndex: 10000,
            minWidth: 200,
            background: "rgba(22, 30, 32, 0.98)",
            backdropFilter: "blur(14px)",
            border: "1px solid rgba(218, 119, 86, 0.4)",
            borderRadius: 10,
            padding: "6px",
            boxShadow: "0 10px 30px rgba(0,0,0,0.6), 0 0 15px rgba(218, 119, 86, 0.2)",
            animation: "fadeIn 0.15s ease",
          }}
        >
          <div
            style={{
              padding: "6px 10px 8px",
              borderBottom: "1px solid var(--border-soft)",
              marginBottom: 4,
            }}
          >
            <div style={{ fontSize: 10.5, color: "var(--text-soft)", textTransform: "uppercase" }}>
              Từ đang chọn
            </div>
            <div
              style={{
                fontSize: 13.5,
                fontWeight: 700,
                color: "var(--jade-light)",
                overflow: "hidden",
                textOverflow: "ellipsis",
                whiteSpace: "nowrap",
                maxWidth: 180,
              }}
            >
              &ldquo;{contextMenu.word}&rdquo;
            </div>
          </div>

          <button
            className="context-menu-item"
            onClick={() => handleAddWord(contextMenu.word)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              fontSize: 13,
              fontWeight: 600,
              color: "var(--text-bright)",
              background: "none",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(218, 119, 86, 0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <BookPlus size={15} style={{ color: "var(--jade-light)" }} />
            Thêm vào Sổ Từ Vựng
          </button>

          <button
            className="context-menu-item"
            onClick={(e) => handleQuickLookup(contextMenu.word, e)}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              fontSize: 13,
              color: "var(--text-bright)",
              background: "none",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(218, 119, 86, 0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Search size={15} style={{ color: "var(--amber)" }} />
            Tra cứu nhanh (AI)
          </button>

          <button
            className="context-menu-item"
            onClick={() => {
              speak(contextMenu.word);
              setContextMenu(null);
            }}
            style={{
              width: "100%",
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "8px 10px",
              fontSize: 13,
              color: "var(--text-soft)",
              background: "none",
              border: "none",
              borderRadius: 6,
              cursor: "pointer",
              textAlign: "left",
              transition: "background 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(218, 119, 86, 0.2)")}
            onMouseLeave={(e) => (e.currentTarget.style.background = "none")}
          >
            <Volume2 size={15} style={{ color: "var(--text-soft)" }} />
            Nghe phát âm
          </button>
        </div>
      )}

      {/* ─── QUICK LOOKUP CARD (AI DICTIONARY POPUP) ─── */}
      {quickLookup && (
        <div
          className="custom-lookup-modal"
          style={{
            position: "fixed",
            left: `${quickLookup.x}px`,
            top: `${quickLookup.y}px`,
            zIndex: 10001,
            width: 320,
            maxHeight: 400,
            overflowY: "auto",
            background: "rgba(20, 26, 29, 0.98)",
            backdropFilter: "blur(16px)",
            border: "1px solid rgba(218, 119, 86, 0.5)",
            borderRadius: 12,
            padding: "16px",
            boxShadow: "0 12px 36px rgba(0,0,0,0.6), 0 0 20px rgba(218, 119, 86, 0.3)",
            animation: "fadeIn 0.2s ease",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
            <div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <h4 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: "var(--text-bright)" }}>
                  {quickLookup.word}
                </h4>
                <button
                  onClick={() => speak(quickLookup.word)}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--amber)",
                    cursor: "pointer",
                    padding: "2px",
                    display: "flex",
                    alignItems: "center",
                  }}
                >
                  <Volume2 size={16} />
                </button>
              </div>
              {quickLookup.data?.ipa && (
                <span style={{ fontSize: 12, color: "var(--text-soft)", fontFamily: "IBM Plex Mono" }}>
                  {quickLookup.data.ipa}
                </span>
              )}
            </div>

            <button
              onClick={() => setQuickLookup(null)}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-soft)",
                cursor: "pointer",
                padding: "2px",
              }}
            >
              <X size={16} />
            </button>
          </div>

          {quickLookup.loading ? (
            <div style={{ padding: "20px 0", textAlign: "center", color: "var(--text-soft)", fontSize: 13 }}>
              <Loader2 size={20} className="spinner" style={{ margin: "0 auto 8px" }} />
              Đang tra cứu từ điển AI...
            </div>
          ) : quickLookup.data ? (
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {quickLookup.data.pos_detected && (
                  <span className="chip chip-active" style={{ fontSize: 11, background: "var(--jade)", padding: "2px 8px" }}>
                    {quickLookup.data.pos_detected}
                  </span>
                )}
                {quickLookup.data.cefr_level && (
                  <span className="chip" style={{ fontSize: 11, padding: "2px 8px" }}>
                    CEFR: {quickLookup.data.cefr_level}
                  </span>
                )}
              </div>

              {quickLookup.data.definition_en && (
                <div style={{ fontSize: 13, color: "var(--text-bright)", lineHeight: 1.5 }}>
                  <strong style={{ color: "var(--jade-light)" }}>Định nghĩa:</strong> {quickLookup.data.definition_en}
                </div>
              )}

              {quickLookup.data.example_en && (
                <div style={{ fontSize: 12.5, color: "var(--text-soft)", fontStyle: "italic", lineHeight: 1.4 }}>
                  &ldquo;{quickLookup.data.example_en}&rdquo;
                </div>
              )}

              <button
                className="btn-primary"
                onClick={() => {
                  handleAddWord(quickLookup.word);
                  setQuickLookup(null);
                }}
                style={{
                  width: "100%",
                  padding: "8px",
                  fontSize: 13,
                  fontWeight: 600,
                  marginTop: 6,
                }}
              >
                <BookPlus size={14} /> Lưu vào Sổ Từ Vựng (+5 XP)
              </button>
            </div>
          ) : null}
        </div>
      )}

      {/* ─── TOAST NOTIFICATION ─── */}
      {toast && (
        <div
          style={{
            position: "fixed",
            bottom: "24px",
            right: "24px",
            zIndex: 10002,
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "12px 18px",
            borderRadius: 8,
            background:
              toast.type === "success"
                ? "rgba(26, 44, 38, 0.95)"
                : toast.type === "warning"
                ? "rgba(44, 36, 20, 0.95)"
                : "rgba(22, 30, 32, 0.95)",
            border:
              toast.type === "success"
                ? "1px solid var(--jade)"
                : toast.type === "warning"
                ? "1px solid var(--amber)"
                : "1px solid var(--border-soft)",
            boxShadow: "0 10px 30px rgba(0,0,0,0.5)",
            color: "var(--text-bright)",
            fontSize: 13.5,
            fontWeight: 500,
            animation: "fadeIn 0.2s ease",
          }}
        >
          {toast.type === "success" && <CheckCircle2 size={18} style={{ color: "var(--jade-light)", flexShrink: 0 }} />}
          {toast.type === "warning" && <AlertCircle size={18} style={{ color: "var(--amber)", flexShrink: 0 }} />}
          {toast.type === "info" && <Loader2 size={18} className="spinner" style={{ color: "var(--jade-light)", flexShrink: 0 }} />}
          <span>{toast.message}</span>
        </div>
      )}
    </>
  );
}
