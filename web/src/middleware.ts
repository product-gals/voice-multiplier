import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Routes that don't require a signed-in user.
// Keep this list small — new pages/APIs default to PROTECTED.
const PUBLIC_PAGES = new Set(["/sign-in"]);
const PUBLIC_PATH_PREFIXES = ["/auth/"]; // /auth/callback and any future auth endpoints

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGES.has(pathname)) return true;
  return PUBLIC_PATH_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

export async function middleware(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          // Forward updated cookies on the request (for downstream server code)
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value),
          );
          // Recreate response so the mutated request cookies propagate
          supabaseResponse = NextResponse.next({ request });
          // Set cookies on the response so the browser stores them
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options),
          );
        },
      },
    },
  );

  // Refresh the session token if it's close to expiry, and read the user so
  // we can branch on authentication state below.
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;

  // Public routes pass through (still benefit from the session refresh above).
  if (isPublicPath(pathname)) {
    return supabaseResponse;
  }

  // Authenticated requests pass through.
  if (user) {
    return supabaseResponse;
  }

  // Anonymous request to a protected route — branch on API vs page.
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Page request: redirect to sign-in, preserving the original destination
  // (including any query string) so we can bounce back after sign-in.
  const signInUrl = new URL("/sign-in", request.url);
  signInUrl.searchParams.set("next", pathname + request.nextUrl.search);
  return NextResponse.redirect(signInUrl);
}

export const config = {
  matcher: [
    // Run on all routes except static assets and Next.js internals
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
