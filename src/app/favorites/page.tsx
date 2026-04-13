import Image from "next/image";
import Link from "next/link";
import { TagPicker } from "@/components/tag-picker";
import { listFavoritesWithTags, listMyTags } from "@/lib/data/tags";
import { lookupMeal } from "@/lib/mealdb/client";

export default async function FavoritesPage() {
  const [favorites, allTags] = await Promise.all([
    listFavoritesWithTags(),
    listMyTags(),
  ]);

  // Hydrate each favorite with TheMealDB data (cached by Next's 1h revalidate).
  const hydrated = (
    await Promise.all(
      favorites.map(async (f) => {
        const meal = await lookupMeal(f.meal_id);
        return meal ? { ...f, meal } : null;
      }),
    )
  ).filter((f): f is NonNullable<typeof f> => f !== null);

  return (
    <div className="flex-1 max-w-5xl mx-auto px-6 py-8 w-full">
      <h1 className="text-xl font-semibold tracking-tight mb-1">Your favorites</h1>
      <p className="text-sm text-zinc-500 mb-6">
        {hydrated.length === 0
          ? "Nothing saved yet."
          : `${hydrated.length} saved meal${hydrated.length === 1 ? "" : "s"}.`}
      </p>

      {hydrated.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8">
          Browse meals and tap the heart to save them here.
        </p>
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2">
          {hydrated.map((f) => (
            <li
              key={f.meal_id}
              className="flex gap-4 p-3 rounded-lg border border-black/[.06] dark:border-white/10 bg-white dark:bg-zinc-950"
            >
              <Link
                href={`/meals/${f.meal.id}`}
                className="relative w-24 h-24 shrink-0 rounded-md overflow-hidden bg-zinc-100 dark:bg-zinc-900"
              >
                <Image
                  src={f.meal.thumbnail}
                  alt={f.meal.name}
                  fill
                  sizes="96px"
                  className="object-cover"
                />
              </Link>
              <div className="min-w-0 flex-1 flex flex-col gap-2">
                <Link
                  href={`/meals/${f.meal.id}`}
                  className="text-sm font-medium leading-snug line-clamp-2 hover:underline"
                >
                  {f.meal.name}
                </Link>
                <p className="text-xs text-zinc-500">
                  {f.meal.category} · {f.meal.area}
                </p>
                <TagPicker
                  mealId={f.meal_id}
                  assigned={f.tags}
                  allTags={allTags}
                />
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
