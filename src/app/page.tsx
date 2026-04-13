import { auth, currentUser } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { MealCard } from "@/components/meal-card";
import { addDaysISO, todayISO } from "@/lib/data/meal-plans";
import { getRecommendations } from "@/lib/data/recommendations";
import { lookupMeal, randomMeals } from "@/lib/mealdb/client";
import type { MealDetail, MealPreview } from "@/lib/mealdb/types";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export default async function Home() {
  const session = await auth();
  const [featured, recommendations] = await Promise.all([
    randomMeals(6),
    session.userId ? getRecommendations(6) : Promise.resolve([]),
  ]);

  return (
    <main className="flex-1 w-full">
      {session.userId ? <Dashboard userId={session.userId} /> : <Hero />}
      {recommendations.length > 0 && <Recommended meals={recommendations} />}
      <FeaturedMeals meals={featured} />
    </main>
  );
}

function Hero() {
  return (
    <section className="border-b border-black/5 dark:border-white/10">
      <div className="max-w-5xl mx-auto px-6 py-16 text-center">
        <h1 className="text-4xl sm:text-5xl font-semibold tracking-tight mb-4">
          Plan your week&apos;s meals.
        </h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400 mb-6 max-w-xl mx-auto">
          Discover recipes, save favorites, schedule meals, and auto-generate
          shopping lists from your plan.
        </p>
        <div className="flex gap-3 justify-center flex-wrap">
          <Link
            href="/browse"
            className="inline-flex items-center justify-center rounded-full bg-foreground text-background px-5 h-10 text-sm font-medium hover:opacity-90"
          >
            Browse meals
          </Link>
          <Link
            href="/surprise"
            className="inline-flex items-center justify-center rounded-full border border-black/10 dark:border-white/15 px-5 h-10 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
          >
            Surprise me
          </Link>
        </div>
      </div>
    </section>
  );
}

async function Dashboard({ userId: _userId }: { userId: string }) {
  // RLS scopes all queries to the current user; no need to filter by userId.
  const user = await currentUser();
  const sb = await createSupabaseServerClient();
  const today = todayISO();
  const weekEnd = addDaysISO(today, 6);

  const [favoritesRes, upcomingRes, weekPlannedRes, shoppingRes] =
    await Promise.all([
      sb.from("favorites").select("*", { count: "exact", head: true }),
      sb
        .from("meal_plans")
        .select("id, meal_id, planned_for, meal_slot")
        .gte("planned_for", today)
        .order("planned_for", { ascending: true })
        .order("meal_slot", { ascending: true })
        .limit(3),
      sb
        .from("meal_plans")
        .select("*", { count: "exact", head: true })
        .gte("planned_for", today)
        .lte("planned_for", weekEnd),
      sb
        .from("shopping_list_items")
        .select("*", { count: "exact", head: true })
        .eq("checked", false),
    ]);

  const upcomingRaw = upcomingRes.data ?? [];
  const hydrated = (
    await Promise.all(
      upcomingRaw.map(async (row) => {
        const meal = await lookupMeal(row.meal_id);
        return meal ? { ...row, meal } : null;
      }),
    )
  ).filter((h): h is NonNullable<typeof h> => h !== null);

  const greeting = user?.firstName || user?.username || "there";

  return (
    <section className="border-b border-black/5 dark:border-white/10">
      <div className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-start justify-between gap-4 flex-wrap mb-6">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight mb-1">
              Hi, {greeting}.
            </h1>
            <p className="text-sm text-zinc-500">
              Here&apos;s your week at a glance.
            </p>
          </div>
          <Link
            href="/surprise"
            className="inline-flex items-center gap-1.5 rounded-full border border-black/10 dark:border-white/15 px-4 h-9 text-sm font-medium hover:bg-black/5 dark:hover:bg-white/10"
            title="Jump to a random meal"
          >
            <span aria-hidden>🎲</span>
            Surprise me
          </Link>
        </div>

        <div className="flex flex-wrap gap-2 mb-8">
          <StatChip
            label={`${favoritesRes.count ?? 0} favorites`}
            href="/favorites"
          />
          <StatChip
            label={`${weekPlannedRes.count ?? 0} meals planned this week`}
            href="/plan"
          />
          <StatChip
            label={`${shoppingRes.count ?? 0} shopping items`}
            href="/shopping"
          />
        </div>

        <h2 className="text-sm font-medium text-zinc-600 dark:text-zinc-400 mb-3">
          Up next
        </h2>
        {hydrated.length === 0 ? (
          <div className="text-sm text-zinc-500 p-4 rounded-lg border border-dashed border-black/10 dark:border-white/15">
            Nothing scheduled.{" "}
            <Link href="/browse" className="underline">
              Browse meals
            </Link>{" "}
            and click Schedule on any recipe.
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-3">
            {hydrated.map((u) => (
              <li key={u.id}>
                <Link
                  href={`/meals/${u.meal.id}`}
                  className="flex gap-3 p-3 rounded-lg border border-black/[.06] dark:border-white/10 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900 h-full"
                >
                  <div className="relative w-14 h-14 shrink-0 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                    <Image
                      src={u.meal.thumbnail}
                      alt=""
                      fill
                      sizes="56px"
                      className="object-cover"
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs text-zinc-500 capitalize">
                      {formatRelativeDay(u.planned_for)} · {u.meal_slot}
                    </div>
                    <div className="text-sm font-medium line-clamp-2 leading-tight">
                      {u.meal.name}
                    </div>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  );
}

function StatChip({ label, href }: { label: string; href: string }) {
  return (
    <Link
      href={href}
      className="text-xs px-3 py-1.5 rounded-full bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition"
    >
      {label}
    </Link>
  );
}

function Recommended({ meals }: { meals: MealPreview[] }) {
  return (
    <section className="max-w-5xl mx-auto px-6 py-10 border-b border-black/5 dark:border-white/10">
      <div className="flex items-baseline justify-between mb-1">
        <h2 className="text-lg font-semibold tracking-tight">
          Recommended for you
        </h2>
        <Link
          href="/favorites"
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline-offset-2 hover:underline"
        >
          Your favorites →
        </Link>
      </div>
      <p className="text-xs text-zinc-500 mb-4">
        Picked from categories and cuisines you&apos;ve favorited before.
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {meals.map((m) => (
          <MealCard key={m.id} meal={m} />
        ))}
      </div>
    </section>
  );
}

function FeaturedMeals({ meals }: { meals: MealDetail[] }) {
  if (meals.length === 0) return null;
  return (
    <section className="relative border-y border-black/5 dark:border-white/10 bg-gradient-to-br from-amber-50 via-orange-50 to-rose-50 dark:from-amber-950/20 dark:via-orange-950/20 dark:to-rose-950/20">
      <div className="max-w-5xl mx-auto px-6 py-14">
        <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
          <div>
            <div className="inline-flex items-center gap-2 text-[11px] font-medium text-amber-700 dark:text-amber-400 bg-white/70 dark:bg-zinc-950/40 rounded-full px-2.5 py-0.5 mb-2 border border-amber-200/60 dark:border-amber-900/40">
              <span aria-hidden>✨</span> Fresh picks
            </div>
            <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight">
              Something new to try
            </h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400 mt-1">
              Six random recipes — refreshed every time you reload.
            </p>
          </div>
          <Link
            href="/browse"
            className="text-sm text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white self-end underline-offset-2 hover:underline"
          >
            Browse all →
          </Link>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {meals.map((m) => (
            <MealCard
              key={m.id}
              meal={{
                id: m.id,
                name: m.name,
                thumbnail: m.thumbnail,
                category: m.category,
                area: m.area,
              }}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function formatRelativeDay(iso: string): string {
  const today = todayISO();
  const tomorrow = addDaysISO(today, 1);
  if (iso === today) return "Today";
  if (iso === tomorrow) return "Tomorrow";
  const d = new Date(`${iso}T00:00:00`);
  return d.toLocaleDateString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}
