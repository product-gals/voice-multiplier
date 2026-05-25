-- Voice Multiplier: initial schema.
--
-- Three tables, all RLS-gated to auth.uid():
--   voice_profiles  one row per user; the whole VoiceProfile JSON shape lives in `profile` JSONB
--   posts           per-user LinkedIn corpus (replaces data/posts.json)
--   drafts          log of everything Ozzy / Multiplier produces — substrate for the learning loop
--
-- Apply manually in Supabase SQL editor for now (no Supabase CLI workflow yet).
-- When the CLI is adopted later, rename to <timestamp>_initial_schema.sql.

-- ---------------------------------------------------------------------------
-- voice_profiles
-- ---------------------------------------------------------------------------
create table if not exists public.voice_profiles (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  profile    jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.voice_profiles enable row level security;

drop policy if exists "voice_profiles select own" on public.voice_profiles;
create policy "voice_profiles select own"
  on public.voice_profiles for select
  using (auth.uid() = user_id);

drop policy if exists "voice_profiles insert own" on public.voice_profiles;
create policy "voice_profiles insert own"
  on public.voice_profiles for insert
  with check (auth.uid() = user_id);

drop policy if exists "voice_profiles update own" on public.voice_profiles;
create policy "voice_profiles update own"
  on public.voice_profiles for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "voice_profiles delete own" on public.voice_profiles;
create policy "voice_profiles delete own"
  on public.voice_profiles for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- posts (corpus)
-- ---------------------------------------------------------------------------
-- Composite PK on (user_id, id) so the same LinkedIn share id from different
-- users can coexist (different exports may collide, and the id column is
-- derived from LinkedIn's CSV — not globally unique).
create table if not exists public.posts (
  user_id     uuid not null references auth.users(id) on delete cascade,
  id          text not null,
  text        text not null,
  created_at  timestamptz not null,
  url         text,
  reactions   integer,
  comments    integer,
  ingested_at timestamptz not null default now(),
  primary key (user_id, id)
);

create index if not exists posts_user_created_at_idx
  on public.posts (user_id, created_at desc);

alter table public.posts enable row level security;

drop policy if exists "posts select own" on public.posts;
create policy "posts select own"
  on public.posts for select
  using (auth.uid() = user_id);

drop policy if exists "posts insert own" on public.posts;
create policy "posts insert own"
  on public.posts for insert
  with check (auth.uid() = user_id);

drop policy if exists "posts delete own" on public.posts;
create policy "posts delete own"
  on public.posts for delete
  using (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- drafts
-- ---------------------------------------------------------------------------
-- One row per generation, both originator (Ozzy) and multiplier output.
-- No UI reads this yet — it's substrate for the learning loop later.
create table if not exists public.drafts (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  kind          text not null check (kind in ('originator', 'multiplier')),
  source_post   text,
  target        text,
  output        text not null,
  fit_score     integer,
  hook_pattern  text,
  model         text,
  feedback      text,
  accepted      boolean,
  created_at    timestamptz not null default now()
);

create index if not exists drafts_user_created_at_idx
  on public.drafts (user_id, created_at desc);

alter table public.drafts enable row level security;

drop policy if exists "drafts select own" on public.drafts;
create policy "drafts select own"
  on public.drafts for select
  using (auth.uid() = user_id);

drop policy if exists "drafts insert own" on public.drafts;
create policy "drafts insert own"
  on public.drafts for insert
  with check (auth.uid() = user_id);

drop policy if exists "drafts update own" on public.drafts;
create policy "drafts update own"
  on public.drafts for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- triggers
-- ---------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists voice_profiles_touch_updated_at on public.voice_profiles;
create trigger voice_profiles_touch_updated_at
  before update on public.voice_profiles
  for each row execute function public.touch_updated_at();
