import { auth } from "@clerk/nextjs/server";
import { askAI, handleAIError } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { word, action } = body;
    if (!word) {
      return Response.json({ error: "Word is required" }, { status: 400 });
    }

    /* ── Quick translate action (for Word Family "Dịch" button) ── */
    if (action === "translate_vi") {
      const system = "You are a Vietnamese English dictionary. Respond ONLY with valid JSON.";
      const user = `Translate the English word "${word}" to Vietnamese. Return ONLY: {"meaning_vi": "nghĩa tiếng Việt ngắn gọn, 1-5 từ"}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    /* ── Full vocab analysis (default) ── */
    const system =
      "You are an expert English vocabulary analyst and IELTS lexicographer. " +
      "Analyze the given word deeply and return a comprehensive JSON profile. " +
      "All English content must be in English. Vietnamese translations only in meaning_vi/pos_detected fields. " +
      "Respond ONLY with valid JSON, no markdown.";

    const user =
      `Analyze the English word: "${word}".

Return ONLY this JSON structure:
{
  "word": "${word}",
  "ipa": "/phonetic transcription using IPA symbols, e.g. /ˌmɛt.ɪˈkjuː.ləs/",
  "definition_en": "clear one-sentence English definition",
  "example_en": "one natural IELTS-level example sentence",
  "synonyms": ["synonym1", "synonym2", "synonym3"],
  "pos_detected": "the correct part of speech in Vietnamese: Danh từ | Động từ | Tính từ | Trạng từ | Giới từ | Liên từ | Khác",
  "cefr_level": "the CEFR difficulty level: A1 | A2 | B1 | B2 | C1 | C2",
  "vocab_type": "active or passive — active means commonly used in everyday writing/speaking (e.g. run, house); passive means formal, literary, or academic vocabulary typically recognized but rarely produced (e.g. ephemeral, meticulous)",
  "vocab_type_reason": "one short sentence explaining why this word is active or passive",
  "word_family": [
    {
      "word": "the_word_itself_first",
      "pos": "adjective",
      "pos_vi": "Tính từ",
      "meaning_en": "short meaning in English",
      "meaning_vi": null,
      "is_translated": false
    },
    {
      "word": "related_word_2",
      "pos": "noun",
      "pos_vi": "Danh từ",
      "meaning_en": "short meaning in English",
      "meaning_vi": null,
      "is_translated": false
    }
  ]
}

Include 2-5 words in word_family (the word itself + its morphological relatives). Only include real, commonly-used English words.`;

    const result = await askAI(system, user);
    if (!result) {
      return Response.json({ error: "AI unavailable" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("AI error:", e);
    return handleAIError(e);
  }
}
