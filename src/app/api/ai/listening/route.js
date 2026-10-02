import { auth } from "@clerk/nextjs/server";
import { askAI, handleAIError } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { action, topic, questions, userAnswers } = await request.json();

    if (action === "generate") {
      const system =
        "You are a Cambridge IELTS Listening test setter. " +
        "Generate authentic IELTS-style listening transcripts and questions that match the official exam format. " +
        "ALL transcript text, questions, and options must be in English. Natural spoken English only. " +
        "Only the explanation field should be in Vietnamese to help learners understand. " +
        "Respond ONLY with valid JSON, no markdown.";

      const user = `Create a full IELTS Listening section on the topic: "${topic || "Accommodation, Study Abroad, Campus Life, or Everyday conversation"}".

Requirements:
- Transcript: 400-500 words, natural spoken English, clear dialogue or monologue
- Choose accent based on context: en-GB (British), en-US (American), or en-AU (Australian)
- Total: exactly 10 questions in 2 groups, matching IELTS Listening format

Return JSON in this EXACT format:
{
  "topic": "${topic || "General"}",
  "section_type": "Section 2 — Monologue on a general topic",
  "accent": "en-GB",
  "transcript": "Full English transcript here — natural spoken English with clear paragraphs. Speaker A: ... Speaker B: ...",
  "sections": [
    {
      "type": "form_completion",
      "instruction": "Questions 1-5: Complete the notes below. Write NO MORE THAN TWO WORDS AND/OR A NUMBER for each answer.",
      "context": "Brief context sentence e.g. 'Notes on student accommodation'",
      "questions": [
        { "id": 1, "type": "short_answer", "question": "Name of the venue/person/place: ___________", "options": [], "answer": "exact word or phrase from transcript", "explanation": "Giải thích TV: Người nói đề cập đến điều này khi nói '...' " },
        { "id": 2, "type": "short_answer", "question": "Date / Time / Number: ___________", "options": [], "answer": "exact answer from transcript", "explanation": "Giải thích TV..." },
        { "id": 3, "type": "short_answer", "question": "Cost / Price / Amount: ___________", "options": [], "answer": "exact answer from transcript", "explanation": "Giải thích TV..." },
        { "id": 4, "type": "short_answer", "question": "Location / Address: ___________", "options": [], "answer": "exact answer from transcript", "explanation": "Giải thích TV..." },
        { "id": 5, "type": "short_answer", "question": "Specific detail mentioned: ___________", "options": [], "answer": "exact answer from transcript", "explanation": "Giải thích TV..." }
      ]
    },
    {
      "type": "mcq",
      "instruction": "Questions 6-10: Choose the correct letter, A, B or C.",
      "questions": [
        { "id": 6, "type": "mcq", "question": "What is the main purpose of the speaker?", "options": ["A. First option", "B. Second option", "C. Third option"], "answer": "A. First option", "explanation": "Giải thích TV: Người nói nêu rõ mục đích là..." },
        { "id": 7, "type": "mcq", "question": "According to the speaker, what should students do first?", "options": ["A. First option", "B. Second option", "C. Third option"], "answer": "B. Second option", "explanation": "Giải thích TV..." },
        { "id": 8, "type": "mcq", "question": "What problem does the speaker mention?", "options": ["A. First option", "B. Second option", "C. Third option"], "answer": "C. Third option", "explanation": "Giải thích TV..." },
        { "id": 9, "type": "mcq", "question": "How does the speaker feel about the situation?", "options": ["A. First option", "B. Second option", "C. Third option"], "answer": "A. First option", "explanation": "Giải thích TV..." },
        { "id": 10, "type": "mcq", "question": "What will happen next according to the speaker?", "options": ["A. First option", "B. Second option", "C. Third option"], "answer": "B. Second option", "explanation": "Giải thích TV..." }
      ]
    }
  ]
}`;

      const result = await askAI(system, user);
      if (!result) return Response.json({ error: "AI unavailable" }, { status: 503 });

      // Flatten all questions for grading compatibility
      const allQuestions = (result.sections || []).flatMap(s => s.questions || []);
      return Response.json({ ...result, questions: allQuestions });
    }

    if (action === "grade") {
      let score = 0;
      const feedbackList = questions.map((q, idx) => {
        const uAns = (userAnswers[idx] || "").trim().toLowerCase();
        const correct = (q.answer || "").trim().toLowerCase();
        // For short answer: accept if first keyword matches
        const isCorrect = q.type === "short_answer"
          ? correct.split(" ").some(word => word.length > 3 && uAns.includes(word))
          : uAns === correct;
        if (isCorrect) score++;
        return {
          questionId: q.id,
          userAnswer: userAnswers[idx] || "Bỏ trống",
          correctAnswer: q.answer,
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
