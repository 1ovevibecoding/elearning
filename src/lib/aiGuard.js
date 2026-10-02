import { auth } from "@clerk/nextjs/server";
import { checkRateLimit } from "@/lib/rateLimiter";
import { validateInput } from "@/lib/validation";
import { handleAIError } from "@/lib/ai";

export async function withAiGuard(request, handler) {
  const { userId } = await auth();
  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const allowed = await checkRateLimit(userId);
    if (!allowed) {
      return Response.json({ error: "Vượt quá giới hạn yêu cầu (tối đa 30 lần/giờ)" }, { status: 429 });
    }

    const contentType = request.headers.get("content-type") || "";
    if (contentType.includes("application/json")) {
      const body = await request.clone().json();
      validateInput(JSON.stringify(body), 10000);
      return await handler(body, userId, request);
    } else {
      return await handler(null, userId, request);
    }
  } catch (e) {
    if (e.message === "Input too long" || e.message === "Audio file too large") {
      return Response.json({ error: "Dữ liệu đầu vào quá lớn" }, { status: 413 });
    }
    console.error("AI Guard Error:", e);
    return handleAIError(e);
  }
}
