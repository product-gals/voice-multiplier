// Ozzy chat history — types, title derivation, and fire-and-forget Supabase
// writers. The user-facing response must never wait on these inserts — RLS
// enforces user_id = auth.uid() on the passed client. Mirrors the logDraft
// pattern in drafts-log.ts.

import type { SupabaseClient } from "@supabase/supabase-js";

export type OzzyMode = "draft" | "brainstorm" | "analyze";

export interface ChatSummary {
  id: string;
  title: string;
  mode: OzzyMode;
  created_at: string;
  updated_at: string;
}

export interface StoredExemplar {
  id: string;
  text: string;
  url: string | null;
  score: number;
}

export interface StoredMessage {
  id: string;
  chat_id: string;
  role: "user" | "assistant";
  content: string;
  mode_at_turn: OzzyMode;
  draft: string | null;
  hook_pattern: string | null;
  notes: string | null;
  exemplars: StoredExemplar[] | null;
  // Back-reference to the public.drafts row this turn produced (assistant
  // turns only, and only when a draft was generated). Lets the UI show
  // saved/unsaved state on rehydrated chats.
  draft_id: string | null;
  saved: boolean;
  created_at: string;
}

const TITLE_MAX_CHARS = 60;

export function deriveChatTitle(text: string): string {
  const trimmed = text.trim().replace(/\s+/g, " ");
  if (trimmed.length === 0) return "New chat";
  if (trimmed.length <= TITLE_MAX_CHARS) return trimmed;
  const slice = trimmed.slice(0, TITLE_MAX_CHARS);
  const lastSpace = slice.lastIndexOf(" ");
  const cut = lastSpace > 30 ? slice.slice(0, lastSpace) : slice;
  return `${cut}…`;
}

interface UpsertChatArgs {
  supabase: SupabaseClient;
  id: string;
  userId: string;
  title: string;
  mode: OzzyMode;
}

// Creates the chat row on first turn, no-ops on later turns, then bumps mode
// and updated_at so the sidebar re-orders by recency. Fire-and-forget.
export function upsertChat(args: UpsertChatArgs): void {
  const { supabase, id, userId, title, mode } = args;
  void supabase
    .from("chats")
    .upsert(
      { id, user_id: userId, title, mode },
      { onConflict: "id", ignoreDuplicates: true },
    )
    .then(({ error }) => {
      if (error) console.error("[chat-history] chat upsert failed:", error.message);
    });
  void supabase
    .from("chats")
    .update({ mode })
    .eq("id", id)
    .then(({ error }) => {
      if (error) console.error("[chat-history] chat mode update failed:", error.message);
    });
}

interface LogChatTurnArgs {
  supabase: SupabaseClient;
  id: string;
  chatId: string;
  userId: string;
  role: "user" | "assistant";
  content: string;
  modeAtTurn: OzzyMode;
  draft?: string | null;
  hookPattern?: string | null;
  notes?: string | null;
  exemplars?: StoredExemplar[] | null;
  draftId?: string | null;
}

export function logChatTurn(args: LogChatTurnArgs): void {
  const {
    supabase,
    id,
    chatId,
    userId,
    role,
    content,
    modeAtTurn,
    draft = null,
    hookPattern = null,
    notes = null,
    exemplars = null,
    draftId = null,
  } = args;
  void supabase
    .from("chat_messages")
    .insert({
      id,
      chat_id: chatId,
      user_id: userId,
      role,
      content,
      mode_at_turn: modeAtTurn,
      draft,
      hook_pattern: hookPattern,
      notes,
      exemplars,
      draft_id: draftId,
    })
    .then(({ error }) => {
      if (error) console.error("[chat-history] message insert failed:", error.message);
    });
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export function isUuid(v: unknown): v is string {
  return typeof v === "string" && UUID_RE.test(v);
}
