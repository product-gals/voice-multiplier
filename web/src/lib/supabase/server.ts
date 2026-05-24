// Server-side Supabase client for Server Components, Route Handlers, and Server Actions.
// Uses the anon key + Next.js cookies() so RLS policies see the authenticated user.
//
// Import pattern (note: createClient is async because Next 16's cookies() returns a Promise):
//   const supabase = await createClient();
//   const { data: { user } } = await supabase.auth.getUser();
//
// For admin operations that need to bypass RLS (rare — only for trusted server jobs),
// use createServiceClient() instead, which uses the service role key.

import { createServerClient } from "@supabase/ssr";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

function requireEnv(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(
      `Missing required env var: ${name}. Add it to web/.env.local (see Supabase project → Settings → API).`,
    );
  }
  return value;
}

export async function createClient() {
  const cookieStore = await cookies();

  return createServerClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY"),
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Called from a Server Component — cookies are read-only there.
            // The middleware refreshes the session, so this is safe to swallow.
          }
        },
      },
    },
  );
}

// Service-role client. BYPASSES RLS. Use sparingly — only in trusted server contexts
// (e.g., admin maintenance routes, scheduled jobs). Never import this from a Client Component.
export function createServiceClient() {
  return createSupabaseClient(
    requireEnv("NEXT_PUBLIC_SUPABASE_URL"),
    requireEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
