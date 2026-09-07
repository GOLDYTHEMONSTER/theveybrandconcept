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
    requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet: Array<{ name: string; value: string; options: CookieOptions }>) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, {
                ...options,
                httpOnly: true,
                sameSite: "lax",
                secure: process.env.NODE_ENV === "production",
                path: "/",
              });
            });
          } catch {
            // Server Components cannot write cookies. Route handlers can.
          }
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
    requireEnvironmentVariable("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnvironmentVariable("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );
}

function requireEnvironmentVariable(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`Missing required environment variable: ${name}`);
  return value;
}
