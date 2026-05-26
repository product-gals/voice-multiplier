// GET    /api/posts  → { count, latestAt, recent: CorpusPost[] }   (recent = up to 5)
// DELETE /api/posts  → { ok: true, deleted: number }                clears the user's corpus
//
// Ingest (CSV upload) lives at /api/posts/ingest. RLS gates rows to the
// signed-in user — middleware already gates the route itself.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const [{ count, error: countErr }, { data: rows, error: recentErr }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id),
      supabase
        .from("posts")
        .select("id, text, created_at, url")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5),
    ]);

  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }
  if (recentErr) {
    return NextResponse.json({ error: recentErr.message }, { status: 500 });
  }

  const recent = (rows ?? []).map((r) => ({
    id: r.id,
    text: r.text,
    createdAt: r.created_at,
    url: r.url,
  }));

  return NextResponse.json({
    count: count ?? 0,
    latestAt: recent[0]?.createdAt ?? null,
    recent,
  });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Use head:true count to report how many we removed without round-tripping rows.
  const { count: before, error: countErr } = await supabase
    .from("posts")
    .select("id", { count: "exact", head: true })
    .eq("user_id", user.id);
  if (countErr) {
    return NextResponse.json({ error: countErr.message }, { status: 500 });
  }

  const { error: delErr } = await supabase
    .from("posts")
    .delete()
    .eq("user_id", user.id);
  if (delErr) {
    return NextResponse.json({ error: delErr.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, deleted: before ?? 0 });
}
