import { MealGrid } from "@/components/meal-grid";
import { listFavorites } from "@/lib/data/favorites";
import { lookupMeal } from "@/lib/mealdb/client";

export default async function FavoritesPage() {
  const rows = await listFavorites();

  // Hydrate each favorite with TheMealDB data (name, thumbnail).
  // `lookupMeal` calls are cached by Next (1-hour revalidate), so repeat visits are cheap.
  const meals = (await Promise.all(rows.map((r) => lookupMeal(r.meal_id))))
    .filter((m): m is NonNullable<typeof m> => m !== null)
    .map((m) => ({ id: m.id, name: m.name, thumbnail: m.thumbnail }));

  return (
    <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Your favorites</h1>
      <p className="text-sm text-zinc-500 mb-6">
        {meals.length === 0
          ? "Nothing saved yet."
          : `${meals.length} saved meal${meals.length === 1 ? "" : "s"}.`}
      </p>
      <MealGrid
        meals={meals}
        emptyMessage="Browse meals and tap the heart to save them here."
      />
    </div>
  );
}
