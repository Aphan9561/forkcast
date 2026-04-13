-- Forkcast initial schema
-- Auth: Clerk (third-party provider). user_id columns store the Clerk user ID
-- pulled from the JWT `sub` claim. RLS policies compare `auth.jwt() ->> 'sub'`
-- against each row's user_id.
--
-- Meal IDs are TheMealDB `idMeal` values (numeric strings like "52772"), stored
-- as text so we can add custom user-authored recipes later without a type change.

create extension if not exists citext;

-- Helper: returns the Clerk user ID from the current JWT, or null if unsigned.
create or replace function public.clerk_user_id()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'sub', '');
$$;

-- ---------- meal_slot enum ----------
create type public.meal_slot as enum ('breakfast', 'lunch', 'dinner', 'snack');

-- ---------- favorites ----------
-- A user's saved meals. Composite PK prevents duplicates.
create table public.favorites (
  user_id    text        not null,
  meal_id    text        not null,
  created_at timestamptz not null default now(),
  primary key (user_id, meal_id)
);

alter table public.favorites enable row level security;

create policy "favorites: owner select" on public.favorites
  for select using (user_id = public.clerk_user_id());
create policy "favorites: owner insert" on public.favorites
  for insert with check (user_id = public.clerk_user_id());
create policy "favorites: owner delete" on public.favorites
  for delete using (user_id = public.clerk_user_id());
-- (no update policy — favorites are insert/delete only)

-- ---------- tags ----------
-- User-defined labels, case-insensitive unique per user.
create table public.tags (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  name       citext      not null,
  created_at timestamptz not null default now(),
  unique (user_id, name)
);

alter table public.tags enable row level security;

create policy "tags: owner select" on public.tags
  for select using (user_id = public.clerk_user_id());
create policy "tags: owner insert" on public.tags
  for insert with check (user_id = public.clerk_user_id());
create policy "tags: owner update" on public.tags
  for update using (user_id = public.clerk_user_id())
  with check (user_id = public.clerk_user_id());
create policy "tags: owner delete" on public.tags
  for delete using (user_id = public.clerk_user_id());

-- ---------- favorite_tags (join) ----------
-- Links favorites to tags. Cascades on delete so removing a favorite or tag
-- cleans up its associations.
create table public.favorite_tags (
  user_id text not null,
  meal_id text not null,
  tag_id  uuid not null references public.tags (id) on delete cascade,
  primary key (user_id, meal_id, tag_id),
  foreign key (user_id, meal_id) references public.favorites (user_id, meal_id) on delete cascade
);

create index favorite_tags_tag_id_idx on public.favorite_tags (tag_id);

alter table public.favorite_tags enable row level security;

create policy "favorite_tags: owner select" on public.favorite_tags
  for select using (user_id = public.clerk_user_id());
create policy "favorite_tags: owner insert" on public.favorite_tags
  for insert with check (user_id = public.clerk_user_id());
create policy "favorite_tags: owner delete" on public.favorite_tags
  for delete using (user_id = public.clerk_user_id());

-- ---------- meal_plans ----------
-- Scheduled meals on a calendar. One meal per (date, slot) per user.
create table public.meal_plans (
  id          uuid              primary key default gen_random_uuid(),
  user_id     text              not null,
  planned_for date              not null,
  meal_slot   public.meal_slot  not null,
  meal_id     text              not null,
  notes       text,
  created_at  timestamptz       not null default now(),
  unique (user_id, planned_for, meal_slot)
);

create index meal_plans_user_date_idx on public.meal_plans (user_id, planned_for);

alter table public.meal_plans enable row level security;

create policy "meal_plans: owner select" on public.meal_plans
  for select using (user_id = public.clerk_user_id());
create policy "meal_plans: owner insert" on public.meal_plans
  for insert with check (user_id = public.clerk_user_id());
create policy "meal_plans: owner update" on public.meal_plans
  for update using (user_id = public.clerk_user_id())
  with check (user_id = public.clerk_user_id());
create policy "meal_plans: owner delete" on public.meal_plans
  for delete using (user_id = public.clerk_user_id());

-- ---------- shopping_list_items ----------
-- Items to buy. source_meal_id is set when auto-generated from a meal plan,
-- null when manually added.
create table public.shopping_list_items (
  id              uuid        primary key default gen_random_uuid(),
  user_id         text        not null,
  name            text        not null,
  quantity        numeric,
  unit            text,
  checked         boolean     not null default false,
  source_meal_id  text,
  created_at      timestamptz not null default now()
);

create index shopping_list_items_user_idx on public.shopping_list_items (user_id, checked);

alter table public.shopping_list_items enable row level security;

create policy "shopping: owner select" on public.shopping_list_items
  for select using (user_id = public.clerk_user_id());
create policy "shopping: owner insert" on public.shopping_list_items
  for insert with check (user_id = public.clerk_user_id());
create policy "shopping: owner update" on public.shopping_list_items
  for update using (user_id = public.clerk_user_id())
  with check (user_id = public.clerk_user_id());
create policy "shopping: owner delete" on public.shopping_list_items
  for delete using (user_id = public.clerk_user_id());

-- ---------- pantry_items ----------
-- What the user already has at home. Shopping-list generation can subtract
-- pantry quantities so the user doesn't re-buy.
create table public.pantry_items (
  id         uuid        primary key default gen_random_uuid(),
  user_id    text        not null,
  name       text        not null,
  quantity   numeric,
  unit       text,
  created_at timestamptz not null default now()
);

create index pantry_items_user_idx on public.pantry_items (user_id);

alter table public.pantry_items enable row level security;

create policy "pantry: owner select" on public.pantry_items
  for select using (user_id = public.clerk_user_id());
create policy "pantry: owner insert" on public.pantry_items
  for insert with check (user_id = public.clerk_user_id());
create policy "pantry: owner update" on public.pantry_items
  for update using (user_id = public.clerk_user_id())
  with check (user_id = public.clerk_user_id());
create policy "pantry: owner delete" on public.pantry_items
  for delete using (user_id = public.clerk_user_id());
