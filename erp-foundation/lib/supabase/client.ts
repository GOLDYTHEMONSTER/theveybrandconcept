import { createBrowserClient } from "@supabase/ssr";

/**
 * Browser client. Anon key only — this is intentionally the ONLY
 * Supabase key that is ever allowed in client-side bundles.
 */
export function createBrowserSupabase() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
