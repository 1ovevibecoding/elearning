import React, { useState, useEffect, useRef } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from "recharts";
import {
  LayoutDashboard, BookOpen, Mic, PenLine, Plus, Volume2, RotateCcw,
  CheckCircle2, XCircle, Loader2, Trash2, Play, Square, Sparkles,
  ChevronDown, ChevronUp, Flame, Target,
} from "lucide-react";

/* ------------------------------------------------------------------ */
/* Constants                                                          */
/* ------------------------------------------------------------------ */

const POS_OPTIONS = ["Danh từ", "Động từ", "Tính từ", "Khác"];
const LEVEL_OPTIONS = ["Band 5.0–5.5", "Band 6.0–6.5", "Band 7.0+"];
const TASK_TYPES = ["Task 1", "Task 2"];
const SPEAKING_PARTS = ["Part 1", "Part 2", "Part 3"];
const SRS_INTERVALS = [1, 3, 7, 14, 30, 60];

/* ------------------------------------------------------------------ */
/* Small utilities                                                    */
/* ------------------------------------------------------------------ */

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}

function normalizeWords(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function lcsAccuracy(target, spoken) {
  const a = normalizeWords(target);
  const b = normalizeWords(spoken);
  if (a.length === 0) return 0;
  const dp = Array.from({ length: a.length + 1 }, () => new Array(b.length + 1).fill(0));
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] = a[i - 1] === b[j - 1] ? dp[i - 1][j - 1] + 1 : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return Math.round((dp[a.length][b.length] / a.length) * 100);
}

/* ------------------------------------------------------------------ */
/* Storage helpers (persisted per Claude account)                     */
/* ------------------------------------------------------------------ */

async function loadKey(key, fallback) {
  try {
    const res = await window.storage.get(key, false);
    return res && res.value ? JSON.parse(res.value) : fallback;
  } catch (e) {
    return fallback;
  }
}

async function saveKey(key, value) {
  try {
    await window.storage.set(key, JSON.stringify(value), false);
  } catch (e) {
    console.error("Storage save failed:", key, e);
  }
}

/* ------------------------------------------------------------------ */
/* AI helper                                                          */
/* ------------------------------------------------------------------ */

async function askAI(system, user) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1000,
        system,
        messages: [{ role: "user", content: user }],
      }),
    });
    const data = await res.json();
    const text = (data.content || [])
      .filter((b) => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    const cleaned = text.replace(/```json|```/g, "").trim();
    return JSON.parse(cleaned);
  } catch (e) {
    console.error("AI call failed:", e);
    return null;
  }
}

/* ------------------------------------------------------------------ */
/* Speech recognition hook (dictation for shadowing & speaking)       */
/* ------------------------------------------------------------------ */

function useSpeechRecognition() {
  const [listening, setListening] = useState(false);
  const [transcript, setTranscript] = useState("");
  const recRef = useRef(null);
  const finalRef = useRef("");
  const supported =
    typeof window !== "undefined" && (window.SpeechRecognition || window.webkitSpeechRecognition);

  const start = () => {
    if (!supported) return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    rec.lang = "en-US";
    rec.continuous = true;
    rec.interimResults = true;
    finalRef.current = "";
    rec.onresult = (e) => {
      let interim = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const t = e.results[i][0].transcript;
        if (e.results[i].isFinal) finalRef.current += t + " ";
        else interim += t;
      }
      setTranscript((finalRef.current + " " + interim).trim());
    };
    rec.onerror = () => setListening(false);
    rec.onend = () => setListening(false);
    try {
      rec.start();
      recRef.current = rec;
      setListening(true);
    } catch (e) {
      setListening(false);
    }
  };

  const stop = () => {
    if (recRef.current) recRef.current.stop();
    setListening(false);
  };

  const reset = () => {
    finalRef.current = "";
    setTranscript("");
  };

  return { supported: !!supported, listening, transcript, start, stop, reset };
}

function speak(text, rate = 1) {
  if (!text || typeof window.speechSynthesis === "undefined") return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = "en-US";
  utter.rate = rate;
  window.speechSynthesis.speak(utter);
}

/* ------------------------------------------------------------------ */
/* Small shared UI bits                                               */
/* ------------------------------------------------------------------ */

function MarkerUnderline({ color = "var(--amber)", width = 100 }) {
  return (
    <svg className="marker-svg" width={width} height="10" viewBox="0 0 120 10" fill="none">
      <path
        d="M2 6C15 2 25 8 40 5C55 2 65 8 80 5C95 2 105 8 118 5"
        stroke={color}
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

function StatCard({ icon: Icon, label, value, accent }) {
  return (
    <div className="stat-card">
      <Icon size={18} className="stat-icon" style={{ color: accent }} />
      <div className="stat-value">{value}</div>
      <div className="stat-label">{label}</div>
    </div>
  );
}

function Badge({ tone, children }) {
  return <span className={`badge badge-${tone}`}>{children}</span>;
}

function Spinner({ label }) {
  return (
    <span className="spinner-row">
      <Loader2 size={15} className="spin" /> {label}
    </span>
  );
}

function EmptyState({ text }) {
  return <div className="empty-state">{text}</div>;
}

/* ------------------------------------------------------------------ */
/* Header + Tabs                                                      */
/* ------------------------------------------------------------------ */

function Header({ onReset }) {
  return (
    <header className="app-header">
      <div>
        <h1 className="app-title">
          Bàn Học <span className="marker-word">IELTS<MarkerUnderline /></span>
        </h1>
        <p className="app-subtitle">Từ vựng · Shadowing · Luyện kỹ năng — có AI đồng hành</p>
      </div>
      <button className="btn-ghost btn-reset" onClick={onReset} title="Xoá toàn bộ dữ liệu">
        <Trash2 size={15} /> Đặt lại
      </button>
    </header>
  );
}

function TabNav({ tab, setTab }) {
  const tabs = [
    { key: "dashboard", label: "Tổng quan", icon: LayoutDashboard },
    { key: "vocab", label: "Từ vựng", icon: BookOpen },
    { key: "shadowing", label: "Shadowing", icon: Mic },
    { key: "ielts", label: "Kỹ năng IELTS", icon: PenLine },
  ];
  return (
    <nav className="tab-nav">
      {tabs.map((t) => (
        <button
          key={t.key}
          className={`tab-btn ${tab === t.key ? "active" : ""}`}
          onClick={() => setTab(t.key)}
        >
          <t.icon size={16} />
          <span>{t.label}</span>
          {tab === t.key && <MarkerUnderline width={t.label.length * 8} />}
        </button>
      ))}
    </nav>
  );
}

/* ------------------------------------------------------------------ */
/* Dashboard                                                          */
/* ------------------------------------------------------------------ */

function Dashboard({ vocabList, shadowingHistory, writingHistory, speakingHistory, setTab }) {
  const totalVocab = vocabList.length;
  const activeVocab = vocabList.filter((v) => v.status === "active").length;
  const nowISO = new Date().toISOString();
  const dueToday = vocabList.filter((v) => v.dueDate && v.dueDate <= nowISO).length;
  const recentShadow = shadowingHistory.filter(
    (s) => Date.now() - new Date(s.date).getTime() < 7 * 86400000
  ).length;
  const lastWriting = writingHistory[writingHistory.length - 1];
  const lastSpeaking = speakingHistory[speakingHistory.length - 1];

  const writingChart = writingHistory.map((w, i) => ({ attempt: i + 1, band: w.band_overall }));
  const speakingChart = speakingHistory.map((s, i) => ({ attempt: i + 1, band: s.band_overall }));

  return (
    <div className="panel">
      <div className="stat-grid">
        <StatCard icon={BookOpen} label="Từ đã lưu" value={totalVocab} accent="var(--jade)" />
        <StatCard icon={Sparkles} label="Từ chủ động" value={activeVocab} accent="var(--amber)" />
        <StatCard icon={Target} label="Cần ôn hôm nay" value={dueToday} accent="var(--coral)" />
        <StatCard icon={Flame} label="Buổi shadowing / 7 ngày" value={recentShadow} accent="var(--jade-light)" />
      </div>

      <div className="quick-row">
        <button className="btn-primary" onClick={() => setTab("vocab")}>
          <Plus size={15} /> Học từ vựng
        </button>
        <button className="btn-primary" onClick={() => setTab("shadowing")}>
          <Mic size={15} /> Luyện shadowing
        </button>
        <button className="btn-primary" onClick={() => setTab("ielts")}>
          <PenLine size={15} /> Luyện Writing / Speaking
        </button>
      </div>

      <div className="chart-grid">
        <div className="card">
          <h3 className="section-title">Tiến độ Writing (band)</h3>
          {writingChart.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={writingChart}>
                <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
                <XAxis dataKey="attempt" stroke="var(--text-soft)" fontSize={11} />
                <YAxis domain={[0, 9]} stroke="var(--text-soft)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--ink-2)", border: "1px solid var(--border-soft)", fontSize: 12 }} />
                <Line type="monotone" dataKey="band" stroke="var(--jade-light)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Chưa có bài Writing nào được chấm." />
          )}
          {lastWriting && <p className="small-note">Gần nhất: band {lastWriting.band_overall} · {fmtDate(lastWriting.date)}</p>}
        </div>

        <div className="card">
          <h3 className="section-title">Tiến độ Speaking (band)</h3>
          {speakingChart.length ? (
            <ResponsiveContainer width="100%" height={180}>
              <LineChart data={speakingChart}>
                <CartesianGrid stroke="var(--border-soft)" strokeDasharray="3 3" />
                <XAxis dataKey="attempt" stroke="var(--text-soft)" fontSize={11} />
                <YAxis domain={[0, 9]} stroke="var(--text-soft)" fontSize={11} />
                <Tooltip contentStyle={{ background: "var(--ink-2)", border: "1px solid var(--border-soft)", fontSize: 12 }} />
                <Line type="monotone" dataKey="band" stroke="var(--amber)" strokeWidth={2} dot={{ r: 3 }} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <EmptyState text="Chưa có bài Speaking nào được chấm." />
          )}
          {lastSpeaking && <p className="small-note">Gần nhất: band {lastSpeaking.band_overall} · {fmtDate(lastSpeaking.date)}</p>}
        </div>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Vocab tab                                                          */
/* ------------------------------------------------------------------ */

function VocabCard({ item, loadingId, onGenerate, onSubmitFeynman }) {
  const [open, setOpen] = useState(false);
  const [explanation, setExplanation] = useState("");
  const isLoading = loadingId === item.id;
  const isDue = item.dueDate && item.dueDate <= new Date().toISOString();

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
            <button className="btn-primary" disabled={isLoading} onClick={() => onGenerate(item)}>
              {isLoading ? <Spinner label="Đang tạo..." /> : <><Sparkles size={15} /> Sinh định nghĩa AI (Anh–Anh)</>}
            </button>
          ) : (
            <>
              <p className="def-en"><strong>Definition:</strong> {item.definition_en}</p>
              <p className="def-en"><strong>Example:</strong> {item.example_en}</p>
              {item.synonyms && item.synonyms.length > 0 && (
                <p className="def-en small-note">Synonyms: {item.synonyms.join(", ")}</p>
              )}

              <div className="feynman-box">
                <label className="label-text">Feynman: tự giải thích từ này bằng tiếng Anh của riêng bạn</label>
                <textarea
                  className="textarea-field"
                  rows={3}
                  placeholder="Explain this word in your own English words..."
                  value={explanation}
                  onChange={(e) => setExplanation(e.target.value)}
                />
                <button
                  className="btn-primary"
                  disabled={isLoading || !explanation.trim()}
                  onClick={() => onSubmitFeynman(item, explanation)}
                >
                  {isLoading ? <Spinner label="Đang chấm..." /> : "Chấm giải thích"}
                </button>

                {item.lastFeedback && (
                  <div className="ai-feedback">
                    <span className="score-pill">{item.lastFeedback.score}/100</span>
                    <p>{item.lastFeedback.feedback}</p>
                  </div>
                )}
              </div>
              {item.dueDate && <p className="small-note">Ôn lại tiếp theo: {fmtDate(item.dueDate)}</p>}
            </>
          )}
        </div>
      )}
    </div>
  );
}

function VocabTab({ vocabList, setVocabList }) {
  const [word, setWord] = useState("");
  const [pos, setPos] = useState(POS_OPTIONS[0]);
  const [filter, setFilter] = useState("all");
  const [loadingId, setLoadingId] = useState(null);

  function addWord() {
    if (!word.trim()) return;
    const item = {
      id: uid(),
      word: word.trim(),
      pos,
      status: "passive",
      definition_en: "",
      example_en: "",
      synonyms: [],
      srsLevel: 0,
      dueDate: null,
      lastFeedback: null,
      createdAt: new Date().toISOString(),
    };
    setVocabList((prev) => [item, ...prev]);
    setWord("");
  }

  async function handleGenerate(item) {
    setLoadingId(item.id);
    const system = "Bạn là trợ lý học từ vựng tiếng Anh theo phương pháp Anh–Anh (Feynman). Trả lời CHỈ bằng JSON hợp lệ, không kèm giải thích hay markdown.";
    const user = `Từ: "${item.word}" (loại từ: ${item.pos}). Trả về JSON: {"definition_en":"định nghĩa 1 câu bằng tiếng Anh đơn giản","example_en":"1 câu ví dụ dùng từ này","synonyms":["tối đa 3 từ đồng nghĩa tiếng Anh"]}`;
    const result = await askAI(system, user);
    if (result) {
      setVocabList((prev) =>
        prev.map((v) => (v.id === item.id ? { ...v, definition_en: result.definition_en, example_en: result.example_en, synonyms: result.synonyms || [] } : v))
      );
    } else {
      alert("Không tạo được định nghĩa, vui lòng thử lại.");
    }
    setLoadingId(null);
  }

  async function handleSubmitFeynman(item, explanation) {
    setLoadingId(item.id);
    const system = "Bạn là giám khảo đánh giá khả năng giải thích từ vựng tiếng Anh bằng tiếng Anh. Trả lời CHỈ bằng JSON hợp lệ, không markdown.";
    const user = `Từ: "${item.word}". Định nghĩa chuẩn: "${item.definition_en}". Giải thích của người học: "${explanation}". Trả JSON: {"score": số 0-100, "feedback": "2 câu góp ý bằng tiếng Việt", "verdict": "active hoặc passive (active nếu score >= 70)"}`;
    const result = await askAI(system, user);
    if (result) {
      const isActive = result.verdict === "active" || result.score >= 70;
      setVocabList((prev) =>
        prev.map((v) => {
          if (v.id !== item.id) return v;
          const level = isActive ? Math.min((v.srsLevel || 0) + 1, SRS_INTERVALS.length - 1) : 0;
          return {
            ...v,
            status: isActive ? "active" : "passive",
            lastFeedback: { score: result.score, feedback: result.feedback },
            srsLevel: level,
            dueDate: addDaysISO(SRS_INTERVALS[level]),
          };
        })
      );
    } else {
      alert("Không chấm được, vui lòng thử lại.");
    }
    setLoadingId(null);
  }

  const filtered = vocabList.filter((v) => {
    if (filter === "all") return true;
    if (filter === "due") return v.dueDate && v.dueDate <= new Date().toISOString();
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
          {POS_OPTIONS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="btn-primary" onClick={addWord}><Plus size={15} /> Thêm</button>
      </div>

      <div className="filter-row">
        {[["all", "Tất cả"], ["due", "Cần ôn"], ["active", "Chủ động"], ["passive", "Thụ động"]].map(([k, l]) => (
          <button key={k} className={`chip ${filter === k ? "chip-active" : ""}`} onClick={() => setFilter(k)}>{l}</button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <EmptyState text="Chưa có từ nào trong mục này. Thêm từ mới ở trên để bắt đầu." />
      ) : (
        <div className="vocab-grid">
          {filtered.map((item) => (
            <VocabCard key={item.id} item={item} loadingId={loadingId} onGenerate={handleGenerate} onSubmitFeynman={handleSubmitFeynman} />
          ))}
        </div>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Shadowing tab                                                      */
/* ------------------------------------------------------------------ */

function ShadowingTab({ history, setHistory }) {
  const [topic, setTopic] = useState("");
  const [level, setLevel] = useState(LEVEL_OPTIONS[1]);
  const [script, setScript] = useState("");
  const [loading, setLoading] = useState(false);
  const [accuracy, setAccuracy] = useState(null);
  const rec = useSpeechRecognition();

  async function handleGenerate() {
    setLoading(true);
    setScript("");
    setAccuracy(null);
    rec.reset();
    const system = "Bạn soạn bài luyện shadowing tiếng Anh cho người học IELTS. Trả lời CHỈ bằng JSON hợp lệ.";
    const user = `Chủ đề: "${topic || "chủ đề đời sống tự do"}". Cấp độ: ${level}. Viết một đoạn tiếng Anh tự nhiên dài 60-100 từ, giọng văn như người bản xứ đang nói chuyện, phù hợp để luyện shadowing. Trả JSON: {"script":"..."}`;
    const result = await askAI(system, user);
    if (result && result.script) setScript(result.script);
    else alert("Không tạo được bài, vui lòng thử lại.");
    setLoading(false);
  }

  function handleFinishRecording() {
    rec.stop();
  }

  function handleGrade() {
    const acc = lcsAccuracy(script, rec.transcript);
    setAccuracy(acc);
    setHistory((prev) => [
      { id: uid(), date: new Date().toISOString(), topic: topic || "Tự do", level, script, accuracy: acc },
      ...prev,
    ]);
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <input className="input-field" placeholder="Chủ đề (vd: environment, technology...)" value={topic} onChange={(e) => setTopic(e.target.value)} />
        <select className="select-field" value={level} onChange={(e) => setLevel(e.target.value)}>
          {LEVEL_OPTIONS.map((l) => <option key={l}>{l}</option>)}
        </select>
        <button className="btn-primary" disabled={loading} onClick={handleGenerate}>
          {loading ? <Spinner label="Đang soạn..." /> : <><Sparkles size={15} /> Sinh bài luyện</>}
        </button>
      </div>

      {script && (
        <div className="card">
          <h3 className="section-title">Script luyện tập</h3>
          <p className="shadow-script">{script}</p>
          <div className="shadow-controls">
            <button className="btn-ghost" onClick={() => speak(script, 0.8)}><Volume2 size={15} /> Đọc chậm</button>
            <button className="btn-ghost" onClick={() => speak(script, 1)}><Volume2 size={15} /> Đọc bình thường</button>
            {rec.supported ? (
              !rec.listening ? (
                <button className="btn-primary" onClick={() => { rec.reset(); setAccuracy(null); rec.start(); }}>
                  <Play size={15} /> Bắt đầu shadowing
                </button>
              ) : (
                <button className="btn-danger" onClick={handleFinishRecording}><Square size={15} /> Dừng</button>
              )
            ) : (
              <span className="small-note">Trình duyệt này chưa hỗ trợ nhận diện giọng nói — hãy thử Chrome trên máy tính.</span>
            )}
          </div>

          {rec.transcript && (
            <div className="ai-feedback">
              <p className="label-text">Bạn đã nói (nhận diện tự động):</p>
              <p className="def-en">{rec.transcript}</p>
              {!rec.listening && accuracy === null && (
                <button className="btn-primary" onClick={handleGrade}>Chấm & lưu kết quả</button>
              )}
              {accuracy !== null && (
                <p><span className="score-pill">{accuracy}% khớp từ</span> so với script gốc</p>
              )}
            </div>
          )}
          <p className="small-note">Lưu ý: độ khớp từ là ước lượng dựa trên nhận diện giọng nói của trình duyệt, không phải chấm điểm phát âm chuyên sâu — nhưng phát âm càng rõ thì tỉ lệ nhận đúng càng cao.</p>
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Lịch sử luyện tập</h3>
        {history.length === 0 ? (
          <EmptyState text="Chưa có buổi shadowing nào." />
        ) : (
          <div className="history-list">
            {history.slice(0, 8).map((h) => (
              <div key={h.id} className="history-item">
                <div><strong>{h.topic}</strong> · {h.level}</div>
                <div className="history-right">
                  <span className="score-pill">{h.accuracy}%</span>
                  <span className="small-note">{fmtDate(h.date)}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* IELTS skills tab: Writing + Speaking                                */
/* ------------------------------------------------------------------ */

function ScoreGrid({ items }) {
  return (
    <div className="scorecard-grid">
      {items.map(([label, value]) => (
        <div key={label} className="scorecard-item">
          <div className="scorecard-value">{value}</div>
          <div className="scorecard-label">{label}</div>
        </div>
      ))}
    </div>
  );
}

function WritingPanel({ history, setHistory }) {
  const [taskType, setTaskType] = useState(TASK_TYPES[1]);
  const [prompt, setPrompt] = useState("");
  const [essay, setEssay] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [result, setResult] = useState(null);

  async function handleGeneratePrompt() {
    setGenLoading(true);
    const system = "Bạn là người ra đề thi IELTS Writing. Trả lời CHỈ bằng JSON hợp lệ.";
    const user = `Tạo một đề bài IELTS Writing ${taskType} ngẫu nhiên, độ khó band 6-7. Trả JSON: {"prompt":"..."}`;
    const res = await askAI(system, user);
    if (res && res.prompt) setPrompt(res.prompt);
    setGenLoading(false);
  }

  async function handleGrade() {
    if (!essay.trim() || !prompt.trim()) return;
    setGradeLoading(true);
    const system = "Bạn là giám khảo chấm IELTS Writing chuyên nghiệp. Trả lời CHỈ bằng JSON hợp lệ, không markdown, feedback ngắn gọn bằng tiếng Việt.";
    const user = `Đề bài (${taskType}): "${prompt}"\n\nBài làm:\n"""${essay}"""\n\nChấm theo 4 tiêu chí IELTS Writing (thang 0-9, có thể lẻ 0.5). Trả JSON: {"task_achievement":x,"coherence_cohesion":x,"lexical_resource":x,"grammar":x,"band_overall":x,"feedback":"2-3 câu góp ý chính","top_errors":["tối đa 3 lỗi cụ thể"]}`;
    const res = await askAI(system, user);
    if (res) {
      setResult(res);
      setHistory((prev) => [...prev, { id: uid(), date: new Date().toISOString(), taskType, prompt, essay, ...res }]);
    } else {
      alert("Không chấm được bài, vui lòng thử lại.");
    }
    setGradeLoading(false);
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <select className="select-field" value={taskType} onChange={(e) => setTaskType(e.target.value)}>
          {TASK_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <button className="btn-ghost" disabled={genLoading} onClick={handleGeneratePrompt}>
          {genLoading ? <Spinner label="Đang tạo đề..." /> : <><Sparkles size={15} /> Sinh đề ngẫu nhiên</>}
        </button>
      </div>

      <div className="card">
        <label className="label-text">Đề bài</label>
        <textarea className="textarea-field" rows={2} placeholder="Dán đề bài của bạn hoặc bấm 'Sinh đề ngẫu nhiên'..." value={prompt} onChange={(e) => setPrompt(e.target.value)} />
        <label className="label-text">Bài làm của bạn</label>
        <textarea className="textarea-field" rows={8} placeholder="Viết bài luận của bạn ở đây..." value={essay} onChange={(e) => setEssay(e.target.value)} />
        <button className="btn-primary" disabled={gradeLoading || !essay.trim() || !prompt.trim()} onClick={handleGrade}>
          {gradeLoading ? <Spinner label="Đang chấm..." /> : "Chấm bài"}
        </button>
      </div>

      {result && (
        <div className="card">
          <h3 className="section-title">Kết quả — Band tổng: {result.band_overall}</h3>
          <ScoreGrid items={[["Nhiệm vụ", result.task_achievement], ["Mạch lạc & Liên kết", result.coherence_cohesion], ["Từ vựng", result.lexical_resource], ["Ngữ pháp", result.grammar]]} />
          <p className="def-en">{result.feedback}</p>
          {result.top_errors && result.top_errors.length > 0 && (
            <ul className="error-list">
              {result.top_errors.map((e, i) => <li key={i}>{e}</li>)}
            </ul>
          )}
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Lịch sử Writing</h3>
        {history.length === 0 ? <EmptyState text="Chưa có bài Writing nào." /> : (
          <div className="history-list">
            {[...history].reverse().slice(0, 8).map((h) => (
              <div key={h.id} className="history-item">
                <div><strong>{h.taskType}</strong> · band {h.band_overall}</div>
                <span className="small-note">{fmtDate(h.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function SpeakingPanel({ history, setHistory }) {
  const [part, setPart] = useState(SPEAKING_PARTS[0]);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [genLoading, setGenLoading] = useState(false);
  const [gradeLoading, setGradeLoading] = useState(false);
  const [result, setResult] = useState(null);
  const rec = useSpeechRecognition();

  async function handleGenerateQuestion() {
    setGenLoading(true);
    const system = "Bạn là giám khảo thi nói IELTS. Trả lời CHỈ bằng JSON hợp lệ.";
    const user = `Tạo một câu hỏi IELTS Speaking ${part} ngẫu nhiên (tự nhiên, đúng phong cách đề thi thật). Trả JSON: {"question":"..."}`;
    const res = await askAI(system, user);
    if (res && res.question) setQuestion(res.question);
    setGenLoading(false);
  }

  async function handleGrade() {
    if (!answer.trim() || !question.trim()) return;
    setGradeLoading(true);
    const system = "Bạn là giám khảo chấm IELTS Speaking dựa trên bản ghi văn bản câu trả lời (không có audio). Trả lời CHỈ bằng JSON hợp lệ, feedback ngắn gọn bằng tiếng Việt.";
    const user = `Câu hỏi (${part}): "${question}"\n\nCâu trả lời (đã chuyển thành văn bản): "${answer}"\n\nChấm theo 3 tiêu chí có thể đánh giá qua văn bản (thang 0-9, có thể lẻ 0.5): fluency_coherence (mạch lạc & trôi chảy ý), lexical_resource (từ vựng), grammar (ngữ pháp). Trả JSON: {"fluency_coherence":x,"lexical_resource":x,"grammar":x,"band_overall":x,"feedback":"2-3 câu góp ý chính"}`;
    const res = await askAI(system, user);
    if (res) {
      setResult(res);
      setHistory((prev) => [...prev, { id: uid(), date: new Date().toISOString(), part, question, answer, ...res }]);
    } else {
      alert("Không chấm được, vui lòng thử lại.");
    }
    setGradeLoading(false);
  }

  return (
    <div className="panel">
      <div className="card form-row">
        <select className="select-field" value={part} onChange={(e) => setPart(e.target.value)}>
          {SPEAKING_PARTS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <button className="btn-ghost" disabled={genLoading} onClick={handleGenerateQuestion}>
          {genLoading ? <Spinner label="Đang tạo câu hỏi..." /> : <><Sparkles size={15} /> Sinh câu hỏi</>}
        </button>
      </div>

      <div className="card">
        <label className="label-text">Câu hỏi</label>
        <textarea className="textarea-field" rows={2} placeholder="Bấm 'Sinh câu hỏi' hoặc tự nhập..." value={question} onChange={(e) => setQuestion(e.target.value)} />

        <label className="label-text">Câu trả lời của bạn</label>
        <textarea className="textarea-field" rows={5} placeholder="Gõ câu trả lời, hoặc dùng micro để đọc rồi sao chép bản ghi vào đây..." value={answer} onChange={(e) => setAnswer(e.target.value)} />

        <div className="shadow-controls">
          {rec.supported ? (
            !rec.listening ? (
              <button className="btn-ghost" onClick={() => { rec.reset(); rec.start(); }}><Mic size={15} /> Ghi âm câu trả lời</button>
            ) : (
              <button className="btn-danger" onClick={rec.stop}><Square size={15} /> Dừng ghi</button>
            )
          ) : (
            <span className="small-note">Trình duyệt chưa hỗ trợ nhận diện giọng nói.</span>
          )}
          {rec.transcript && !rec.listening && (
            <button className="btn-ghost" onClick={() => setAnswer(rec.transcript)}>Dùng bản ghi này</button>
          )}
        </div>

        <button className="btn-primary" disabled={gradeLoading || !answer.trim() || !question.trim()} onClick={handleGrade}>
          {gradeLoading ? <Spinner label="Đang chấm..." /> : "Chấm câu trả lời"}
        </button>
        <p className="small-note">Lưu ý: chưa đánh giá phát âm/ngữ điệu thật vì hệ thống chỉ phân tích văn bản, không phân tích âm thanh trực tiếp.</p>
      </div>

      {result && (
        <div className="card">
          <h3 className="section-title">Kết quả — Band tổng: {result.band_overall}</h3>
          <ScoreGrid items={[["Trôi chảy & Mạch lạc", result.fluency_coherence], ["Từ vựng", result.lexical_resource], ["Ngữ pháp", result.grammar]]} />
          <p className="def-en">{result.feedback}</p>
        </div>
      )}

      <div className="card">
        <h3 className="section-title">Lịch sử Speaking</h3>
        {history.length === 0 ? <EmptyState text="Chưa có lượt Speaking nào." /> : (
          <div className="history-list">
            {[...history].reverse().slice(0, 8).map((h) => (
              <div key={h.id} className="history-item">
                <div><strong>{h.part}</strong> · band {h.band_overall}</div>
                <span className="small-note">{fmtDate(h.date)}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function IeltsTab({ writingHistory, setWritingHistory, speakingHistory, setSpeakingHistory }) {
  const [sub, setSub] = useState("writing");
  return (
    <div>
      <div className="sub-tab-row">
        <button className={`chip ${sub === "writing" ? "chip-active" : ""}`} onClick={() => setSub("writing")}>Writing</button>
        <button className={`chip ${sub === "speaking" ? "chip-active" : ""}`} onClick={() => setSub("speaking")}>Speaking</button>
      </div>
      {sub === "writing" ? (
        <WritingPanel history={writingHistory} setHistory={setWritingHistory} />
      ) : (
        <SpeakingPanel history={speakingHistory} setHistory={setSpeakingHistory} />
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Styles                                                              */
/* ------------------------------------------------------------------ */

const css = `
@import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,500;9..144,600;9..144,700&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600&display=swap');

:root {
  --ink: #14171f;
  --ink-2: #1c212d;
  --paper: #EDE7D9;
  --jade: #3E8577;
  --jade-light: #5FAE9D;
  --amber: #D6A94B;
  --coral: #C1554A;
  --text-soft: #9AA3B0;
  --border-soft: rgba(237,231,217,0.14);
}

.app-shell { min-height: 100vh; background: var(--ink); color: var(--paper); font-family: 'Inter', sans-serif; padding: 24px; box-sizing: border-box; }
.app-shell * { box-sizing: border-box; }
.app-header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 18px; flex-wrap: wrap; gap: 12px; }
.app-title { font-family: 'Fraunces', serif; font-size: 28px; font-weight: 600; margin: 0; color: var(--paper); }
.marker-word { position: relative; color: var(--amber); display: inline-block; }
.marker-svg { display: block; margin-top: -4px; }
.app-subtitle { color: var(--text-soft); font-size: 13px; margin: 6px 0 0; }

.btn-reset { font-size: 12px; }

.tab-nav { display: flex; gap: 6px; margin-bottom: 20px; flex-wrap: wrap; border-bottom: 1px solid var(--border-soft); padding-bottom: 0; }
.tab-btn { display: flex; flex-direction: column; align-items: center; gap: 4px; background: transparent; border: none; color: var(--text-soft); padding: 8px 14px; cursor: pointer; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500; }
.tab-btn span:first-of-type { display: flex; align-items: center; gap: 6px; }
.tab-btn.active { color: var(--paper); }
.tab-btn:hover { color: var(--paper); }

.app-main { max-width: 980px; margin: 0 auto; }
.panel { display: flex; flex-direction: column; gap: 16px; }
.loading-state { text-align: center; color: var(--text-soft); padding: 60px 0; font-family: 'IBM Plex Mono', monospace; }

.card { background: var(--ink-2); border: 1px solid var(--border-soft); border-radius: 10px; padding: 16px 18px; }
.section-title { font-family: 'Fraunces', serif; font-size: 16px; font-weight: 600; margin: 0 0 10px; color: var(--paper); }

.stat-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(140px, 1fr)); gap: 12px; }
.stat-card { background: var(--ink-2); border: 1px solid var(--border-soft); border-radius: 10px; padding: 14px; }
.stat-icon { margin-bottom: 6px; }
.stat-value { font-family: 'IBM Plex Mono', monospace; font-size: 22px; font-weight: 600; color: var(--paper); }
.stat-label { font-size: 12px; color: var(--text-soft); margin-top: 2px; }

.quick-row { display: flex; gap: 10px; flex-wrap: wrap; }
.chart-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 14px; }

.btn-primary { display: inline-flex; align-items: center; gap: 6px; background: var(--jade); color: white; border: none; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; font-family: 'Inter', sans-serif; }
.btn-primary:disabled { opacity: 0.5; cursor: not-allowed; }
.btn-primary:hover:not(:disabled) { background: var(--jade-light); }
.btn-ghost { display: inline-flex; align-items: center; gap: 6px; background: transparent; color: var(--paper); border: 1px solid var(--border-soft); border-radius: 8px; padding: 8px 13px; font-size: 13px; cursor: pointer; font-family: 'Inter', sans-serif; }
.btn-ghost:hover { border-color: var(--jade-light); }
.btn-danger { display: inline-flex; align-items: center; gap: 6px; background: var(--coral); color: white; border: none; border-radius: 8px; padding: 9px 14px; font-size: 13px; font-weight: 600; cursor: pointer; }

.form-row { display: flex; gap: 10px; flex-wrap: wrap; align-items: center; }
.input-field, .select-field, .textarea-field { background: var(--ink); border: 1px solid var(--border-soft); border-radius: 7px; color: var(--paper); padding: 9px 11px; font-size: 13px; font-family: 'Inter', sans-serif; }
.input-field { flex: 1; min-width: 180px; }
.textarea-field { width: 100%; resize: vertical; margin-bottom: 10px; }
.label-text { display: block; font-size: 12px; color: var(--text-soft); margin-bottom: 5px; margin-top: 8px; }

.filter-row, .sub-tab-row { display: flex; gap: 8px; margin-bottom: 4px; flex-wrap: wrap; }
.chip { background: var(--ink-2); border: 1px solid var(--border-soft); color: var(--text-soft); padding: 6px 12px; border-radius: 999px; font-size: 12px; cursor: pointer; }
.chip-active { background: var(--jade); color: white; border-color: var(--jade); }

.vocab-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.vocab-card-head { display: flex; justify-content: space-between; align-items: center; cursor: pointer; }
.vocab-word { font-family: 'Fraunces', serif; font-size: 17px; font-weight: 600; margin-right: 8px; }
.pos-tag { font-size: 11px; color: var(--text-soft); border: 1px solid var(--border-soft); border-radius: 6px; padding: 1px 6px; }
.vocab-head-right { display: flex; align-items: center; gap: 6px; }
.vocab-card-body { margin-top: 12px; border-top: 1px solid var(--border-soft); padding-top: 12px; }
.def-en { font-size: 13px; line-height: 1.5; margin: 6px 0; }
.feynman-box { margin-top: 10px; }
.ai-feedback { margin-top: 10px; background: var(--ink); border-radius: 8px; padding: 10px 12px; font-size: 13px; }
.score-pill { font-family: 'IBM Plex Mono', monospace; background: var(--jade); color: white; border-radius: 6px; padding: 2px 8px; font-size: 12px; margin-right: 6px; }

.badge { font-size: 11px; padding: 2px 8px; border-radius: 999px; font-weight: 600; }
.badge-active { background: rgba(214,169,75,0.18); color: var(--amber); }
.badge-passive { background: rgba(154,163,176,0.18); color: var(--text-soft); }
.badge-due { background: rgba(193,85,74,0.18); color: var(--coral); }

.empty-state { color: var(--text-soft); font-size: 13px; text-align: center; padding: 24px; border: 1px dashed var(--border-soft); border-radius: 8px; }
.small-note { font-size: 11px; color: var(--text-soft); margin-top: 6px; }

.shadow-script { font-size: 15px; line-height: 1.7; font-family: 'Fraunces', serif; }
.shadow-controls { display: flex; gap: 8px; flex-wrap: wrap; margin: 10px 0; align-items: center; }

.history-list { display: flex; flex-direction: column; gap: 6px; }
.history-item { display: flex; justify-content: space-between; align-items: center; padding: 8px 10px; background: var(--ink); border-radius: 7px; font-size: 13px; }
.history-right { display: flex; align-items: center; gap: 8px; }

.scorecard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 8px; margin-bottom: 10px; }
.scorecard-item { background: var(--ink); border-radius: 8px; padding: 10px; text-align: center; }
.scorecard-value { font-family: 'IBM Plex Mono', monospace; font-size: 18px; font-weight: 600; color: var(--jade-light); }
.scorecard-label { font-size: 11px; color: var(--text-soft); margin-top: 2px; }
.error-list { font-size: 13px; padding-left: 18px; margin: 8px 0 0; }

.spinner-row { display: inline-flex; align-items: center; gap: 6px; }
.spin { animation: spin 1s linear infinite; }
@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }

*:focus-visible { outline: 2px solid var(--amber); outline-offset: 2px; }

@media (max-width: 640px) {
  .app-title { font-size: 22px; }
  .app-shell { padding: 14px; }
}
`;

/* ------------------------------------------------------------------ */
/* App                                                                 */
/* ------------------------------------------------------------------ */

export default function App() {
  const [tab, setTab] = useState("dashboard");
  const [loading, setLoading] = useState(true);
  const [vocabList, setVocabList] = useState([]);
  const [shadowingHistory, setShadowingHistory] = useState([]);
  const [writingHistory, setWritingHistory] = useState([]);
  const [speakingHistory, setSpeakingHistory] = useState([]);

  useEffect(() => {
    (async () => {
      const [v, s, w, sp] = await Promise.all([
        loadKey("vocab-list", []),
        loadKey("shadowing-history", []),
        loadKey("writing-history", []),
        loadKey("speaking-history", []),
      ]);
      setVocabList(v);
      setShadowingHistory(s);
      setWritingHistory(w);
      setSpeakingHistory(sp);
      setLoading(false);
    })();
  }, []);

  useEffect(() => { if (!loading) saveKey("vocab-list", vocabList); }, [vocabList, loading]);
  useEffect(() => { if (!loading) saveKey("shadowing-history", shadowingHistory); }, [shadowingHistory, loading]);
  useEffect(() => { if (!loading) saveKey("writing-history", writingHistory); }, [writingHistory, loading]);
  useEffect(() => { if (!loading) saveKey("speaking-history", speakingHistory); }, [speakingHistory, loading]);

  function handleReset() {
    if (!window.confirm("Xoá toàn bộ dữ liệu học tập? Hành động này không thể hoàn tác.")) return;
    setVocabList([]);
    setShadowingHistory([]);
    setWritingHistory([]);
    setSpeakingHistory([]);
  }

  return (
    <div className="app-shell">
      <style>{css}</style>
      <Header onReset={handleReset} />
      <TabNav tab={tab} setTab={setTab} />
      <main className="app-main">
        {loading ? (
          <div className="loading-state">Đang tải dữ liệu của bạn...</div>
        ) : (
          <>
            {tab === "dashboard" && (
              <Dashboard vocabList={vocabList} shadowingHistory={shadowingHistory} writingHistory={writingHistory} speakingHistory={speakingHistory} setTab={setTab} />
            )}
            {tab === "vocab" && <VocabTab vocabList={vocabList} setVocabList={setVocabList} />}
            {tab === "shadowing" && <ShadowingTab history={shadowingHistory} setHistory={setShadowingHistory} />}
            {tab === "ielts" && (
              <IeltsTab writingHistory={writingHistory} setWritingHistory={setWritingHistory} speakingHistory={speakingHistory} setSpeakingHistory={setSpeakingHistory} />
            )}
          </>
        )}
      </main>
    </div>
  );
}
