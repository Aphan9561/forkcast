-- Address the two WARN-level advisories flagged by Supabase after the initial
-- schema migration:
--   1. function_search_path_mutable on public.clerk_user_id
--   2. extension_in_public on citext
--
-- Both are low-severity hygiene fixes; neither affects behavior.

-- 1. Pin search_path on clerk_user_id() so a malicious schema in the caller's
--    search_path can't shadow auth.jwt(). The function body already uses the
--    fully-qualified auth.jwt() name, so an empty search_path is safe.
create or replace function public.clerk_user_id()
returns text
language sql
stable
set search_path = ''
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- 2. Move the citext extension out of public into Supabase's dedicated
--    extensions schema. citext-typed columns (tags.name) continue to work
--    because Postgres tracks the type by OID, not by schema name.
alter extension citext set schema extensions;
