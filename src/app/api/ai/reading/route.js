import { auth } from "@clerk/nextjs/server";
import { askAI, handleAIError } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, topic, passageText, questions, userAnswers } = await request.json();

    if (action === "generate") {
      const system =
        "You are a Cambridge IELTS Academic Reading test setter with 20+ years of experience. " +
        "Generate authentic IELTS-style passages and questions exactly matching the official exam format. " +
        "All passage text, questions, and options must be in English. " +
        "Explanations for learners (explanation field) should be in Vietnamese. " +
        "Respond ONLY with valid JSON, no markdown.";

      const user = `Create 1 FULL IELTS Academic Reading passage on the topic: "${topic || "Science, Technology, Society, or Environment"}".

Requirements:
- Passage: 900-1000 words, academic register, factual, well-structured with 4-5 paragraphs labeled A, B, C, D, E
- Total questions: exactly 13 questions in 3 groups matching real IELTS format

Return JSON in this EXACT format:
{
  "title": "Passage title",
  "passage": "Paragraph A\\n\\nParagraph B\\n\\nParagraph C\\n\\nParagraph D\\n\\nParagraph E",
  "sections": [
    {
      "type": "tfng",
      "instruction": "Questions 1-5: Do the following statements agree with the information given in the passage? Write TRUE, FALSE or NOT GIVEN.",
      "questions": [
        { "id": 1, "type": "tfng", "question": "Statement based on passage content.", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "TRUE", "explanation": "Giải thích TV: Câu này đúng vì đoạn A nêu rõ..." },
        { "id": 2, "type": "tfng", "question": "Statement based on passage content.", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "FALSE", "explanation": "Giải thích TV..." },
        { "id": 3, "type": "tfng", "question": "Statement based on passage content.", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "NOT GIVEN", "explanation": "Giải thích TV..." },
        { "id": 4, "type": "tfng", "question": "Statement based on passage content.", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "TRUE", "explanation": "Giải thích TV..." },
        { "id": 5, "type": "tfng", "question": "Statement based on passage content.", "options": ["TRUE", "FALSE", "NOT GIVEN"], "answer": "FALSE", "explanation": "Giải thích TV..." }
      ]
    },
    {
      "type": "mcq",
      "instruction": "Questions 6-10: Choose the correct letter, A, B, C or D.",
      "questions": [
        { "id": 6, "type": "mcq", "question": "According to the passage, which of the following is correct?", "options": ["A. First option", "B. Second option", "C. Third option", "D. Fourth option"], "answer": "A. First option", "explanation": "Giải thích TV..." },
        { "id": 7, "type": "mcq", "question": "The author's main argument in paragraph C is that...", "options": ["A. Option A", "B. Option B", "C. Option C", "D. Option D"], "answer": "B. Option B", "explanation": "Giải thích TV..." },
        { "id": 8, "type": "mcq", "question": "What does the writer say about...?", "options": ["A. Option A", "B. Option B", "C. Option C", "D. Option D"], "answer": "C. Option C", "explanation": "Giải thích TV..." },
        { "id": 9, "type": "mcq", "question": "Which statement best describes...?", "options": ["A. Option A", "B. Option B", "C. Option C", "D. Option D"], "answer": "A. Option A", "explanation": "Giải thích TV..." },
        { "id": 10, "type": "mcq", "question": "The passage suggests that in the future...", "options": ["A. Option A", "B. Option B", "C. Option C", "D. Option D"], "answer": "D. Option D", "explanation": "Giải thích TV..." }
      ]
    },
    {
      "type": "matching",
      "instruction": "Questions 11-13: Complete the summary below. Choose NO MORE THAN TWO WORDS from the passage for each answer.",
      "questions": [
        { "id": 11, "type": "short_answer", "question": "The process begins with __________ which determines the initial outcome.", "options": [], "answer": "the correct word/phrase from passage", "explanation": "Giải thích TV: Từ/cụm từ này xuất hiện ở đoạn..." },
        { "id": 12, "type": "short_answer", "question": "Researchers found that __________ plays a critical role.", "options": [], "answer": "the correct word/phrase from passage", "explanation": "Giải thích TV..." },
        { "id": 13, "type": "short_answer", "question": "The final stage involves __________ to achieve the desired result.", "options": [], "answer": "the correct word/phrase from passage", "explanation": "Giải thích TV..." }
      ]
    }
  ]
}`;

      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });

      // Flatten all questions from sections for grading compatibility
      const allQuestions = (result.sections || []).flatMap(s => s.questions || []);
      return Response.json({ ...result, questions: allQuestions });
    }

    if (action === "grade") {
      let score = 0;
      const feedbackList = questions.map((q, idx) => {
        const uAns = (userAnswers[idx] || "").trim();
        // For short answer: case-insensitive partial match
        const correct = (q.answer || "").trim();
        const isCorrect = q.type === "short_answer"
          ? uAns.toLowerCase().includes(correct.toLowerCase().split(" ")[0])
          : uAns === correct;
        if (isCorrect) score++;
        return {
          questionId: q.id,
          userAnswer: uAns || "Bỏ trống",
          correctAnswer: correct,
          isCorrect,
          explanation: q.explanation,
        };
      });

      return Response.json({ score, total: questions.length, details: feedbackList });
    }

    return Response.json({ error: "Invalid action" }, { status: 400 });
  } catch (e) {
    console.error("AI error:", e);
    return handleAIError(e);
  }
}
