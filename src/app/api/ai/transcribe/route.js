import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { validateAudioSize } from "@/lib/validation";

const GROQ_WHISPER_URL =
  "https://api.groq.com/openai/v1/audio/transcriptions";

export async function POST(request) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Chưa đăng nhập" }, { status: 401 });
  }

  try {
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      return Response.json({ error: "Vượt quá giới hạn (tối đa 30 yêu cầu/giờ). Vui lòng thử lại sau." }, { status: 429 });
    }

    const formData = await request.formData();
    const audioFile = formData.get("audio");

    if (!audioFile) {
      return Response.json({ error: "Không tìm thấy tệp âm thanh" }, { status: 400 });
    }

    validateAudioSize(audioFile);

    // Build FormData for Groq Whisper
    const groqForm = new FormData();
    groqForm.append("file", audioFile, "recording.webm");
    groqForm.append("model", "whisper-large-v3-turbo");
    groqForm.append("response_format", "verbose_json"); // gives word timestamps
    groqForm.append("language", "en");                  // force English recognition
    groqForm.append("timestamp_granularities[]", "word"); // word-level timestamps

    const res = await fetch(GROQ_WHISPER_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      },
      body: groqForm,
    });

    if (!res.ok) {
      const errText = await res.text();
      console.error("Groq Whisper error:", errText);
      return Response.json(
        { error: "Phiên âm thất bại", detail: errText },
        { status: 502 }
      );
    }

    const data = await res.json();

    // Return transcript + word-level timing
    return Response.json({
      transcript: data.text || "",
      words: data.words || [],         // [{word, start, end}]
      duration: data.duration || 0,    // seconds
      language: data.language || "en",
    });
  } catch (e) {
    console.error("Transcribe error:", e);
    if (e.message === "Audio file too large") return Response.json({ error: "Tệp âm thanh quá lớn (tối đa 25MB)." }, { status: 413 });
    if (e.message === "Input too long") return Response.json({ error: "Dữ liệu đầu vào quá dài." }, { status: 413 });
    return Response.json({ error: "Lỗi hệ thống nội bộ" }, { status: 500 });
  }
}
