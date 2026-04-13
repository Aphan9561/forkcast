import { auth } from "@clerk/nextjs/server";
import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BackButton } from "@/components/back-button";
import { FavoriteButton } from "@/components/favorite-button";
import { SchedulePicker } from "@/components/schedule-picker";
import { getFavoriteStatus } from "@/lib/data/favorites";
import { lookupMeal } from "@/lib/mealdb/client";

export default async function MealPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [meal, { userId }] = await Promise.all([lookupMeal(id), auth()]);
  if (!meal) notFound();

  const favorited = userId ? await getFavoriteStatus(meal.id) : false;

  const youtubeId = meal.youtubeUrl ? extractYoutubeId(meal.youtubeUrl) : null;

  return (
    <article className="flex-1 max-w-4xl mx-auto px-6 py-8 w-full">
      <div className="mb-6">
        <BackButton />
      </div>
      <div className="flex flex-col md:flex-row gap-8 mb-8">
        <div className="relative aspect-square w-full md:w-64 md:shrink-0 rounded-lg overflow-hidden bg-zinc-100 dark:bg-zinc-900">
          <Image
            src={meal.thumbnail}
            alt={meal.name}
            fill
            sizes="(min-width: 768px) 256px, 100vw"
            className="object-cover"
            priority
          />
        </div>
        <div className="flex-1 min-w-0">
          <h1 className="text-2xl font-semibold tracking-tight mb-2">{meal.name}</h1>
          <p className="text-sm text-zinc-500 mb-4">
            {meal.category} · {meal.area}
          </p>
          {meal.tags.length > 0 && (
            <ul className="flex flex-wrap gap-1.5 mb-4">
              {meal.tags.map((t) => (
                <li
                  key={t}
                  className="text-xs bg-zinc-100 dark:bg-zinc-800 rounded-full px-2.5 py-1"
                >
                  {t}
                </li>
              ))}
            </ul>
          )}
          <div className="flex gap-2">
            <FavoriteButton
              mealId={meal.id}
              initialFavorited={favorited}
              signedIn={Boolean(userId)}
            />
            <SchedulePicker
              mealId={meal.id}
              mealName={meal.name}
              signedIn={Boolean(userId)}
            />
          </div>
        </div>
      </div>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Ingredients</h2>
        <ul className="grid grid-cols-1 sm:grid-cols-2 gap-y-1.5 gap-x-6 text-sm">
          {meal.ingredients.map((ing, i) => (
            <li
              key={`${ing.name}-${i}`}
              className="flex justify-between gap-4 border-b border-black/5 dark:border-white/10 py-1"
            >
              <span>{ing.name}</span>
              <span className="text-zinc-500">{ing.measure}</span>
            </li>
          ))}
        </ul>
      </section>

      <section className="mb-8">
        <h2 className="font-semibold mb-3">Instructions</h2>
        <div className="whitespace-pre-line text-sm leading-6 text-zinc-800 dark:text-zinc-200">
          {meal.instructions}
        </div>
      </section>

      {youtubeId && (
        <section className="mb-8">
          <h2 className="font-semibold mb-3">Video</h2>
          <div className="aspect-video rounded-lg overflow-hidden bg-black">
            <iframe
              src={`https://www.youtube.com/embed/${youtubeId}`}
              title={`${meal.name} video`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="w-full h-full"
            />
          </div>
        </section>
      )}

      {meal.sourceUrl && (
        <p className="text-sm text-zinc-500">
          Recipe source:{" "}
          <Link
            href={meal.sourceUrl}
            target="_blank"
            rel="noreferrer"
            className="underline hover:text-zinc-900 dark:hover:text-white"
          >
            {meal.sourceUrl}
          </Link>
        </p>
      )}
    </article>
  );
}

function extractYoutubeId(url: string): string | null {
  const m = url.match(/[?&]v=([^&]+)/) ?? url.match(/youtu\.be\/([^?&]+)/);
  return m?.[1] ?? null;
}
