import { createServiceSupabaseClient } from "@/lib/supabase";

export async function checkRateLimit(userId) {
  const supabase = createServiceSupabaseClient();
  const { data: usage } = await supabase.from("ai_usage").select("*").eq("user_id", userId).single();

  const now = new Date();
  const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

  if (!usage) {
     await supabase.from("ai_usage").insert({ user_id: userId, request_count: 1, last_request_at: now });
     return true;
  }

  if (new Date(usage.last_request_at) < oneHourAgo) {
      await supabase.from("ai_usage").update({ request_count: 1, last_request_at: now }).eq("user_id", userId);
      return true;
  }

  if (usage.request_count >= 30) return false;

  await supabase.from("ai_usage").update({ request_count: usage.request_count + 1 }).eq("user_id", userId);
  return true;
}
