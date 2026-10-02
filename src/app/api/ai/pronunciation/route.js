import { auth } from "@clerk/nextjs/server";
import { askAI, handleAIError } from "@/lib/ai";

/**
 * Pronunciation analysis API
 * Compares expected script vs Whisper transcript + word timestamps
 * Returns word-by-word color feedback (green/yellow/red/missing)
 */
export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { expectedText, actualTranscript, words } = await request.json();

    if (!expectedText || !actualTranscript) {
      return Response.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Normalize both texts to arrays of words
    const expectedWords = expectedText
      .toLowerCase()
      .replace(/[^a-z0-9'\s]/g, "")
      .split(/\s+/)
      .filter(Boolean);

    const spokenWords = (words || []).map((w) => w.word?.toLowerCase()?.replace(/[^a-z0-9']/g, "") || "");
    const spokenSet = new Set(spokenWords);

    // Build Levenshtein-based word alignment
    const alignedExpected = expectedWords;

    const system =
      "You are an expert English pronunciation coach for Vietnamese IELTS learners. Analyze the difference between what was expected and what was spoken, focusing on common errors Vietnamese learners make (missing final consonants, -s/-ed endings, consonant clusters like 'str', 'th' sounds, word stress). Respond ONLY with valid JSON.";

    const user = `Expected script: "${expectedText}"
Actual transcript from Whisper: "${actualTranscript}"
Word timestamps: ${JSON.stringify(words?.slice(0, 50) || [])}

Return a JSON object in this format:
{
  "overall_score": <number 0-100>,
  "overall_feedback": "<2-3 sentences in Vietnamese about main issues and what to focus on>",
  "word_analysis": [
    {
      "expected": "<expected word>",
      "spoken": "<what was actually said or empty string if missed>",
      "status": "<'correct'|'hesitated'|'substituted'|'missing'>",
      "reason": "<short Vietnamese explanation only if not correct, max 10 words>"
    }
  ],
  "top_issues": ["<Issue 1 in Vietnamese>", "<Issue 2>", "<Issue 3>"],
  "tip": "<One specific actionable tip in Vietnamese>"
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
