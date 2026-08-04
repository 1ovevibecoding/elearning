import { createClient } from "@supabase/supabase-js";

/**
 * Create a Supabase client for use in client components.
 * Uses the anon key — RLS policies enforce user-level access.
 *
 * Pass a Clerk session token to authenticate requests via Supabase RLS.
 */
export function createClerkSupabaseClient(getToken) {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      global: {
        fetch: async (url, options = {}) => {
          const clerkToken = await getToken?.({ template: "supabase" });
          const headers = new Headers(options.headers);
          if (clerkToken) {
            headers.set("Authorization", `Bearer ${clerkToken}`);
          }
          return fetch(url, { ...options, headers });
        },
      },
    }
  );
}

/**
 * Server-side Supabase client (for API routes) — uses service role key
 * so it bypasses RLS. Use carefully.
 */
export function createServiceSupabaseClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
