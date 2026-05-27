-- Saved drafts: explicit "I like this" signal on top of the auto-log.
--
-- The drafts table already captures every Ozzy generation (kind='originator')
-- and every multiplier output (kind='multiplier') for the future learning loop.
-- This migration adds a curated layer:
--   - drafts.saved_at        non-null = the user starred this draft
--   - chat_messages.draft_id back-link so a rehydrated chat turn knows which
--                            drafts row corresponds to its draft, and the UI
--                            can show the right star state.
--
-- Apply manually in Supabase SQL editor.

-- ---------------------------------------------------------------------------
-- drafts.saved_at
-- ---------------------------------------------------------------------------
alter table public.drafts
  add column if not exists saved_at timestamptz;

-- Partial index: only the saved rows, ordered for sidebar listing.
create index if not exists drafts_saved_idx
  on public.drafts (user_id, saved_at desc)
  where saved_at is not null;

-- ---------------------------------------------------------------------------
-- chat_messages.draft_id
-- ---------------------------------------------------------------------------
-- Nullable: brainstorm/analyze turns never produce a draft row. On delete set
-- null so deleting a draft row doesn't cascade through chat history.
alter table public.chat_messages
  add column if not exists draft_id uuid
    references public.drafts(id) on delete set null;
