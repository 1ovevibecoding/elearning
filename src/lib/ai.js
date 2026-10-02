import { sanitizeScores } from "./validation";
import { validateInput } from "./validation";
import { checkRateLimit } from "./rateLimiter";
import { auth } from "@clerk/nextjs/server";

/**
 * Server-side AI caller — calls Groq first, falls back to Gemini.
 * Always requests JSON responses.
 * This file runs ONLY on the server (API routes) — API keys never reach the client.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";

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
  const model = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const res = await fetch(GROQ_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
    },
    body: JSON.stringify({
      model,
      messages: [
        { role: "system", content: system },
        { role: "user", content: user },
      ],
      temperature: 0.7,
      max_tokens: maxTokens,
    }),
  });

  if (!res.ok) {
    const errorBody = await res.text();
    console.error(`[Groq Error] Status: ${res.status} ${res.statusText} | Model: ${model} | Body:`, errorBody);
    throw new Error(`Groq API error (${res.status}): ${errorBody}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return parseJsonSafe(text);
}

/**
 * Call Google Gemini API (fallback)
 */
async function callGemini(system, user, maxTokens = 3500) {
  const model = process.env.GEMINI_MODEL || "gemini-3.5-flash";
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${process.env.GEMINI_API_KEY}`;
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
    const errorBody = await res.text();
    // Do NOT log url to prevent leaking API key
    console.error(`[Gemini Error] Status: ${res.status} ${res.statusText} | Model: ${model} | Body:`, errorBody);
    throw new Error(`Gemini API error (${res.status}): ${errorBody}`);
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
export function handleAIError(e) {
  const status = e?.status || 500;
  const message = e?.message && e.message !== "Internal error" ? e.message : "Dịch vụ AI đang bảo trì";
  return Response.json({ error: message }, { status });
}

export async function askAI(system, user, options = {}) {
  const maxTokens = options.maxTokens || 3500;

  const authData = await auth();
  const userId = options.userId || authData?.userId;

  if (userId) {
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      const err = new Error("Rate limit exceeded (max 30 requests/hour)");
      err.status = 429;
      throw err;
    }
  }

  validateInput(user, 5000);

  // Append JSON instruction to system prompt
  const systemWithJson = system + " Respond ONLY with valid JSON, no markdown or explanation.";

  let res = null;
  let groqErrorMsg = null;
  let geminiErrorMsg = null;

  const groqModel = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
  const geminiModel = process.env.GEMINI_MODEL || "gemini-3.5-flash";

  if (process.env.GROQ_API_KEY) {
    try {
      res = await callGroq(systemWithJson, user, maxTokens);
    } catch (groqError) {
      groqErrorMsg = groqError.message;
      console.warn(`[AI Fallback] Groq failed (${groqModel}), trying Gemini (${geminiModel})...`);
    }
  } else {
    groqErrorMsg = "GROQ_API_KEY is not set";
  }

  if (!res && process.env.GEMINI_API_KEY) {
    try {
      res = await callGemini(systemWithJson, user, maxTokens);
    } catch (geminiError) {
      geminiErrorMsg = geminiError.message;
      console.error(`[AI Error] Gemini failed (${geminiModel}).`);
    }
  } else if (!res && !process.env.GEMINI_API_KEY) {
    geminiErrorMsg = "GEMINI_API_KEY is not set";
  }

  if (!res) {
    console.error(`[AI Service Unavailable] Both AI providers failed.\n- Groq: ${groqErrorMsg}\n- Gemini: ${geminiErrorMsg}`);
    const err = new Error("Dịch vụ AI đang bảo trì");
    err.status = 503;
    throw err;
  }

  return sanitizeScores(res);
}

