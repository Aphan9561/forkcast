import Link from "next/link";
import { MealCard } from "@/components/meal-card";
import { randomMeal } from "@/lib/mealdb/client";

export default async function Home() {
  const suggestion = await randomMeal();

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-16 max-w-5xl mx-auto w-full">
      <section className="text-center mb-14 max-w-2xl">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
          Plan your week&apos;s meals.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6">
          Discover recipes, save favorites, schedule meals, and auto-generate
          shopping lists from your plan.
        </p>
        <div className="flex gap-3 justify-center">
          <Link
            href="/browse"
            className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-5 h-10 text-sm font-medium hover:opacity-90"
          >
            Browse meals
          </Link>
          <Link
            href="/plan"
            className="inline-flex items-center justify-center rounded-full border border-black/10 dark:border-white/15 px-5 h-10 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Your meal plan
          </Link>
        </div>
      </section>

      <section className="w-full max-w-xs">
        <h2 className="text-sm font-medium text-zinc-500 mb-3 text-center">
          Today&apos;s suggestion
        </h2>
        <MealCard
          meal={{
            id: suggestion.id,
            name: suggestion.name,
            thumbnail: suggestion.thumbnail,
          }}
        />
      </section>
    </div>
  );
}
