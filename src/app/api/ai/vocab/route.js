import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { word, pos } = await request.json();
    if (!word) {
      return Response.json({ error: "Word is required" }, { status: 400 });
    }

    const system =
      "You are an English vocabulary tutor applying the Feynman technique (English-to-English definitions). All output must be in English. Respond ONLY with valid JSON.";
    const user = `Word: "${word}" (part of speech: ${pos}). Return JSON: {"definition_en":"a simple one-sentence English definition","example_en":"one natural example sentence using this word in context","synonyms":["up to 3 English synonyms"]}`;

    const result = await askAI(system, user);
    if (!result) {
      return Response.json({ error: "AI unavailable" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("Vocab AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
