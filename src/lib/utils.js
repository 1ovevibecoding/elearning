/* ─── Shared utilities ─── */

export const POS_OPTIONS = ["Danh từ", "Động từ", "Tính từ", "Khác"];
export const LEVEL_OPTIONS = ["Band 5.0–5.5", "Band 6.0–6.5", "Band 7.0+"];
export const TASK_TYPES = ["Task 1", "Task 2"];
export const SPEAKING_PARTS = ["Part 1", "Part 2", "Part 3"];
/** @deprecated Use SM2 instead */
export const SRS_INTERVALS = [1, 3, 7, 14, 30, 60];

export const SM2_RATINGS = [
  { key: "again", label: "Quên 😰", color: "var(--coral)",      q: 0 },
  { key: "hard",  label: "Khó 😓",  color: "var(--amber)",      q: 2 },
  { key: "good",  label: "Được 🙂", color: "var(--jade-light)", q: 4 },
  { key: "easy",  label: "Dễ 😄",   color: "var(--jade)",       q: 5 },
];

/**
 * SM-2 Algorithm (Anki-style)
 * @param {number} q       Rating: 0=Again, 2=Hard, 4=Good, 5=Easy
 * @param {number} ef      Current ease factor (default 2.5)
 * @param {number} reps    Number of successful repetitions so far
 * @param {number} interval Current interval in days
 * @returns {{ newEF, newInterval, newReps, dueDate }}
 */
export function sm2(q, ef = 2.5, reps = 0, interval = 1) {
  let newEF = ef + (0.1 - (5 - q) * (0.08 + (5 - q) * 0.02));
  if (newEF < 1.3) newEF = 1.3;

  let newInterval;
  let newReps;

  if (q < 3) {
    // Failed — reset
    newReps = 0;
    newInterval = 1;
  } else {
    newReps = reps + 1;
    if (newReps === 1) newInterval = 1;
    else if (newReps === 2) newInterval = 6;
    else newInterval = Math.round(interval * newEF);
  }

  const dueDate = addDaysISO(newInterval);
  return {
    newEF: Math.round(newEF * 100) / 100,
    newInterval,
    newReps,
    dueDate,
    status: q >= 3 ? "active" : "passive",
  };
}

export function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function addDaysISO(days) {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toISOString();
}

export function fmtDate(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

export function normalizeWords(str) {
  return (str || "")
    .toLowerCase()
    .replace(/[^a-z0-9'\s]/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

/** LCS accuracy between target script and spoken text */
export function lcsAccuracy(target, spoken) {
  const a = normalizeWords(target);
  const b = normalizeWords(spoken);
  if (a.length === 0) return 0;
  const dp = Array.from({ length: a.length + 1 }, () =>
    new Array(b.length + 1).fill(0)
  );
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      dp[i][j] =
        a[i - 1] === b[j - 1]
          ? dp[i - 1][j - 1] + 1
          : Math.max(dp[i - 1][j], dp[i][j - 1]);
    }
  }
  return Math.round((dp[a.length][b.length] / a.length) * 100);
}

/**
 * Speak with optional voice accent selection.
 * accent: 'en-US' | 'en-GB' | 'en-AU'
 */
export function speak(text, rate = 1, accent = "en-US") {
  if (!text || typeof window === "undefined" || !window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const utter = new SpeechSynthesisUtterance(text);
  utter.lang = accent;
  utter.rate = rate;

  // Try to find a matching voice for the requested accent
  const voices = window.speechSynthesis.getVoices();
  if (voices.length) {
    const preferred = voices.find(
      (v) => v.lang === accent && (v.localService === false || v.name.includes("Google") || v.name.includes("Microsoft"))
    ) || voices.find((v) => v.lang.startsWith(accent.slice(0, 2)));
    if (preferred) utter.voice = preferred;
  }

  window.speechSynthesis.speak(utter);
}

/** Get all available English TTS voices */
export function getEnglishVoices() {
  if (typeof window === "undefined" || !window.speechSynthesis) return [];
  return window.speechSynthesis
    .getVoices()
    .filter((v) => v.lang.startsWith("en"));
}

/** Today's date as YYYY-MM-DD */
export function todayStr() {
  return new Date().toISOString().slice(0, 10);
}

/** XP per activity type */
export const XP = {
  word_studied: 5,
  shadowing: 20,
  reading: 30,
  listening: 25,
  writing: 35,
  speaking: 30,
};

/**
 * Official IELTS Band Score Rounding Rule
 * If average ends in .25 -> round up to .5
 * If average ends in .75 -> round up to next whole band
 * @param {number} r Reading
 * @param {number} l Listening
 * @param {number} w Writing
 * @param {number} s Speaking
 * @returns {number} Rounded Overall Band (e.g. 7.5)
 */
export function calculateOverallBand(r, l, w, s) {
  const scores = [r, l, w, s].filter((v) => typeof v === "number" && !isNaN(v) && v > 0);
  if (scores.length === 0) return 0;
  const avg = scores.reduce((a, b) => a + b, 0) / scores.length;
  
  const decimal = avg - Math.floor(avg);
  if (decimal < 0.25) {
    return Math.floor(avg);
  } else if (decimal < 0.75) {
    return Math.floor(avg) + 0.5;
  } else {
    return Math.ceil(avg);
  }
}

/**
 * Convert Reading/Listening raw score (out of total or 40) to IELTS Band
 */
export function rawToBand(correct, total = 40) {
  const ratio = correct / (total || 1);
  if (ratio >= 39 / 40) return 9.0;
  if (ratio >= 37 / 40) return 8.5;
  if (ratio >= 35 / 40) return 8.0;
  if (ratio >= 32 / 40) return 7.5;
  if (ratio >= 30 / 40) return 7.0;
  if (ratio >= 26 / 40) return 6.5;
  if (ratio >= 23 / 40) return 6.0;
  if (ratio >= 18 / 40) return 5.5;
  if (ratio >= 16 / 40) return 5.0;
  if (ratio >= 13 / 40) return 4.5;
  if (ratio >= 10 / 40) return 4.0;
  return 3.5;
}

/**
 * Achievement Badges System
 */
export const BADGES = [
  {
    id: "first_step",
    title: "Khởi Đầu Nan",
    icon: "🌱",
    desc: "Hoàn thành bài học đầu tiên trên hệ thống",
    xp: 50,
    check: (stats) => (stats.total_xp || 0) >= 50,
  },
  {
    id: "vocab_50",
    title: "Kho Từ Vựng 50+",
    icon: "📚",
    desc: "Lưu trữ 50 từ vựng vào hệ thống Spaced Repetition",
    xp: 100,
    check: (stats, vocabs) => (vocabs?.length || 0) >= 50,
  },
  {
    id: "streak_7",
    title: "Chiến Binh 7 Ngày",
    icon: "🔥",
    desc: "Đạt chuỗi học liên tiếp 7 ngày không gián đoạn",
    xp: 150,
    check: (stats) => (stats.current_streak || 0) >= 7,
  },
  {
    id: "speaking_master",
    title: "Bậc Thầy Speaking",
    icon: "🎙️",
    desc: "Hoàn thành 5 bài thi Speaking cùng Giám khảo AI",
    xp: 120,
    check: (stats, _, history) => (history?.speaking?.length || 0) >= 5,
  },
  {
    id: "essay_expert",
    title: "Cây Bút Học Thuật",
    icon: "✍️",
    desc: "Viết 5 bài luận Writing đạt Band 6.5 trở lên",
    xp: 200,
    check: (stats, _, history) => (history?.writing?.filter(w => (w.score || 0) >= 6.5).length || 0) >= 5,
  },
  {
    id: "band_7_club",
    title: "Câu Lạc Bộ Band 7.0+",
    icon: "🏆",
    desc: "Đạt Overall Band dự đoán từ 7.0 trở lên",
    xp: 300,
    check: (stats, _, history, overall) => overall >= 7.0,
  },
];

/**
 * League Ranks based on total XP
 */
export const LEAGUES = [
  { name: "Đồng (Bronze)", minXp: 0, color: "#cd7f32", icon: "🥉" },
  { name: "Bạc (Silver)", minXp: 200, color: "#c0c0c0", icon: "🥈" },
  { name: "Vàng (Gold)", minXp: 600, color: "#ffd700", icon: "🥇" },
  { name: "Bạch Kim (Platinum)", minXp: 1500, color: "#00e5ff", icon: "💎" },
  { name: "Kim Cương (Diamond)", minXp: 3000, color: "#b388ff", icon: "👑" },
  { name: "Huyền Thoại (Master)", minXp: 6000, color: "#ff1744", icon: "🔥" },
];

export function getLeague(xp = 0) {
  for (let i = LEAGUES.length - 1; i >= 0; i--) {
    if (xp >= LEAGUES[i].minXp) return LEAGUES[i];
  }
  return LEAGUES[0];
}

