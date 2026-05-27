-- Template mode for Ozzy chats.
--
-- Adds:
--   - chats.template_id          which structural template (if any) the user
--                                picked when starting this chat. Plain text
--                                key from web/src/lib/templates.ts — no FK to
--                                a database table since templates live in
--                                code (curated set, not user-editable).
--   - 'template' added to the mode/mode_at_turn check constraints so the
--     existing OzzyMode column can carry the new value.
--
-- Apply manually in Supabase SQL editor.

alter table public.chats
  add column if not exists template_id text;

alter table public.chats
  drop constraint if exists chats_mode_check;

alter table public.chats
  add constraint chats_mode_check
    check (mode in ('draft', 'brainstorm', 'analyze', 'template'));

alter table public.chat_messages
  drop constraint if exists chat_messages_mode_at_turn_check;

alter table public.chat_messages
  add constraint chat_messages_mode_at_turn_check
    check (mode_at_turn in ('draft', 'brainstorm', 'analyze', 'template'));
