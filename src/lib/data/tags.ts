import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type TagRow = {
  id: string;
  name: string;
};

export type FavoriteWithTags = {
  meal_id: string;
  created_at: string;
  tags: TagRow[];
};

export async function listMyTags(): Promise<TagRow[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("tags")
    .select("id, name")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns all favorites for the current user, each with its assigned tag rows
 * denormalized. Uses a nested Supabase embed across the favorite_tags join table.
 */
export async function listFavoritesWithTags(): Promise<FavoriteWithTags[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("favorites")
    .select("meal_id, created_at, favorite_tags(tags(id, name))")
    .order("created_at", { ascending: false })
    .returns<
      Array<{
        meal_id: string;
        created_at: string;
        favorite_tags: Array<{ tags: { id: string; name: string } }>;
      }>
    >();
  if (error) throw error;

  return (data ?? []).map((row) => ({
    meal_id: row.meal_id,
    created_at: row.created_at,
    tags: row.favorite_tags.map((ft) => ft.tags),
  }));
}
