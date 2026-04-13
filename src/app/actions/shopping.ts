"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { lookupMeal } from "@/lib/mealdb/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types";

// Patterns that indicate a measurement unit (so "2 eggs" is countable but
// "200g flour" / "1/2 cup milk" / "1 tsp salt" aren't).
// Matches both space-separated ("500 g") and attached ("500g") forms.
const MEASURED_UNIT = /\b(g|kg|mg|ml|l|tsp|tbsp|cup|cups|oz|lb|pound|pounds|gram|grams|kilogram|kilograms|liter|liters|litre|litres|milliliter|milliliters|teaspoon|teaspoons|tablespoon|tablespoons|ounce|ounces)\b/i;
const ATTACHED_UNIT = /\d(g|kg|mg|ml|l|oz|lb)\b/i;

/**
 * Parses a measure string into a numeric count if it represents a simple
 * countable quantity (e.g., "2", "2 eggs", "1 large onion"). Returns null
 * when the measure uses a real measurement unit or isn't parseable.
 */
function parseCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (MEASURED_UNIT.test(trimmed)) return null;
  if (ATTACHED_UNIT.test(trimmed)) return null;

  // Leading number: integer, decimal, or simple fraction.
  const m = trimmed.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:\s|$|[^\d\s])/);
  if (!m) return null;
  if (m[1].includes("/")) {
    const [num, den] = m[1].split("/").map(Number);
    return den ? num / den : null;
  }
  return parseFloat(m[1]);
}

/**
 * Aggregates multiple measure strings for the same ingredient.
 * - If every measure parses as a simple count, sum them and store as
 *   { quantity: N, unit: null } so the UI renders just "3".
 * - Otherwise fall back to concatenating the raw strings (real units are
 *   hard to sum cleanly, so keep the original measures visible).
 */
function aggregateMeasures(measures: string[]): {
  quantity: number | null;
  unit: string | null;
} {
  if (measures.length === 0) return { quantity: null, unit: null };

  const counts = measures.map(parseCount);
  if (counts.every((c): c is number => c !== null)) {
    const sum = counts.reduce((a, b) => a + b, 0);
    // Round to 2 decimals to avoid floating-point ugliness (e.g., 1/3 + 1/3).
    const rounded = Math.round(sum * 100) / 100;
    return { quantity: rounded, unit: null };
  }

  return { quantity: null, unit: measures.join(" + ") };
}

export async function addShoppingItem(input: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("shopping_list_items").insert({
    user_id: userId,
    name,
    quantity: input.quantity ?? null,
    unit: (input.unit ?? "").trim() || null,
  });
  if (error) throw error;
  revalidatePath("/shopping");
}

export async function toggleChecked(
  id: string,
  checked: boolean,
): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("shopping_list_items")
    .update({ checked })
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/shopping");
}

export async function updateShoppingItem(
  id: string,
  patch: {
    name?: string;
    quantity?: number | null;
    unit?: string | null;
  },
): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const payload: TablesUpdate<"shopping_list_items"> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("Name is required");
    payload.name = trimmed;
  }
  if (patch.quantity !== undefined) payload.quantity = patch.quantity;
  if (patch.unit !== undefined) payload.unit = (patch.unit ?? "").trim() || null;
  const { error } = await sb
    .from("shopping_list_items")
    .update(payload)
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/shopping");
}

export async function deleteShoppingItem(id: string): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("shopping_list_items")
    .delete()
    .eq("id", id);
  if (error) throw error;
  revalidatePath("/shopping");
}

export async function clearChecked(): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb
    .from("shopping_list_items")
    .delete()
    .eq("checked", true);
  if (error) throw error;
  revalidatePath("/shopping");
}

/**
 * Build a shopping list for the given date range:
 * 1. Read meal_plans in [from, to].
 * 2. Fetch each distinct meal's ingredient list from TheMealDB.
 * 3. Aggregate by lowercased ingredient name, concatenating measures.
 * 4. Subtract ingredients whose name is already in the pantry.
 * 5. Bulk-insert the remainder into shopping_list_items.
 */
export async function generateFromPlan(range: {
  from: string;
  to: string;
}): Promise<{ added: number }> {
  const userId = await requireUser();
  const sb = await createSupabaseServerClient();

  const { data: plans, error: plansErr } = await sb
    .from("meal_plans")
    .select("meal_id")
    .gte("planned_for", range.from)
    .lte("planned_for", range.to);
  if (plansErr) throw plansErr;
  if (!plans || plans.length === 0) return { added: 0 };

  // Fetch each distinct meal once; Next's fetch cache would dedupe anyway,
  // but uniquifying here keeps lookups O(N_distinct) not O(N_plans).
  const distinctIds = [...new Set(plans.map((p) => p.meal_id))];
  const details = await Promise.all(distinctIds.map((id) => lookupMeal(id)));
  const detailById = new Map(
    details
      .filter((d): d is NonNullable<typeof d> => d !== null)
      .map((d) => [d.id, d]),
  );

  // Aggregate by lowercased ingredient name. Measures are free-form strings
  // (TheMealDB returns things like "1/2 cup", "to taste") — we don't try to
  // parse or sum them, just concatenate for human reference.
  type Agg = {
    name: string;
    measures: string[];
    source_meal_id: string | null;
  };
  const agg = new Map<string, Agg>();
  for (const plan of plans) {
    const meal = detailById.get(plan.meal_id);
    if (!meal) continue;
    for (const ing of meal.ingredients) {
      const key = ing.name.toLowerCase();
      const existing = agg.get(key);
      if (existing) {
        if (ing.measure) existing.measures.push(ing.measure);
      } else {
        agg.set(key, {
          name: ing.name,
          measures: ing.measure ? [ing.measure] : [],
          source_meal_id: meal.id,
        });
      }
    }
  }

  // Subtract pantry by case-insensitive name match.
  const { data: pantryRows, error: pantryErr } = await sb
    .from("pantry_items")
    .select("name");
  if (pantryErr) throw pantryErr;
  const pantrySet = new Set(
    (pantryRows ?? []).map((p) => p.name.toLowerCase()),
  );
  for (const key of [...agg.keys()]) {
    if (pantrySet.has(key)) agg.delete(key);
  }

  if (agg.size === 0) return { added: 0 };

  const inserts: TablesInsert<"shopping_list_items">[] = [...agg.values()].map(
    (a) => {
      const amount = aggregateMeasures(a.measures);
      return {
        user_id: userId,
        name: a.name,
        quantity: amount.quantity,
        unit: amount.unit,
        checked: false,
        source_meal_id: a.source_meal_id,
      };
    },
  );

  const { error: insertErr } = await sb
    .from("shopping_list_items")
    .insert(inserts);
  if (insertErr) throw insertErr;

  revalidatePath("/shopping");
  return { added: inserts.length };
}
