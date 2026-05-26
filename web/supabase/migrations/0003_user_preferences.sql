-- Voice Multiplier: per-user preferences.
--
-- One row per user. Currently only stores the selected Claude model, but the
-- table is named generically so other small per-user settings can land here
-- without another migration.
--
-- Apply manually in Supabase SQL editor (same workflow as 0001/0002).

create table if not exists public.user_preferences (
  user_id    uuid primary key references auth.users(id) on delete cascade,
  model      text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_preferences enable row level security;

drop policy if exists "user_preferences select own" on public.user_preferences;
create policy "user_preferences select own"
  on public.user_preferences for select
  using (auth.uid() = user_id);

drop policy if exists "user_preferences insert own" on public.user_preferences;
create policy "user_preferences insert own"
  on public.user_preferences for insert
  with check (auth.uid() = user_id);

drop policy if exists "user_preferences update own" on public.user_preferences;
create policy "user_preferences update own"
  on public.user_preferences for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists user_preferences_touch_updated_at on public.user_preferences;
create trigger user_preferences_touch_updated_at
  before update on public.user_preferences
  for each row execute function public.touch_updated_at();
