import { createServiceSupabaseClient } from "@/lib/supabase";

export async function checkRateLimit(userId) {
  const supabase = createServiceSupabaseClient();
  const { data, error } = await supabase.rpc("consume_ai_quota", {
    p_user: userId,
    p_limit: 30,
  });

  if (error) {
    console.error("Rate limit RPC error:", error);
    // Fail safe: allow request if RPC fails or table doesn't exist yet
    return true;
  }

  return data === true;
}
