// Browser-side Supabase client for Client Components.
// Uses the anon key only — the service role key must NEVER reach the browser.
//
// Import pattern (this is sync, unlike the server client):
//   const supabase = createClient();
//   const { error } = await supabase.auth.signInWithOtp({ email });

import { createBrowserClient } from "@supabase/ssr";

// NEXT_PUBLIC_* vars must be accessed with literal property names so Next.js
// can statically inline them into the client bundle at build time.
// Dynamic access (process.env[name]) is NOT inlined and breaks in the browser.
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export function createClient() {
  if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error(
      "Missing Supabase env vars. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in web/.env.local (see Supabase project → Settings → API).",
    );
  }
  return createBrowserClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}
