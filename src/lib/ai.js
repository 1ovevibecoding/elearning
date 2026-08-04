/**
 * Server-side AI caller — calls Groq first, falls back to Gemini.
 * Always requests JSON responses.
 * This file runs ONLY on the server (API routes) — API keys never reach the client.
 */

const GROQ_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_URL = "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent";

/**
 * Call Groq API (OpenAI-compatible)
 */
async function callGroq(system, user) {
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
      max_tokens: 1200,
      response_format: { type: "json_object" },
    }),
  });

  if (!res.ok) {
    throw new Error(`Groq API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.choices?.[0]?.message?.content || "";
  return JSON.parse(text);
}

/**
 * Call Google Gemini API (fallback)
 */
async function callGemini(system, user) {
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
        maxOutputTokens: 1200,
      },
    }),
  });

  if (!res.ok) {
    throw new Error(`Gemini API error: ${res.status} ${res.statusText}`);
  }

  const data = await res.json();
  const text = data.candidates?.[0]?.content?.parts?.[0]?.text || "";
  return JSON.parse(text);
}

/**
 * Main AI function — tries Groq, falls back to Gemini.
 * @param {string} system - System prompt
 * @param {string} user - User prompt
 * @returns {Object|null} Parsed JSON response
 */
export async function askAI(system, user) {
  // Append JSON instruction to system prompt
  const systemWithJson = system + " Respond ONLY with valid JSON, no markdown or explanation.";

  try {
    if (process.env.GROQ_API_KEY) {
      return await callGroq(systemWithJson, user);
    }
  } catch (groqError) {
    console.warn("Groq failed, trying Gemini fallback:", groqError.message);
  }

  try {
    if (process.env.GEMINI_API_KEY) {
      return await callGemini(systemWithJson, user);
    }
  } catch (geminiError) {
    console.error("Both AI providers failed:", geminiError.message);
  }

  return null;
}
