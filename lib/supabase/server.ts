import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { cookies } from "next/headers";
import { createClient as createRawClient } from "@supabase/supabase-js";

/**
 * Server-side Supabase client, bound to the request's cookies.
 * Uses the ANON key — RLS is what actually protects the data.
 * This is the client every API route / server component should use
 * for anything a real user is doing.
 */
export function createServerSupabase() {
  const cookieStore = cookies();

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.get(name)?.value;
        },
        set(name: string, value: string, options: CookieOptions) {
          cookieStore.set({ name, value, ...options });
        },
        remove(name: string, options: CookieOptions) {
          cookieStore.set({ name, value: "", ...options });
        },
      },
    }
  );
}

/**
 * Service-role client. NEVER import this into anything that ships to
 * the browser. Only used for:
 *   - trusted server-side background jobs
 *   - writing to rate_limit_events / audit_logs from edge middleware
 *   - operations that must bypass RLS by design (e.g. cross-org admin tools)
 *
 * If you find yourself reaching for this to "make a query work", that's
 * almost always a sign the RLS policy is wrong — fix the policy instead.
 */
export function createServiceRoleSupabase() {
  if (typeof window !== "undefined") {
    throw new Error("createServiceRoleSupabase() must never run in the browser.");
  }
  return createRawClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { persistSession: false } }
  );
}
