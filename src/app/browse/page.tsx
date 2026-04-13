import {
  filterByArea,
  filterByCategory,
  intersectMeals,
  listAreas,
  listCategories,
  searchByFirstLetter,
  searchByName,
} from "@/lib/mealdb/client";
import type { MealPreview } from "@/lib/mealdb/types";
import { MealGrid } from "@/components/meal-grid";
import { SidebarFilters } from "@/components/sidebar-filters";

type SearchParams = { q?: string; category?: string; area?: string };

export default async function BrowsePage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { q, category, area } = await searchParams;
  const activeFilters = [q, category, area].filter(Boolean).length;

  const [categories, areas, meals] = await Promise.all([
    listCategories(),
    listAreas(),
    activeFilters > 0
      ? fetchBrowseResults({ q, category, area })
      : fetchDiscoverMeals(),
  ]);

  return (
    <div className="flex-1 flex flex-col lg:flex-row gap-8 px-6 py-8 max-w-7xl mx-auto w-full">
      <div className="lg:w-56 lg:shrink-0">
        <SidebarFilters categories={categories} areas={areas} />
      </div>
      <div className="flex-1 min-w-0">
        <h1 className="text-xl font-semibold tracking-tight mb-1">
          {activeFilters > 0 ? "Browse meals" : "Discover meals"}
        </h1>
        <p className="text-sm text-zinc-500 mb-6">
          {activeFilters > 0
            ? `${meals.length} result${meals.length === 1 ? "" : "s"}`
            : "Search or filter on the left to narrow it down."}
        </p>
        <MealGrid
          meals={meals}
          emptyMessage={
            activeFilters === 0
              ? "Couldn't load meals right now. Try searching instead."
              : "No meals match those filters."
          }
        />
      </div>
    </div>
  );
}

/**
 * Picks three letters seeded by the current hour (UTC) and merges the
 * results. Fetching multiple letters avoids the sparse-letter problem
 * (u, q, w, x, y, z return 0–1 meals each, which left the page nearly
 * empty on those hours). Offsets are relatively prime to 26 so the trio
 * always mixes a high-density letter.
 */
async function fetchDiscoverMeals(): Promise<MealPreview[]> {
  const hour = new Date().getUTCHours();
  const alphabet = "abcdefghijklmnopqrstuvwxyz";
  const letters = [
    alphabet[hour % 26],
    alphabet[(hour + 9) % 26],
    alphabet[(hour + 17) % 26],
  ];

  const results = await Promise.all(letters.map((l) => searchByFirstLetter(l)));
  const seen = new Set<string>();
  const merged: MealPreview[] = [];
  for (const arr of results) {
    for (const m of arr) {
      if (seen.has(m.id)) continue;
      seen.add(m.id);
      merged.push({
        id: m.id,
        name: m.name,
        thumbnail: m.thumbnail,
        category: m.category,
        area: m.area,
      });
    }
  }
  return merged;
}

async function fetchBrowseResults({
  q,
  category,
  area,
}: SearchParams): Promise<MealPreview[]> {
  const requests: Promise<MealPreview[]>[] = [];

  if (q) {
    // searchByName returns full meal details — carry category/area through
    // so the preview cards can render chips without an extra lookup.
    requests.push(
      searchByName(q).then((list) =>
        list.map((m) => ({
          id: m.id,
          name: m.name,
          thumbnail: m.thumbnail,
          category: m.category,
          area: m.area,
        })),
      ),
    );
  }
  if (category) requests.push(filterByCategory(category));
  if (area) requests.push(filterByArea(area));

  if (requests.length === 0) return [];
  const results = await Promise.all(requests);
  return intersectMeals(...results);
}
