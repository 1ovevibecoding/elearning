import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, part, question, answer } = await request.json();

    if (action === "generate") {
      const system =
        "You are an expert IELTS Speaking examiner. Generate an authentic, official-style IELTS Speaking question in English. Respond ONLY with valid JSON.";
      const user = `Generate a realistic IELTS Speaking ${part || "Part 1"} question in English. Return JSON: {"question":"<English question text here>"}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    if (action === "grade") {
      if (!answer || !question) {
        return Response.json({ error: "Missing answer or question" }, { status: 400 });
      }
      const system =
        "You are an official IELTS Speaking examiner evaluating a learner's transcribed response. Evaluate on 0–9 scale with 0.5 increments. Provide concise feedback in Vietnamese for the learner. Respond ONLY with valid JSON.";
      const user = `Question (${part}): "${question}"\n\nTranscribed Answer:\n"${answer}"\n\nScore on criteria evaluatable via text: fluency_coherence, lexical_resource, grammar. Return JSON: {"fluency_coherence": <number 0-9>, "lexical_resource": <number 0-9>, "grammar": <number 0-9>, "band_overall": <number 0-9>, "feedback": "<2-3 sentences of feedback and suggestions in Vietnamese>"}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Speaking AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
