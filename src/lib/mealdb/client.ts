import { normalizeMeal, normalizePreview } from "./normalize";
import type { MealDetail, MealPreview, RawMeal, RawMealPreview } from "./types";

// Test API key "1" is fine for development; upgrade to a paid key for production.
const API_BASE = "https://www.themealdb.com/api/json/v1/1";

// Catalog endpoints (categories, areas, ingredient lists) change rarely.
const CATALOG_CACHE = { next: { revalidate: 3600 } } as const;
// Search/filter results — revalidate more often in case the catalog adds meals.
const SEARCH_CACHE = { next: { revalidate: 300 } } as const;

async function fetchMealDb<T>(path: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, init);
  if (!res.ok) {
    throw new Error(`TheMealDB ${path}: ${res.status} ${res.statusText}`);
  }
  return (await res.json()) as T;
}

export async function searchByName(query: string): Promise<MealDetail[]> {
  const data = await fetchMealDb<{ meals: RawMeal[] | null }>(
    `/search.php?s=${encodeURIComponent(query)}`,
    SEARCH_CACHE,
  );
  return (data.meals ?? []).map(normalizeMeal);
}

/**
 * Fetches all meals whose name starts with the given letter. Returns full
 * meal details (not the stripped preview shape). Used to populate the browse
 * page with "discover"-style results when no filters are active.
 */
export async function searchByFirstLetter(letter: string): Promise<MealDetail[]> {
  const ch = letter.slice(0, 1).toLowerCase();
  if (!/^[a-z]$/.test(ch)) return [];
  const data = await fetchMealDb<{ meals: RawMeal[] | null }>(
    `/search.php?f=${ch}`,
    SEARCH_CACHE,
  );
  return (data.meals ?? []).map(normalizeMeal);
}

export async function lookupMeal(id: string): Promise<MealDetail | null> {
  const data = await fetchMealDb<{ meals: RawMeal[] | null }>(
    `/lookup.php?i=${encodeURIComponent(id)}`,
    CATALOG_CACHE,
  );
  const first = data.meals?.[0];
  return first ? normalizeMeal(first) : null;
}

export async function randomMeal(): Promise<MealDetail> {
  const data = await fetchMealDb<{ meals: RawMeal[] }>(`/random.php`, {
    cache: "no-store",
  });
  return normalizeMeal(data.meals[0]);
}

export async function filterByCategory(category: string): Promise<MealPreview[]> {
  const data = await fetchMealDb<{ meals: RawMealPreview[] | null }>(
    `/filter.php?c=${encodeURIComponent(category)}`,
    SEARCH_CACHE,
  );
  return (data.meals ?? []).map(normalizePreview);
}

export async function filterByArea(area: string): Promise<MealPreview[]> {
  const data = await fetchMealDb<{ meals: RawMealPreview[] | null }>(
    `/filter.php?a=${encodeURIComponent(area)}`,
    SEARCH_CACHE,
  );
  return (data.meals ?? []).map(normalizePreview);
}

export async function filterByIngredient(ingredient: string): Promise<MealPreview[]> {
  const data = await fetchMealDb<{ meals: RawMealPreview[] | null }>(
    `/filter.php?i=${encodeURIComponent(ingredient)}`,
    SEARCH_CACHE,
  );
  return (data.meals ?? []).map(normalizePreview);
}

export async function listCategories(): Promise<string[]> {
  const data = await fetchMealDb<{ meals: { strCategory: string }[] }>(
    `/list.php?c=list`,
    CATALOG_CACHE,
  );
  return data.meals.map((m) => m.strCategory);
}

export async function listAreas(): Promise<string[]> {
  const data = await fetchMealDb<{ meals: { strArea: string }[] }>(
    `/list.php?a=list`,
    CATALOG_CACHE,
  );
  return data.meals.map((m) => m.strArea);
}

export async function listIngredients(): Promise<string[]> {
  const data = await fetchMealDb<{ meals: { strIngredient: string }[] }>(
    `/list.php?i=list`,
    CATALOG_CACHE,
  );
  return data.meals.map((m) => m.strIngredient).filter(Boolean);
}

/**
 * Intersect meal-preview arrays by id.
 * Used to client-side AND multiple filters (TheMealDB has no multi-filter endpoint).
 */
export function intersectMeals(...arrays: MealPreview[][]): MealPreview[] {
  if (arrays.length === 0) return [];
  if (arrays.length === 1) return arrays[0];
  const [first, ...rest] = arrays;
  const otherIdSets = rest.map((a) => new Set(a.map((m) => m.id)));
  return first.filter((m) => otherIdSets.every((s) => s.has(m.id)));
}
