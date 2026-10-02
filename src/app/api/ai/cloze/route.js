import { askAI } from "@/lib/ai";
import { withAiGuard } from "@/lib/aiGuard";

export async function POST(request) {
  return withAiGuard(request, async (body, userId) => {
    const { word, definition_en, example_en } = body;
    if (!word) return Response.json({ error: "Word is required" }, { status: 400 });

    const system =
      "You are an IELTS vocabulary trainer creating cloze test exercises. Generate exercises in English with Vietnamese explanation. Respond ONLY with valid JSON.";

    const user = `Word: "${word}". Definition: "${definition_en}". Example: "${example_en}".
Create 2 different cloze (fill-in-the-blank) sentences that test this word in new contexts the learner hasn't seen before. The blank should be shown as "______".
Return JSON:
{
  "exercises": [
    {
      "sentence": "A sentence with ______ where the blank should be filled by the target word.",
      "context_hint": "<short Vietnamese hint about the context, NOT the word itself>",
      "answer": "${word}"
    },
    {
      "sentence": "Another different sentence with ______.",
      "context_hint": "<short Vietnamese hint>",
      "answer": "${word}"
    }
  ]
}`;

    const result = await askAI(system, user, { userId });
    if (!result) return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });
    return Response.json(result);
  });
}
