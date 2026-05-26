-- Grant the authenticated role table-level access. RLS policies in earlier
-- migrations enforce per-user scoping, but RLS only runs *after* role-level
-- GRANTs allow the query at all. Without these, every API route returns 500
-- with "permission denied for table ...".
--
-- Normally supplied automatically when tables are created via Supabase CLI;
-- needed explicitly when migrations are applied through the SQL editor.

grant usage on schema public to authenticated;

grant select, insert, update, delete on table public.voice_profiles    to authenticated;
grant select, insert, update, delete on table public.user_preferences  to authenticated;
grant select, insert, update, delete on table public.posts             to authenticated;
grant select, insert, update, delete on table public.drafts            to authenticated;
grant select, insert, update, delete on table public.chats             to authenticated;
grant select, insert, update, delete on table public.chat_messages     to authenticated;
