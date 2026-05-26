-- Ozzy chat history: chats + chat_messages.
--
-- Two tables, RLS-gated to auth.uid():
--   chats          one row per Ozzy conversation; title derived from first user message
--   chat_messages  ordered turn-by-turn history (user + assistant), with mode_at_turn snapshot
--
-- Complementary to public.drafts: drafts is one row per generation (learning-loop substrate,
-- no conversation linkage). chat_messages is conversation history — every turn, including
-- chat/brainstorm turns that don't produce a draft.
--
-- Apply manually in Supabase SQL editor (no Supabase CLI workflow yet — mirrors 0001).

-- ---------------------------------------------------------------------------
-- chats
-- ---------------------------------------------------------------------------
create table if not exists public.chats (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  title       text not null default 'New chat',
  mode        text not null default 'draft'
              check (mode in ('draft', 'brainstorm', 'analyze')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists chats_user_updated_at_idx
  on public.chats (user_id, updated_at desc);

alter table public.chats enable row level security;

drop policy if exists "chats select own" on public.chats;
create policy "chats select own"
  on public.chats for select
  using (auth.uid() = user_id);

drop policy if exists "chats insert own" on public.chats;
create policy "chats insert own"
  on public.chats for insert
  with check (auth.uid() = user_id);

drop policy if exists "chats update own" on public.chats;
create policy "chats update own"
  on public.chats for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "chats delete own" on public.chats;
create policy "chats delete own"
  on public.chats for delete
  using (auth.uid() = user_id);

drop trigger if exists chats_touch_updated_at on public.chats;
create trigger chats_touch_updated_at
  before update on public.chats
  for each row execute function public.touch_updated_at();

-- ---------------------------------------------------------------------------
-- chat_messages
-- ---------------------------------------------------------------------------
-- user_id denormalized for simple RLS (mirrors voice_profiles / drafts pattern).
-- No update policy — messages are write-once.
create table if not exists public.chat_messages (
  id            uuid primary key default gen_random_uuid(),
  chat_id       uuid not null references public.chats(id) on delete cascade,
  user_id       uuid not null references auth.users(id) on delete cascade,
  role          text not null check (role in ('user', 'assistant')),
  content       text not null,
  mode_at_turn  text not null
                check (mode_at_turn in ('draft', 'brainstorm', 'analyze')),
  draft         text,
  hook_pattern  text,
  notes         text,
  exemplars     jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists chat_messages_chat_created_at_idx
  on public.chat_messages (chat_id, created_at);

alter table public.chat_messages enable row level security;

drop policy if exists "chat_messages select own" on public.chat_messages;
create policy "chat_messages select own"
  on public.chat_messages for select
  using (auth.uid() = user_id);

drop policy if exists "chat_messages insert own" on public.chat_messages;
create policy "chat_messages insert own"
  on public.chat_messages for insert
  with check (auth.uid() = user_id);

drop policy if exists "chat_messages delete own" on public.chat_messages;
create policy "chat_messages delete own"
  on public.chat_messages for delete
  using (auth.uid() = user_id);
