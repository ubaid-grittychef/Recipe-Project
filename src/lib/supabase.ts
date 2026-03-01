import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Server-side client for the factory — uses service role key to bypass RLS.
// The factory schema has "service_role only" policies on all tables.
// NEVER expose the service role key to the browser.
let _client: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient {
  if (!_client) {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    // Prefer service role key (bypasses RLS); fall back to anon only for local dev
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (!url || !key) {
      throw new Error(
        "Factory Supabase is not configured. Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local"
      );
    }
    _client = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return _client;
}

export const supabase = new Proxy({} as SupabaseClient, {
  get(_target, prop) {
    return Reflect.get(getSupabase(), prop);
  },
});

export function createSiteClient(url: string, key: string) {
  return createClient(url, key);
}
