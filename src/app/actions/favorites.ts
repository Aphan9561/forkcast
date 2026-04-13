"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Toggles the favorite row for the current user + meal.
 * - If the row exists, deletes it.
 * - Otherwise inserts it.
 * Returns the new state so clients can confirm optimistic UI.
 */
export async function toggleFavorite(
  mealId: string,
): Promise<{ favorited: boolean }> {
  const userId = await requireUser();
  const sb = await createSupabaseServerClient();

  const { count, error: countErr } = await sb
    .from("favorites")
    .select("meal_id", { count: "exact", head: true })
    .eq("meal_id", mealId);
  if (countErr) throw countErr;

  if ((count ?? 0) > 0) {
    const { error } = await sb
      .from("favorites")
      .delete()
      .eq("meal_id", mealId);
    if (error) throw error;
  } else {
    const { error } = await sb
      .from("favorites")
      .insert({ user_id: userId, meal_id: mealId });
    if (error) throw error;
  }

  revalidatePath("/favorites");
  revalidatePath(`/meals/${mealId}`);
  return { favorited: (count ?? 0) === 0 };
}
