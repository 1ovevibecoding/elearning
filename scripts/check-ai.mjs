import fs from "node:fs";
import path from "node:path";

// Load .env.local if present
const envPath = path.resolve(process.cwd(), ".env.local");
if (fs.existsSync(envPath)) {
  const content = fs.readFileSync(envPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GEMINI_MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash";

const GROQ_API_KEY = process.env.GROQ_API_KEY;
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;

console.log("=== KIỂM TRA KẾT NỐI AI PROVIDERS ===");
console.log(`- Groq Model:   ${GROQ_MODEL}`);
console.log(`- Gemini Model: ${GEMINI_MODEL}`);
console.log("=====================================\n");

async function checkGroq() {
  process.stdout.write(`[1/2] Kiểm tra Groq (${GROQ_MODEL})... `);
  if (!GROQ_API_KEY) {
    console.log("BỎ QUA (Không tìm thấy GROQ_API_KEY)");
    return;
  }

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${GROQ_API_KEY}`,
      },
      body: JSON.stringify({
        model: GROQ_MODEL,
        messages: [{ role: "user", content: "Ping. Respond ONLY with valid JSON: {\"status\":\"ok\"}" }],
        max_tokens: 250,
      }),
    });

    const bodyText = await res.text();
    if (res.ok) {
      console.log("OK ✅");
      console.log(`    Status: ${res.status}`);
      try {
        const parsed = JSON.parse(bodyText);
        const msg = parsed.choices?.[0]?.message;
        const content = msg?.content || msg?.reasoning || "";
        console.log(`    Response: ${content.trim()}`);
      } catch {
        console.log(`    Body: ${bodyText.slice(0, 100)}`);
      }
    } else {
      console.log("LỖI ❌");
      console.log(`    Status: ${res.status} ${res.statusText}`);
      console.log(`    Body: ${bodyText}`);
    }
  } catch (err) {
    console.log("LỖI ❌");
    console.log(`    Error: ${err.message}`);
  }
}

async function checkGemini() {
  process.stdout.write(`\n[2/2] Kiểm tra Gemini (${GEMINI_MODEL})... `);
  if (!GEMINI_API_KEY) {
    console.log("BỎ QUA (Không tìm thấy GEMINI_API_KEY)");
    return;
  }

  try {
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: "Ping. Respond JSON: {\"status\":\"ok\"}" }] }],
        generationConfig: {
          responseMimeType: "application/json",
          maxOutputTokens: 50,
        },
      }),
    });

    const bodyText = await res.text();
    if (res.ok) {
      console.log("OK ✅");
      console.log(`    Status: ${res.status}`);
      try {
        const parsed = JSON.parse(bodyText);
        console.log(`    Response: ${parsed.candidates?.[0]?.content?.parts?.[0]?.text?.trim()}`);
      } catch {
        console.log(`    Body: ${bodyText.slice(0, 100)}`);
      }
    } else {
      console.log("LỖI ❌");
      console.log(`    Status: ${res.status} ${res.statusText}`);
      console.log(`    Body: ${bodyText}`);
    }
  } catch (err) {
    console.log("LỖI ❌");
    console.log(`    Error: ${err.message}`);
  }
}

async function run() {
  await checkGroq();
  await checkGemini();
  console.log("\n=== HOÀN TẤT KIỂM TRA ===");
}

run();
