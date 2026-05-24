// Email allowlist for sign-in. Reads ALLOWED_EMAILS from the environment
// (comma-separated, case-insensitive). If unset OR empty, the allowlist is
// considered disabled and all emails are allowed — useful for local dev.
//
// Enforced in /auth/callback after exchangeCodeForSession so we deny *after*
// Supabase has minted a session. The callback signs the user back out and
// redirects to /sign-in?error=not-allowed.

function parseList(raw: string | undefined): Set<string> {
  if (!raw) return new Set();
  return new Set(
    raw
      .split(",")
      .map((e) => e.trim().toLowerCase())
      .filter((e) => e.length > 0),
  );
}

export function isAllowlistEnabled(): boolean {
  return parseList(process.env.ALLOWED_EMAILS).size > 0;
}

export function isAllowed(email: string | null | undefined): boolean {
  if (!email) return false;
  const list = parseList(process.env.ALLOWED_EMAILS);
  // Disabled allowlist → everyone allowed (dev convenience)
  if (list.size === 0) return true;
  return list.has(email.trim().toLowerCase());
}
