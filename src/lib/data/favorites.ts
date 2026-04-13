import { auth } from "@clerk/nextjs/server";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type FavoriteRow = {
  meal_id: string;
  created_at: string;
};

/**
 * Lists the current user's favorites. Requires authentication.
 * Call from protected pages (middleware enforces sign-in).
 */
export async function listFavorites(): Promise<FavoriteRow[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("favorites")
    .select("meal_id, created_at")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

/**
 * Returns whether the current user has favorited `mealId`.
 * Safe to call for unauthenticated visitors — returns false.
 */
export async function getFavoriteStatus(mealId: string): Promise<boolean> {
  const { userId } = await auth();
  if (!userId) return false;

  const sb = await createSupabaseServerClient();
  const { count, error } = await sb
    .from("favorites")
    .select("meal_id", { count: "exact", head: true })
    .eq("meal_id", mealId);
  if (error) throw error;
  return (count ?? 0) > 0;
}
