// POST /api/posts/ingest
//   Content-Type: multipart/form-data
//   field: file = Shares.csv
//   query: ?mode=replace (default) | append
//
// Parses the LinkedIn data-export Shares.csv and upserts rows into public.posts
// for the signed-in user. RLS scopes everything to auth.uid().
//
// Returns: { inserted, skippedNoText, skippedTooShort, total }

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { isAllowed } from "@/lib/auth-allowlist";
import { parseSharesCsv } from "@/lib/linkedin-shares";

export const runtime = "nodejs";

// Cap upload size. LinkedIn exports are tiny — a 10MB ceiling is generous and
// keeps a malicious client from eating server memory.
const MAX_BYTES = 10 * 1024 * 1024;
// Supabase rejects very large upserts; chunk so we stay well under PostgREST's
// default row/payload limits.
const UPSERT_CHUNK = 500;

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user || !isAllowed(user.email)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(request.url);
  const mode = url.searchParams.get("mode") === "append" ? "append" : "replace";

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json(
      { error: "Expected multipart/form-data with a 'file' field" },
      { status: 400 },
    );
  }

  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Missing 'file' field (expected Shares.csv upload)" },
      { status: 400 },
    );
  }
  if (file.size > MAX_BYTES) {
    return NextResponse.json(
      { error: `File too large (max ${MAX_BYTES / 1024 / 1024} MB)` },
      { status: 413 },
    );
  }

  const raw = await file.text();
  let parsed;
  try {
    parsed = parseSharesCsv(raw);
  } catch (e) {
    return NextResponse.json(
      { error: `CSV parse failed: ${e instanceof Error ? e.message : "unknown"}` },
      { status: 400 },
    );
  }

  if (parsed.posts.length === 0) {
    return NextResponse.json(
      {
        error:
          "No usable posts found in the CSV. Make sure you uploaded Shares.csv from your LinkedIn data export.",
        skippedNoText: parsed.skippedNoText,
        skippedTooShort: parsed.skippedTooShort,
      },
      { status: 400 },
    );
  }

  // Replace mode: wipe the user's existing rows before insert so re-ingesting
  // a re-exported CSV doesn't leave deleted posts behind.
  if (mode === "replace") {
    const { error: delErr } = await supabase
      .from("posts")
      .delete()
      .eq("user_id", user.id);
    if (delErr) {
      return NextResponse.json({ error: delErr.message }, { status: 500 });
    }
  }

  const rows = parsed.posts.map((p) => ({
    user_id: user.id,
    id: p.id,
    text: p.text,
    created_at: p.createdAt,
    url: p.url,
    reactions: p.reactions,
    comments: p.comments,
    ingested_at: new Date().toISOString(),
  }));

  let inserted = 0;
  for (let i = 0; i < rows.length; i += UPSERT_CHUNK) {
    const chunk = rows.slice(i, i + UPSERT_CHUNK);
    const { error } = await supabase
      .from("posts")
      .upsert(chunk, { onConflict: "user_id,id" });
    if (error) {
      return NextResponse.json(
        {
          error: `Insert failed at chunk starting ${i}: ${error.message}`,
          inserted,
        },
        { status: 500 },
      );
    }
    inserted += chunk.length;
  }

  return NextResponse.json({
    inserted,
    skippedNoText: parsed.skippedNoText,
    skippedTooShort: parsed.skippedTooShort,
    total: parsed.posts.length,
    mode,
  });
}
