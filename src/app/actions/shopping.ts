"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { lookupMeal } from "@/lib/mealdb/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";

// Patterns that indicate a measurement unit (so "2 eggs" is countable but
// "200g flour" / "1/2 cup milk" / "1 tsp salt" aren't).
// Matches both space-separated ("500 g") and attached ("500g") forms.
const MEASURED_UNIT = /\b(g|kg|mg|ml|l|tsp|tbsp|cup|cups|oz|lb|pound|pounds|gram|grams|kilogram|kilograms|liter|liters|litre|litres|milliliter|milliliters|teaspoon|teaspoons|tablespoon|tablespoons|ounce|ounces)\b/i;
const ATTACHED_UNIT = /\d(g|kg|mg|ml|l|oz|lb)\b/i;

/** Rounds to at most 2 decimal places (dodges 1/3+1/3 = 0.9999...). */
function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function parseNum(s: string): number {
  if (s.includes("/")) {
    const [num, den] = s.split("/").map(Number);
    return den ? num / den : 0;
  }
  return parseFloat(s);
}

/** Normalizes plural/long-form units to a compact canonical form. */
function normalizeUnit(u: string): string {
  const lower = u.toLowerCase();
  const map: Record<string, string> = {
    gram: "g",
    grams: "g",
    kilogram: "kg",
    kilograms: "kg",
    milliliter: "ml",
    milliliters: "ml",
    liter: "l",
    liters: "l",
    litre: "l",
    litres: "l",
    teaspoon: "tsp",
    teaspoons: "tsp",
    tablespoon: "tbsp",
    tablespoons: "tbsp",
    cups: "cup",
    ounce: "oz",
    ounces: "oz",
    pound: "lb",
    pounds: "lb",
  };
  return map[lower] ?? lower;
}

/**
 * Parses a measure string into a simple count if countable (e.g., "2",
 * "2 eggs", "1 large onion"). Returns null when the measure uses a real
 * measurement unit or isn't parseable.
 */
function parseCount(raw: string): number | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (MEASURED_UNIT.test(trimmed)) return null;
  if (ATTACHED_UNIT.test(trimmed)) return null;

  const m = trimmed.match(/^(\d+(?:\.\d+)?|\d+\/\d+)(?:\s|$|[^\d\s])/);
  if (!m) return null;
  return parseNum(m[1]);
}

/**
 * Parses a measure string with an explicit measurement unit
 * (e.g., "500g", "500 g", "1/2 cup", "1 tsp").
 */
function parseMeasurement(
  raw: string,
): { value: number; unit: string } | null {
  const t = raw.trim();
  if (!t) return null;
  const m = t.match(
    /^(\d+(?:\.\d+)?|\d+\/\d+)\s*(g|kg|mg|ml|l|tsp|tbsp|cup|cups|oz|lb|pound|pounds|gram|grams|liter|liters|litre|litres|milliliter|milliliters|teaspoon|teaspoons|tablespoon|tablespoons|ounce|ounces|kilogram|kilograms)\b/i,
  );
  if (!m) return null;
  return { value: parseNum(m[1]), unit: normalizeUnit(m[2]) };
}

/**
 * Aggregates multiple measure strings for the same ingredient.
 *
 * 1. All countable ("2 eggs", "1 onion") → sum to a single number.
 *    Stored as { quantity: 3, unit: null }, rendered as "3".
 *
 * 2. All parse as value+unit ("200g", "1/2 cup", "1 tsp"):
 *    Group by normalized unit and sum each.
 *    - Single unit across all measures  → "300 g" (quantity: 300, unit: "g")
 *    - Mixed units                       → "300 g + 1 cup" (quantity: null)
 *    Much cleaner than verbatim concat.
 *
 * 3. Anything unparseable ("to taste", "a pinch") → fall back to raw
 *    concatenation so the user at least sees the original measures.
 */
function aggregateMeasures(measures: string[]): {
  quantity: number | null;
  unit: string | null;
} {
  if (measures.length === 0) return { quantity: null, unit: null };

  // 1. All countable
  const counts = measures.map(parseCount);
  if (counts.every((c): c is number => c !== null)) {
    const sum = counts.reduce((a, b) => a + b, 0);
    return { quantity: round2(sum), unit: null };
  }

  // 2. All have explicit measurement units
  const parsed = measures.map(parseMeasurement);
  if (parsed.every((p): p is { value: number; unit: string } => p !== null)) {
    const byUnit = new Map<string, number>();
    for (const p of parsed) {
      byUnit.set(p.unit, (byUnit.get(p.unit) ?? 0) + p.value);
    }
    const entries = [...byUnit.entries()];
    if (entries.length === 1) {
      const [unit, value] = entries[0];
      return { quantity: round2(value), unit };
    }
    return {
      quantity: null,
      unit: entries.map(([u, v]) => `${round2(v)} ${u}`).join(" + "),
    };
  }

  // 3. Fallback: preserve originals verbatim
  return { quantity: null, unit: measures.join(" + ") };
}

/**
 * Reverses aggregateMeasures: turns a stored (quantity, unit) row back into
 * measure strings so we can re-aggregate with new incoming measures.
 * Unit may be a " + "-concatenated list from a previous aggregation — split
 * it back out so sums work.
 */
function rowToMeasures(row: {
  quantity: number | null;
  unit: string | null;
}): string[] {
  if (row.quantity != null) {
    return row.unit ? [`${row.quantity} ${row.unit}`] : [`${row.quantity}`];
  }
  if (row.unit) {
    return row.unit
      .split(" + ")
      .map((s) => s.trim())
      .filter(Boolean);
  }
  return [];
}

/**
 * Core upsert: if an unchecked row with the same name exists, merges the
 * new measures in; otherwise inserts. Name comparison is case-insensitive
 * (via ilike). Checked-off rows are left alone — they represent a past
 * shopping trip.
 */
async function upsertShoppingItem(
  sb: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  userId: string,
  input: {
    name: string;
    measures: string[];
    source_meal_id?: string | null;
  },
): Promise<{ inserted: boolean }> {
  const { data: existing, error: existingErr } = await sb
    .from("shopping_list_items")
    .select("id, quantity, unit")
    .ilike("name", input.name)
    .eq("checked", false)
    .limit(1)
    .maybeSingle();
  if (existingErr) throw existingErr;

  if (existing) {
    const combined = [...rowToMeasures(existing), ...input.measures];
    const agg = aggregateMeasures(combined);
    const { error } = await sb
      .from("shopping_list_items")
      .update({ quantity: agg.quantity, unit: agg.unit })
      .eq("id", existing.id);
    if (error) throw error;
    return { inserted: false };
  }

  const agg = aggregateMeasures(input.measures);
  const { error } = await sb.from("shopping_list_items").insert({
    user_id: userId,
    name: input.name,
    quantity: agg.quantity,
    unit: agg.unit,
    checked: false,
    source_meal_id: input.source_meal_id ?? null,
  });
  if (error) throw error;
  return { inserted: true };
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

  // Convert the user's input to measure strings so upsert can reason about it.
  const measures: string[] = [];
  if (input.quantity != null) {
    measures.push(
      input.unit?.trim()
        ? `${input.quantity} ${input.unit.trim()}`
        : `${input.quantity}`,
    );
  } else if (input.unit?.trim()) {
    measures.push(input.unit.trim());
  }

  await upsertShoppingItem(sb, userId, { name, measures });
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
}): Promise<{ added: number; merged: number }> {
  const userId = await requireUser();
  const sb = await createSupabaseServerClient();

  const { data: plans, error: plansErr } = await sb
    .from("meal_plans")
    .select("meal_id")
    .gte("planned_for", range.from)
    .lte("planned_for", range.to);
  if (plansErr) throw plansErr;
  if (!plans || plans.length === 0) return { added: 0, merged: 0 };

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

  if (agg.size === 0) return { added: 0, merged: 0 };

  // Upsert each ingredient so a second "generate" on an overlapping range
  // merges into existing rows rather than spawning duplicates.
  let inserted = 0;
  let merged = 0;
  for (const a of agg.values()) {
    const result = await upsertShoppingItem(sb, userId, {
      name: a.name,
      measures: a.measures,
      source_meal_id: a.source_meal_id,
    });
    if (result.inserted) inserted++;
    else merged++;
  }

  revalidatePath("/shopping");
  return { added: inserted, merged };
}

/**
 * Cleanup pass for existing duplicates. Groups unchecked rows by
 * case-insensitive name, keeps the oldest row as the canonical one,
 * merges all measures into it, and deletes the rest.
 */
export async function mergeDuplicates(): Promise<{ merged: number }> {
  await requireUser();
  const sb = await createSupabaseServerClient();

  const { data: rows, error } = await sb
    .from("shopping_list_items")
    .select("id, name, quantity, unit, created_at")
    .eq("checked", false)
    .order("created_at", { ascending: true });
  if (error) throw error;
  if (!rows || rows.length === 0) return { merged: 0 };

  const groups = new Map<string, typeof rows>();
  for (const row of rows) {
    const key = row.name.toLowerCase();
    const bucket = groups.get(key) ?? [];
    bucket.push(row);
    groups.set(key, bucket);
  }

  let mergedCount = 0;
  for (const group of groups.values()) {
    if (group.length <= 1) continue;
    const [keeper, ...others] = group;

    const measures = group.flatMap((r) => rowToMeasures(r));
    const agg = aggregateMeasures(measures);

    const { error: updErr } = await sb
      .from("shopping_list_items")
      .update({ quantity: agg.quantity, unit: agg.unit })
      .eq("id", keeper.id);
    if (updErr) throw updErr;

    const { error: delErr } = await sb
      .from("shopping_list_items")
      .delete()
      .in(
        "id",
        others.map((o) => o.id),
      );
    if (delErr) throw delErr;

    mergedCount += others.length;
  }

  revalidatePath("/shopping");
  return { merged: mergedCount };
}
