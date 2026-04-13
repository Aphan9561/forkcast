import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Enums } from "@/lib/supabase/types";

export type MealSlot = Enums<"meal_slot">;
export const MEAL_SLOTS: MealSlot[] = ["breakfast", "lunch", "dinner", "snack"];

export type MealPlanRow = {
  id: string;
  meal_id: string;
  planned_for: string; // YYYY-MM-DD
  meal_slot: MealSlot;
  notes: string | null;
};

export async function listWeek(startDate: string): Promise<MealPlanRow[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const end = addDaysISO(startDate, 6);
  const { data, error } = await sb
    .from("meal_plans")
    .select("id, meal_id, planned_for, meal_slot, notes")
    .gte("planned_for", startDate)
    .lte("planned_for", end)
    .order("planned_for", { ascending: true })
    .order("meal_slot", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Adds `days` (may be negative) to a YYYY-MM-DD string. */
export function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** Returns the Monday (local time) of the week containing `date`, YYYY-MM-DD. */
export function mondayOf(date: Date = new Date()): string {
  const d = new Date(date);
  const day = d.getDay() || 7; // Sunday is 0 → treat as 7
  if (day !== 1) d.setDate(d.getDate() - (day - 1));
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

/** Today in local time as YYYY-MM-DD. */
export function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
