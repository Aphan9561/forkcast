import Image from "next/image";
import Link from "next/link";
import type { MealPreview } from "@/lib/mealdb/types";

type Props = { meal: MealPreview };

export function MealCard({ meal }: Props) {
  const hasTags = meal.category || meal.area;
  return (
    <Link
      href={`/meals/${meal.id}`}
      className="group flex flex-col rounded-lg border border-black/[.06] dark:border-white/10 overflow-hidden bg-white dark:bg-zinc-950 hover:shadow-md transition"
    >
      <div className="relative aspect-square bg-zinc-100 dark:bg-zinc-900">
        <Image
          src={meal.thumbnail}
          alt={meal.name}
          fill
          sizes="(min-width: 1024px) 20vw, (min-width: 640px) 33vw, 50vw"
          className="object-cover group-hover:scale-[1.02] transition-transform"
        />
      </div>
      <div className="p-3 space-y-1.5">
        <h3 className="text-sm font-medium leading-snug line-clamp-2">
          {meal.name}
        </h3>
        {hasTags && (
          <div className="flex flex-wrap gap-1">
            {meal.category && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {meal.category}
              </span>
            )}
            {meal.area && (
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                {meal.area}
              </span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
}
