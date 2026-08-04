import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { word, definition_en, explanation } = await request.json();
    if (!word || !explanation) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const system =
      "You are an examiner evaluating how well an IELTS learner can explain an English word in their own English words (Feynman technique). Respond ONLY with valid JSON.";
    const user = `Word: "${word}". Standard definition: "${definition_en}". Learner's explanation: "${explanation}". Return JSON: {"score": <number 0-100>, "feedback": "<2 sentences of constructive feedback written in Vietnamese>", "verdict": "<active or passive — active if score >= 70>"}`;

    const result = await askAI(system, user);
    if (!result) {
      return Response.json({ error: "AI unavailable" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("Feynman AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
