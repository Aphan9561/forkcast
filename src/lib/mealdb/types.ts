// Types for TheMealDB responses.
// API base: https://www.themealdb.com/api/json/v1/1

/**
 * Raw meal object as returned by `search.php`, `lookup.php`, and `random.php`.
 * Ingredients are flattened across 20 numbered columns (`strIngredient1`..20,
 * `strMeasure1`..20). Unused slots contain empty strings or whitespace — always
 * route through `flattenIngredients` in `./normalize`.
 */
export type RawMeal = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
  strCategory: string;
  strArea: string;
  strInstructions: string;
  strTags: string | null;
  strYoutube: string | null;
  strSource: string | null;
} & Record<string, string | null>;

/**
 * Stripped-down meal returned by `filter.php` and `search.php?f=<letter>`.
 * No ingredients, no instructions — pair with `lookupMeal(id)` for details.
 */
export type RawMealPreview = {
  idMeal: string;
  strMeal: string;
  strMealThumb: string;
};

export type Ingredient = {
  name: string;
  measure: string;
};

export type MealDetail = {
  id: string;
  name: string;
  thumbnail: string;
  category: string;
  area: string;
  instructions: string;
  tags: string[];
  youtubeUrl: string | null;
  sourceUrl: string | null;
  ingredients: Ingredient[];
};

export type MealPreview = {
  id: string;
  name: string;
  thumbnail: string;
  /**
   * Optional — populated when the source call knew the category (either
   * returned it in a full MealDetail or was itself a category filter).
   * filter.php strips this by default, so it's injected by filterByCategory.
   */
  category?: string;
  /** Same story for cuisine/area. */
  area?: string;
};
