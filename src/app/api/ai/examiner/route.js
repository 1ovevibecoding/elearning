import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

/**
 * AI Examiner — 2-way IELTS Speaking simulation
 * Receives: part, conversation history, latest candidate answer (transcript)
 * Returns: feedback on latest answer + next examiner question (or closing)
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, part, conversation, candidateAnswer } = await request.json();

    // ── Start new session: generate opening question ──
    if (action === "start") {
      const system =
        "You are a professional IELTS Speaking examiner conducting a real IELTS Speaking test. Be formal but friendly. Ask one question at a time. Respond ONLY with valid JSON.";
      const user = `Start an IELTS Speaking ${part || "Part 1"} test. Greet the candidate briefly (1 sentence) and ask your first question. Keep the greeting very short and natural, like a real examiner would. Return JSON: {"examiner_text": "<greeting + first question>", "is_final": false}`;

      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    // ── Continue session: evaluate answer + ask next question ──
    if (action === "respond") {
      const turnCount = conversation?.filter((c) => c.role === "examiner").length || 0;

      // Determine max turns per part
      const maxTurns = part === "Part 2" ? 1 : part === "Part 3" ? 4 : 5;
      const isFinal = turnCount >= maxTurns;

      const historyText = (conversation || [])
        .map((c) => `[${c.role === "examiner" ? "Examiner" : "Candidate"}]: ${c.text}`)
        .join("\n");

      const system =
        "You are a professional IELTS Speaking examiner. You give brief, realistic examiner responses between questions. Provide concise feedback in Vietnamese on the candidate's latest answer, then ask the next question (unless it is the final turn). Respond ONLY with valid JSON.";

      const user = `IELTS Speaking ${part} — conversation so far:
${historyText}

[Candidate's latest answer]: "${candidateAnswer}"

Turn ${turnCount} of ${maxTurns}. ${isFinal ? "This is the FINAL turn — close the interview professionally and provide a comprehensive band assessment." : "Briefly acknowledge this answer and ask a natural follow-up or new question."}

Return JSON:
{
  "examiner_text": "<what the examiner says next — in English>",
  "answer_feedback": {
    "band_estimate": <number 5.0–9.0 with 0.5 increments>,
    "strength": "<one specific strength in Vietnamese>",
    "improvement": "<one specific improvement suggestion in Vietnamese>"
  },
  "is_final": ${isFinal}${isFinal ? `,
  "session_summary": {
    "final_band": <overall band estimate>,
    "fluency_coherence": <score>,
    "lexical_resource": <score>,
    "grammar": <score>,
    "summary_feedback": "<3-4 sentences overall feedback in Vietnamese>"
  }` : ""}
}`;

      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Examiner error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
