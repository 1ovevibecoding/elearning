import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { word, contextSentence } = await request.json();
    if (!word) {
      return Response.json({ error: "Word is required" }, { status: 400 });
    }

    const system =
      "You are an expert Cambridge IELTS lexicographer. Extract academic vocabulary details accurately. Respond ONLY with a valid JSON object.";

    const userPrompt = `Target Word/Phrase: "${word}"
Context Sentence: "${contextSentence || ""}"

Analyze this word in its context and return JSON:
{
  "word": "${word}",
  "pos": "Danh từ | Động từ | Tính từ | Khác",
  "ipa": "/phonetic transcription/",
  "definition_en": "Clear, concise academic English definition (1-2 sentences)",
  "meaning_vi": "Nghĩa tiếng Việt súc tích",
  "example_en": "Example sentence demonstrating natural IELTS academic usage",
  "synonyms": ["up to 3 high-band academic synonyms"],
  "collocations": ["2-3 common collocations with this word"],
  "band_level": "7.0+"
}`;

    const result = await askAI(system, userPrompt);
    if (!result) {
      return Response.json({ error: "AI unavailable" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("Vocab extract error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
