// Browser-side Supabase client for Client Components.
// Uses the anon key only — the service role key must NEVER reach the browser.
//
// Import pattern (this is sync, unlike the server client):
//   const supabase = createClient();
//   const { error } = await supabase.auth.signInWithOtp({ email });

import { createBrowserClient } from "@supabase/ssr";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Add it to web/.env.local (see Supabase project → Settings → API).`,
    );
  }
  return value;
}

export function createClient() {
  return createBrowserClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
  );
}
