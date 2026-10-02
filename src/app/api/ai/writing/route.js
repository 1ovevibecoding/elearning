import { auth } from "@clerk/nextjs/server";
import { askAI, handleAIError } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, taskType, prompt, essay } = await request.json();

    if (action === "generate") {
      const system =
        "You are an expert IELTS Writing test creator. Generate an official, authentic IELTS Writing prompt in English. Respond ONLY with valid JSON.";
      const user = `Generate a realistic IELTS Writing ${taskType || "Task 2"} prompt in English (target difficulty Band 6.5–7.5). Return JSON: {"prompt":"<English prompt text here>"}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });
      return Response.json(result);
    }

    if (action === "grade") {
      if (!essay || !prompt) {
        return Response.json({ error: "Missing essay or prompt" }, { status: 400 });
      }
      const system =
        "You are an official IELTS Writing examiner. Evaluate the essay according to official IELTS band descriptors (0–9 scale, allowing 0.5 increments). Provide scores and concise constructive feedback in Vietnamese for the Vietnamese learner. Respond ONLY with valid JSON.";
      const user = `Prompt (${taskType}): "${prompt}"\n\nEssay Submission:\n"""${essay}"""\n\nScore on 4 IELTS criteria. Return JSON: {"task_achievement": <number 0-9>, "coherence_cohesion": <number 0-9>, "lexical_resource": <number 0-9>, "grammar": <number 0-9>, "band_overall": <number 0-9>, "feedback": "<2-3 sentences of constructive advice in Vietnamese>", "top_errors": ["<specific error 1 and how to fix in Vietnamese/English>", "<specific error 2>"]}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });
      return Response.json(result);
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("AI error:", e);
    return handleAIError(e);
  }
}
