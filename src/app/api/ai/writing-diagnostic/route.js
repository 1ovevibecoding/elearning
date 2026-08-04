import { auth } from "@clerk/nextjs/server";
import { askAI } from "@/lib/ai";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { task_type, prompt, essay_text } = await request.json();
    if (!essay_text || !prompt) {
      return Response.json({ error: "Essay and prompt are required" }, { status: 400 });
    }

    const wordCount = essay_text.trim().split(/\s+/).filter(Boolean).length;

    const system =
      "You are a senior Cambridge IELTS Writing Examiner with 15+ years of experience. Grade strictly according to the official IELTS Band Descriptors (0.0 to 9.0). Respond ONLY with valid JSON.";

    const userPrompt = `IELTS Writing Type: ${task_type || "Task 2"}
Prompt: "${prompt}"
Candidate Essay (${wordCount} words):
"""
${essay_text}
"""

Evaluate strictly on the 4 official criteria and provide diagnostic annotations:
1. TR (Task Response): Did the candidate fully address all parts of the task with a clear position and well-developed ideas?
2. CC (Coherence & Cohesion): Paragraphing, logical progression, cohesive devices, referencing.
3. LR (Lexical Resource): Range of academic vocabulary, precision, collocations, spelling errors.
4. GRA (Grammatical Range & Accuracy): Complex sentence structures, punctuation, tense accuracy.

Also provide:
- "lexical_upgrades": An array of objects for weak or repetitive words with higher band replacements [{ "original": "very important", "suggested": "paramount / pivotal", "reason": "Academic upgrade" }]
- "band_score": The official average of TR, CC, LR, GRA rounded to nearest 0.5.

Return JSON format:
{
  "band_score": 6.5,
  "word_count": ${wordCount},
  "criteria": {
    "task_response": { "score": 6.5, "feedback": "Chi tiết đánh giá mức độ trả lời đề bài" },
    "coherence_cohesion": { "score": 6.5, "feedback": "Chi tiết về tính liên kết, đoạn văn và từ nối" },
    "lexical_resource": { "score": 7.0, "feedback": "Chi tiết về vốn từ học thuật và độ chính xác ngữ cảnh" },
    "grammatical_range": { "score": 6.0, "feedback": "Chi tiết về độ đa dạng cấu trúc và lỗi ngữ pháp" }
  },
  "lexical_upgrades": [
    { "original": "important", "suggested": "crucial / paramount", "reason": "Tăng tính học thuật cho bài viết" }
  ],
  "general_feedback": "Tóm tắt điểm mạnh nổi bật và điểm yếu chí mạng cần sửa",
  "sample_rewrite_paragraph": "Một đoạn văn mẫu được viết lại đạt chuẩn Band 8.0+"
}`;

    const result = await askAI(system, userPrompt);
    if (!result) {
      return Response.json({ error: "AI unavailable" }, { status: 503 });
    }

    return Response.json(result);
  } catch (e) {
    console.error("Writing diagnostic error:", e);
    return Response.json({ error: "Internal error" }, { status: 500 });
  }
}
