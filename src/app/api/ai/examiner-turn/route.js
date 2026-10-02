import { askAI } from "@/lib/ai";
import { withAiGuard } from "@/lib/aiGuard";

export async function POST(request) {
  return withAiGuard(request, async (body, userId) => {
    const { part, topic, conversationHistory, latestCandidateTranscript, currentTurn } = body;

    const system =
      "You are a strict, certified Cambridge/IDP IELTS Speaking Examiner conducting a real-time spoken test. Maintain a professional, authentic examiner persona. Keep examiner questions concise and natural for audio playback (1-2 sentences max). Respond ONLY with valid JSON.";

    const userPrompt = `Test Section: ${part} (Topic: ${topic})
Turn Number: ${currentTurn || 1}
Conversation so far: ${JSON.stringify(conversationHistory || [])}
Latest Candidate Spoken Answer: "${latestCandidateTranscript || ""}"

Requirements:
1. If this is the start of the session (no candidate answer yet), introduce the part and ask the first question.
2. If the candidate answered, briefly acknowledge naturally (e.g., "Thank you. Moving on...", "I see. Why do you think...") and ask the next follow-up question.
3. If this section is finished (e.g. Turn >= 4 for Part 1/3, or Part 2 speech finished): set "is_finished": true and provide comprehensive IELTS Speaking Band evaluation.

Return JSON:
{
  "examiner_speech": "What the examiner will say next out loud (in English, concise, natural)",
  "is_finished": false, // boolean
  "evaluation": { // only required if is_finished is true, else null
    "overall_band": 6.5,
    "fluency_coherence": { "score": 6.5, "feedback": "Nhận xét chi tiết về độ trôi chảy và mạch lạc" },
    "lexical_resource": { "score": 7.0, "feedback": "Nhận xét về vốn từ vựng và collocations" },
    "grammatical_range": { "score": 6.5, "feedback": "Nhận xét về cấu trúc ngữ pháp và độ chính xác" },
    "pronunciation": { "score": 6.0, "feedback": "Nhận xét về phát âm và ngữ điệu" },
    "strengths": ["Điểm mạnh nổi bật"],
    "improvements": ["Điểm cần khắc phục cấp thiết để lên band"]
  }
}`;

    const result = await askAI(system, userPrompt, { userId });
    if (!result) {
      return Response.json({ error: "Dịch vụ AI đang bảo trì" }, { status: 503 });
    }

    return Response.json(result);
  });
}
