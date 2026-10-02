export function validateInput(text, maxLength = 5000) {
  if (text && typeof text === 'string' && text.length > maxLength) {
    throw new Error("Input too long");
  }
}

export function validateAudioSize(file, maxBytes = 25 * 1024 * 1024) {
  if (file && file.size && file.size > maxBytes) {
    throw new Error("Audio file too large");
  }
}

export function sanitizeScores(obj) {
  if (!obj || typeof obj !== 'object') return obj;
  for (const key of Object.keys(obj)) {
    if (key.includes('score') || key.includes('band') || key.includes('level')) {
      if (typeof obj[key] === 'number') {
        // Clamp score between 0 and 9 for IELTS or standard ranges
        obj[key] = Math.max(0, Math.min(9, obj[key]));
      }
    } else if (typeof obj[key] === 'object') {
      sanitizeScores(obj[key]);
    }
  }
  return obj;
}
