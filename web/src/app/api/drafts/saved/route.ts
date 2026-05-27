import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";

export const runtime = "nodejs";

// GET /api/drafts/saved — sidebar list. Only originator drafts the user has
// explicitly starred, newest first. Output is trimmed for preview.
export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("drafts")
    .select("id, output, hook_pattern, saved_at, created_at")
    .eq("kind", "originator")
    .not("saved_at", "is", null)
    .order("saved_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ drafts: data ?? [] });
}
