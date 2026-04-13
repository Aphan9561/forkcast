"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { lookupMeal } from "@/lib/mealdb/client";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesInsert, TablesUpdate } from "@/lib/supabase/types";

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
    (a) => ({
      user_id: userId,
      name: a.name,
      quantity: null,
      unit: a.measures.length > 0 ? a.measures.join(" + ") : null,
      checked: false,
      source_meal_id: a.source_meal_id,
    }),
  );

  const { error: insertErr } = await sb
    .from("shopping_list_items")
    .insert(inserts);
  if (insertErr) throw insertErr;

  revalidatePath("/shopping");
  return { added: inserts.length };
}
