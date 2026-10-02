import { auth } from "@clerk/nextjs/server";
import { askAI, handleAIError } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { words, level = "Band 6.0" } = await request.json();
    if (!words || words.length === 0) {
      return Response.json({ error: "Words list is required" }, { status: 400 });
    }

    const wordList = words.slice(0, 15).join(", ");

    const system =
      "You are an expert IELTS Writing tutor who creates high-quality reading passages for spaced repetition practice. " +
      "Write academic, engaging, and natural passages at the requested IELTS level. " +
      "Respond ONLY with valid JSON.";

    const user =
      `Create an IELTS reading passage that naturally incorporates ALL of these vocabulary words: ${wordList}

Target level: ${level}

Requirements:
- Passage length: 200-280 words
- Academic and engaging topic (choose any relevant topic where the words fit naturally)  
- Every vocabulary word from the list MUST appear at least once in the passage
- The passage should read naturally, not forced
- 3 comprehension questions that test understanding AND awareness of the vocabulary

Return ONLY this JSON:
{
  "title": "Passage title",
  "topic": "Brief topic description (e.g. Environmental Science, Technology, Society)",
  "passage": "Full passage text here...",
  "highlighted_words": ${JSON.stringify(words.slice(0, 15))},
  "questions": [
    {
      "q": "Question text?",
      "type": "comprehension",
      "answer": "Answer text"
    },
    {
      "q": "Question using vocabulary word?",
      "type": "vocabulary",
      "answer": "Answer text"
    },
    {
      "q": "Question text?",
      "type": "inference",
      "answer": "Answer text"
    }
  ],
  "writing_prompt": "A short writing prompt (1-2 sentences) asking the student to write a paragraph on a related topic using the vocabulary words"
}`;

    const result = await askAI(system, user);
    if (!result) {
      return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("AI error:", e);
    return handleAIError(e);
  }
}
