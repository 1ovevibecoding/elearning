import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { topic, level } = await request.json();

    const system =
      "You are an English language coach creating shadowing practice scripts for IELTS learners. The script MUST be in natural, fluent English — as if a native speaker is talking. Respond ONLY with valid JSON.";
    const user = `Topic: "${topic || "everyday life"}". Level: ${level || "Band 6.0–6.5"}. Write a natural English passage of 60–100 words suitable for shadowing practice. Use conversational native-speaker tone. Return JSON: {"script":"..."}`;

    const result = await askAI(system, user);
    if (!result) {
      return Response.json({ error: "AI unavailable" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("Shadowing AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
