import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";
import { isUuid } from "@/lib/chat-history";

export const runtime = "nodejs";

interface RouteContext {
  params: Promise<{ id: string }>;
}

// PATCH /api/drafts/:id/save — body { saved: boolean }. Sets saved_at to now()
// or null. Idempotent: re-starring an already-starred draft is a no-op.
export async function PATCH(request: Request, { params }: RouteContext) {
  const { id } = await params;
  if (!isUuid(id)) {
    return NextResponse.json({ error: "Invalid draft id" }, { status: 400 });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { saved?: unknown };
  try {
    body = (await request.json()) as { saved?: unknown };
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  if (typeof body.saved !== "boolean") {
    return NextResponse.json(
      { error: "Body must be { saved: boolean }" },
      { status: 400 },
    );
  }

  const { data, error } = await supabase
    .from("drafts")
    .update({ saved_at: body.saved ? new Date().toISOString() : null })
    .eq("id", id)
    .select("id, saved_at")
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    // RLS hid the row, or it doesn't exist. Either way the client can't act.
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  return NextResponse.json({
    id: data.id,
    saved: data.saved_at != null,
  });
}
