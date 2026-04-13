import { auth } from "@clerk/nextjs/server";
import {
  filterByArea,
  filterByCategory,
  lookupMeal,
} from "@/lib/mealdb/client";
import type { MealPreview } from "@/lib/mealdb/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Builds a set of recommended meals for the signed-in user.
 *
 * Strategy (simple, no ML): look at their most-recent favorites, tally
 * category and cuisine frequency, then pull meals in the top category and
 * top cuisine from TheMealDB. Filter out anything already favorited and
 * interleave results from category + cuisine so recommendations aren't
 * all clustered on one axis.
 *
 * Returns [] for unauthenticated visitors or users with no favorites.
 */
export async function getRecommendations(
  limit = 6,
): Promise<MealPreview[]> {
  const { userId } = await auth();
  if (!userId) return [];

  const sb = await createSupabaseServerClient();
  // Only look at the 10 most recent favorites — older ones may reflect
  // stale tastes and dilute the signal.
  const { data: favorites, error } = await sb
    .from("favorites")
    .select("meal_id")
    .order("created_at", { ascending: false })
    .limit(10);
  if (error) throw error;
  if (!favorites || favorites.length === 0) return [];

  const favoriteIds = new Set(favorites.map((f) => f.meal_id));

  // Look up full details for each favorite so we know its category/cuisine.
  // Each lookupMeal call hits Next's fetch cache so repeat loads are cheap.
  const details = (
    await Promise.all(favorites.map((f) => lookupMeal(f.meal_id)))
  ).filter((d): d is NonNullable<typeof d> => d !== null);

  if (details.length === 0) return [];

  // Tally category + cuisine frequency.
  const catCounts = new Map<string, number>();
  const areaCounts = new Map<string, number>();
  for (const d of details) {
    if (d.category) {
      catCounts.set(d.category, (catCounts.get(d.category) ?? 0) + 1);
    }
    if (d.area) {
      areaCounts.set(d.area, (areaCounts.get(d.area) ?? 0) + 1);
    }
  }

  const topCategory = pickTop(catCounts);
  const topArea = pickTop(areaCounts);
  if (!topCategory && !topArea) return [];

  // Fetch candidate pools in parallel.
  const pools = await Promise.all([
    topCategory ? filterByCategory(topCategory) : Promise.resolve([]),
    topArea ? filterByArea(topArea) : Promise.resolve([]),
  ]);

  // Interleave so the final list mixes both axes.
  const seen = new Set<string>();
  const picks: MealPreview[] = [];
  const maxLen = Math.max(...pools.map((p) => p.length));
  for (let i = 0; i < maxLen && picks.length < limit; i++) {
    for (const pool of pools) {
      const meal = pool[i];
      if (!meal) continue;
      if (favoriteIds.has(meal.id)) continue;
      if (seen.has(meal.id)) continue;
      seen.add(meal.id);
      picks.push(meal);
      if (picks.length >= limit) break;
    }
  }

  return picks;
}

/** Returns the highest-count key, or undefined if the map is empty. */
function pickTop(counts: Map<string, number>): string | undefined {
  let bestKey: string | undefined;
  let bestCount = 0;
  for (const [key, count] of counts) {
    if (count > bestCount) {
      bestKey = key;
      bestCount = count;
    }
  }
  return bestKey;
}
