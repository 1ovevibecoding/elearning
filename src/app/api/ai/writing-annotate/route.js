import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { essay, taskType } = await request.json();
    if (!essay?.trim()) return Response.json({ error: "No essay" }, { status: 400 });

    const system =
      "You are a professional IELTS Writing coach providing detailed inline feedback similar to Grammarly and IELTS Write & Improve. Respond ONLY with valid JSON.";

    const user = `Analyze this IELTS ${taskType || "Task 2"} essay in detail:

"""${essay}"""

Return JSON with this exact structure:
{
  "sentence_feedback": [
    {
      "original": "<exact sentence from essay>",
      "issues": [
        {
          "type": "grammar|article|tense|word_choice|repetition|coherence",
          "original_phrase": "<the problematic phrase>",
          "suggestion": "<corrected or upgraded version>",
          "explanation": "<concise Vietnamese explanation>"
        }
      ],
      "improved_sentence": "<full improved version of this sentence>"
    }
  ],
  "linking_words_found": ["<list of linking/cohesive words found in the essay>"],
  "linking_words_missing": ["<suggest 3-5 linking words that would improve coherence>"],
  "repeated_words": [
    { "word": "<word>", "count": <number>, "alternatives": ["<alt1>", "<alt2>"] }
  ],
  "vocabulary_upgrades": [
    { "basic": "<basic word/phrase>", "advanced": ["<option1>", "<option2>"], "band": "<Band 7-9 label>" }
  ],
  "overall_tip": "<one powerful tip in Vietnamese to improve this essay>"
}`;

    const result = await askAI(system, user);
    if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
    return Response.json(result);
  } catch (e) {
    console.error("Writing annotate error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
