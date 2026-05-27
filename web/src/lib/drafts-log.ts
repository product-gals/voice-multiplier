import type { SupabaseClient } from "@supabase/supabase-js";

type DraftKind = "originator" | "multiplier";

interface LogDraftArgs {
  supabase: SupabaseClient;
  userId: string;
  kind: DraftKind;
  output: string;
  source_post?: string | null;
  target?: string | null;
  fit_score?: number | null;
  hook_pattern?: string | null;
  model?: string | null;
  feedback?: string | null;
}

// Fire-and-forget insert into public.drafts. Use for multiplier writes where
// the caller doesn't need the row ID. The user-facing response must never wait
// on this — RLS enforces user_id = auth.uid() on the passed client.
export function logDraft(args: LogDraftArgs): void {
  const { supabase, userId, ...rest } = args;
  void supabase
    .from("drafts")
    .insert({ user_id: userId, ...rest })
    .then(({ error }) => {
      if (error) console.error("[drafts-log] insert failed:", error.message);
    });
}

// Awaited insert that returns the new row's ID. Use when the caller needs to
// expose the ID to the client (e.g. so the user can star/save the draft) or
// link it from another table (chat_messages.draft_id). Returns null on error
// so the caller can still respond to the user — saving is non-critical.
export async function logDraftReturningId(
  args: LogDraftArgs,
): Promise<string | null> {
  const { supabase, userId, ...rest } = args;
  const { data, error } = await supabase
    .from("drafts")
    .insert({ user_id: userId, ...rest })
    .select("id")
    .single();
  if (error) {
    console.error("[drafts-log] insert failed:", error.message);
    return null;
  }
  return (data as { id: string }).id;
}
