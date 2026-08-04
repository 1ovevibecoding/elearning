import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, topic, questions, userAnswers } = await request.json();

    if (action === "generate") {
      const system =
        "You are an expert IELTS Listening test creator. Generate ALL transcript, questions, options, and answers in English. Only the explanation field should be in Vietnamese to help learners understand. Respond ONLY with valid JSON, no markdown.";
      const user = `Create a natural IELTS Listening dialogue or monologue (approximately 300–450 words) on the topic: "${topic || "Travel booking, Campus life, or Daily conversation"}".
Include 5-7 questions (gap fill or multiple choice).
Return JSON in this exact format:
{
  "topic": "${topic || "General"}",
  "accent": "en-GB", // Return one of: en-GB (British), en-US (American), en-AU (Australian), en-CA (Canadian) based on the context
  "transcript": "Full English transcript of the audio here — natural spoken English dialogue or monologue...",
  "questions": [
    {
      "id": 1,
      "question": "English question based on what was heard?",
      "options": ["Option A in English", "Option B in English", "Option C in English"],
      "answer": "Option A in English",
      "explanation": "Giải thích bằng tiếng Việt: Tại sao đáp án là A, chỉ rõ câu nào trong transcript xác nhận điều này..."
    }
  ]
}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    if (action === "grade") {
      let score = 0;
      const feedbackList = questions.map((q, idx) => {
        const uAns = userAnswers[idx];
        const isCorrect = uAns === q.answer;
        if (isCorrect) score++;
        return {
          questionId: q.id,
          userAnswer: uAns || "Bỏ trống",
          correctAnswer: q.answer,
          isCorrect,
          explanation: q.explanation,
        };
      });

      return Response.json({
        score,
        total: questions.length,
        details: feedbackList,
      });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("Listening AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
