import type {
  Ingredient,
  MealDetail,
  MealPreview,
  RawMeal,
  RawMealPreview,
} from "./types";

/**
 * Flattens TheMealDB's 20 numbered ingredient/measure columns into an array,
 * skipping empty or whitespace-only slots.
 */
export function flattenIngredients(raw: RawMeal): Ingredient[] {
  const out: Ingredient[] = [];
  for (let i = 1; i <= 20; i++) {
    const name = (raw[`strIngredient${i}`] ?? "").trim();
    const measure = (raw[`strMeasure${i}`] ?? "").trim();
    if (name) out.push({ name, measure });
  }
  return out;
}

/** Splits TheMealDB's comma-separated tag string into a trimmed array. */
export function parseTags(raw: string | null): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

/**
 * Splits free-form instructions into ordered steps.
 * TheMealDB doesn't expose structured steps — recipes arrive as a single
 * string with inconsistent separators. We split on newlines, trim, and strip
 * leading numeric markers ("1.", "1)", "Step 1:", "STEP 1 -", etc.) so the
 * rendered <ol> shows clean numbering.
 */
export function parseInstructionSteps(raw: string): string[] {
  if (!raw) return [];
  return raw
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trim())
    .map((line) => line.replace(/^(?:step\s*)?\d+\s*[.)\-:]+\s*/i, ""))
    .filter(Boolean);
}

export function normalizeMeal(raw: RawMeal): MealDetail {
  return {
    id: raw.idMeal,
    name: raw.strMeal,
    thumbnail: raw.strMealThumb,
    category: raw.strCategory,
    area: raw.strArea,
    instructions: raw.strInstructions,
    tags: parseTags(raw.strTags),
    youtubeUrl: raw.strYoutube?.trim() || null,
    sourceUrl: raw.strSource?.trim() || null,
    ingredients: flattenIngredients(raw),
  };
}

export function normalizePreview(raw: RawMealPreview): MealPreview {
  return {
    id: raw.idMeal,
    name: raw.strMeal,
    thumbnail: raw.strMealThumb,
  };
}
