// GET  /api/profile  → { profile: VoiceProfile }  | 404 if none stored
// PUT  /api/profile  body: { profile: VoiceProfile }  → { profile: VoiceProfile }
//
// All routes 401 if the request isn't signed in. RLS on voice_profiles enforces
// the auth.uid() = user_id constraint regardless, but we short-circuit early
// for a cleaner error.

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import type { VoiceProfile } from "@/lib/voice-profile";

export const runtime = "nodejs";

function isProfileShape(value: unknown): value is VoiceProfile {
  if (!value || typeof value !== "object") return false;
  const p = value as Record<string, unknown>;
  // Minimum sanity check — full validation lives client-side for now. We mostly
  // care that this isn't an obviously malformed blob (wrong version, missing
  // required substructures) before we drop it into JSONB.
  if (p.version !== 1) return false;
  if (!p.identity || typeof p.identity !== "object") return false;
  if (!p.voice || typeof p.voice !== "object") return false;
  if (!p.platform_rules || typeof p.platform_rules !== "object") return false;
  return true;
}

export async function GET() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { data, error } = await supabase
    .from("voice_profiles")
    .select("profile")
    .eq("user_id", user.id)
    .maybeSingle();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: "No profile" }, { status: 404 });
  }
  return NextResponse.json({ profile: data.profile });
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
  const profile = (body as { profile?: unknown })?.profile;
  if (!isProfileShape(profile)) {
    return NextResponse.json(
      { error: "Profile failed shape check (expected version=1 with identity/voice/platform_rules)" },
      { status: 400 },
    );
  }

  const { error } = await supabase
    .from("voice_profiles")
    .upsert(
      { user_id: user.id, profile },
      { onConflict: "user_id" },
    );

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ profile });
}

export async function DELETE() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Not signed in" }, { status: 401 });
  }

  const { error } = await supabase
    .from("voice_profiles")
    .delete()
    .eq("user_id", user.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true });
}
