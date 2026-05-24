import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      // Allowlist check happens *after* exchange because Supabase mints the
      // session as part of the code-for-session flow. If denied, sign back
      // out so the cookie doesn't linger and bounce to sign-in with an error.
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!isAllowed(user?.email)) {
        await supabase.auth.signOut();
        return NextResponse.redirect(`${origin}/sign-in?error=not-allowed`);
      }

      // On Vercel the origin behind a load balancer may differ from the
      // user-facing host. Prefer x-forwarded-host when present.
      const forwardedHost = request.headers.get("x-forwarded-host");
      if (process.env.NODE_ENV === "development") {
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      }
      return NextResponse.redirect(`${origin}${next}`);
    }
  }

  // Code missing or exchange failed — send user back to sign-in
  return NextResponse.redirect(`${origin}/sign-in?error=auth`);
}
