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

// Fire-and-forget insert into public.drafts. The user-facing response must
// never wait on this — RLS enforces user_id = auth.uid() on the passed client.
export function logDraft(args: LogDraftArgs): void {
  const { supabase, userId, ...rest } = args;
  void supabase
    .from("drafts")
    .insert({ user_id: userId, ...rest })
    .then(({ error }) => {
      if (error) console.error("[drafts-log] insert failed:", error.message);
    });
}
