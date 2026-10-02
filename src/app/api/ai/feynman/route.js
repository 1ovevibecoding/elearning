import { askAI } from "@/lib/ai";
import { withAiGuard } from "@/lib/aiGuard";

export async function POST(request) {
  return withAiGuard(request, async (body, userId) => {
    const { word, definition_en, explanation } = body;
    if (!word || !explanation) {
      return Response.json({ error: "Missing fields" }, { status: 400 });
    }

    const system =
      "You are an examiner evaluating how well an IELTS learner can explain an English word in their own English words (Feynman technique). Respond ONLY with valid JSON.";
    const user = `Word: "${word}". Standard definition: "${definition_en}". Learner's explanation: "${explanation}". Return JSON: {"score": <number 0-100>, "feedback": "<2 sentences of constructive feedback written in Vietnamese>", "verdict": "<active or passive — active if score >= 70>"}`;

    const result = await askAI(system, user, { userId });
    if (!result) {
      return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });
    }

    return Response.json(result);
  });
}
