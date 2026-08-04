import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) return Response.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const { word, definition_en, example_en } = await request.json();
    if (!word) return Response.json({ error: "No word" }, { status: 400 });

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

    const result = await askAI(system, user);
    if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
    return Response.json(result);
  } catch (e) {
    console.error("Cloze error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
