// GET  /api/preferences  → { model: ModelId | null }
// PUT  /api/preferences  body: { model: ModelId }  → { model: ModelId }
//
// 401 if not signed in. RLS on user_preferences enforces the user_id check
// regardless, but we short-circuit early for a cleaner error.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isValidModel } from "@/lib/model-settings";

export const runtime = "nodejs";

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("user_preferences")
    .select("model")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const model = data?.model && isValidModel(data.model) ? data.model : null;
  return NextResponse.json({ model });
}

export async function PUT(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const model = (body as { model?: unknown })?.model;
  if (!isValidModel(model)) {
    return NextResponse.json({ error: "Invalid model" }, { status: 400 });
  }

  const { error } = await supabase
    .from("user_preferences")
    .upsert({ user_id: user.id, model }, { onConflict: "user_id" });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ model });
}
