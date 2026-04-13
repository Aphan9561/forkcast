-- Add a cooked-at timestamp to meal_plans so users can mark planned meals
-- as actually cooked (vs merely scheduled). Enables queries like
--   "X of Y meals cooked this week"
--   "longest cooking streak"
--   "most-cooked meal this month"
-- without tracking a separate table.
--
-- null      → not yet cooked
-- timestamp → when the user marked it cooked

alter table public.meal_plans
  add column if not exists cooked_at timestamptz;

-- Partial index for quick "cooked in range" aggregate queries. Excludes
-- null rows (the majority) so the index stays small.
create index if not exists meal_plans_user_cooked_idx
  on public.meal_plans (user_id, cooked_at)
  where cooked_at is not null;
