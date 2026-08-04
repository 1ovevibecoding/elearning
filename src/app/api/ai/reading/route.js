import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, topic, passageText, questions, userAnswers } = await request.json();

    if (action === "generate") {
      const system =
        "You are an expert IELTS Reading test creator. Generate all passage, questions, options and answers in English. Explanations for learners should be in Vietnamese. Respond ONLY with valid JSON, no markdown.";
      const user = `Create 1 FULL IELTS Academic Reading passage (approximately 700–850 words) on the topic: "${topic || "Science, History, or Society"}". Include 7 to 10 questions covering at least two of these types: True/False/Not Given, Multiple Choice, and Matching Information.
Return JSON in this exact format:
{
  "title": "English passage title here",
  "passage": "Full English reading passage here (700+ words). Use \n\n to separate paragraphs...",
  "questions": [
    {
      "id": 1,
      "type": "tfng",
      "question": "English True/False/Not Given question here?",
      "options": ["TRUE", "FALSE", "NOT GIVEN"],
      "answer": "TRUE",
      "explanation": "Giải thích bằng tiếng Việt: Tại sao đáp án là TRUE, chỉ rõ đoạn văn bản gốc nào trong bài xác nhận điều này..."
    },
    {
      "id": 2,
      "type": "mcq",
      "question": "English multiple choice question here?",
      "options": ["A. First option in English", "B. Second option", "C. Third option", "D. Fourth option"],
      "answer": "A. First option in English",
      "explanation": "Giải thích bằng tiếng Việt: Tại sao chọn đáp án A, chỉ ra câu/đoạn nào trong bài xác nhận..."
    }
  ]
}`;
      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });
      return Response.json(result);
    }

    if (action === "grade") {
      // Self-grading or AI feedback
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
    console.error("Reading AI error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
