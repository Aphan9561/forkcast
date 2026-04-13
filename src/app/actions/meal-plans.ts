"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export async function scheduleMeal(input: {
  meal_id: string;
  planned_for: string; // YYYY-MM-DD
  meal_slot: Enums<"meal_slot">;
  notes?: string | null;
}): Promise<void> {
  const userId = await requireUser();
  const sb = await createSupabaseServerClient();

  // Upsert on the unique (user_id, planned_for, meal_slot) constraint so a new
  // meal in an occupied slot overwrites the previous entry.
  const { error } = await sb.from("meal_plans").upsert(
    {
      user_id: userId,
      meal_id: input.meal_id,
      planned_for: input.planned_for,
      meal_slot: input.meal_slot,
      notes: input.notes ?? null,
    },
    { onConflict: "user_id,planned_for,meal_slot" },
  );
  if (error) throw error;

  revalidatePath("/plan");
  revalidatePath(`/meals/${input.meal_id}`);
}

export async function unscheduleMeal(id: string): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("meal_plans").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/plan");
}

/**
 * Toggles the cooked_at timestamp on a meal_plans row.
 * - If null, sets to current timestamp.
 * - If set, clears back to null.
 */
export async function toggleCooked(id: string): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();

  const { data, error: fetchErr } = await sb
    .from("meal_plans")
    .select("cooked_at")
    .eq("id", id)
    .single();
  if (fetchErr) throw fetchErr;

  const nextValue = data.cooked_at ? null : new Date().toISOString();
  const { error } = await sb
    .from("meal_plans")
    .update({ cooked_at: nextValue })
    .eq("id", id);
  if (error) throw error;

  revalidatePath("/plan");
  revalidatePath("/");
}
