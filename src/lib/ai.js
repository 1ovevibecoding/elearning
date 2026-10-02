/**
 * Server-side AI caller — calls Groq first, falls back to Gemini.
 * Always requests JSON responses.
 * This file runs ONLY on the server (API routes) — API keys never reach the client.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Helper to safely parse JSON from AI outputs (handling markdown fences and whitespace)
 */
function parseJsonSafe(text) {
  if (!text) return null;
  let clean = text.trim();
  if (clean.startsWith("```json")) {
    clean = clean.replace(/^```json\s*/i, "").replace(/```\s*$/, "").trim();
  } else if (clean.startsWith("```")) {
    clean = clean.replace(/^```\s*/, "").replace(/```\s*$/, "").trim();
  }
  try {
    return JSON.parse(clean);
  } catch (e) {
    const firstBrace = clean.indexOf("{");
    const lastBrace = clean.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
      try {
        return JSON.parse(clean.slice(firstBrace, lastBrace + 1));
      } catch (err2) {
        // pass
      }
    }
    throw e;
  }
}

/**
 * Call Groq API (OpenAI-compatible)
 */
async function callGroq(system, user, maxTokens = 3500) {
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model: "llama-3.3-70b-versatile",
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseJsonSafe(text);
}

/**
 * Call Google Gemini API (fallback)
 */
async function callGemini(system, user, maxTokens = 3500) {
  const url = `${GEMINI_URL}?key=${process.env.GEMINI_API_KEY}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      system_instruction: { parts: [{ text: system }] },
      contents: [{ parts: [{ text: user }] }],
      generationConfig: {
        responseMimeType: "application/json",
        temperature: 0.7,
        maxOutputTokens: maxTokens,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return parseJsonSafe(text);
}

/**
 * Main AI function — tries Groq, falls back to Gemini.
 * @param {string} system - System prompt
 * @param {string} user - User prompt
 * @param {Object} [options] - Options (maxTokens, etc.)
 * @returns {Object|null} Parsed JSON response
 */
export async function askAI(system, user, options = {}) {
  const maxTokens = options.maxTokens || 3500;
  // Append JSON instruction to system prompt
  const systemWithJson = system + " Respond ONLY with valid JSON, no markdown or explanation.";

  try {
    if (process.env.GROQ_API_KEY) {
      return await callGroq(systemWithJson, user, maxTokens);
    }
  } catch (groqError) {
    console.warn("Groq failed, trying Gemini fallback:", groqError.message);
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      return await callGemini(systemWithJson, user, maxTokens);
    }
  } catch (geminiError) {
    console.error("Both AI providers failed:", geminiError.message);
  }

  return null;
}

