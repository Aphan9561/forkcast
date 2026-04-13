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
  cooked_at: string | null;
};

export async function listWeek(startDate: string): Promise<MealPlanRow[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const end = addDaysISO(startDate, 6);
  const { data, error } = await sb
    .from("meal_plans")
    .select("id, meal_id, planned_for, meal_slot, notes, cooked_at")
    .gte("planned_for", startDate)
    .lte("planned_for", end)
    .order("planned_for", { ascending: true })
    .order("meal_slot", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

/** Counts cooked meals for the current user in [from, to] (inclusive). */
export async function countCookedInRange(
  from: string,
  to: string,
): Promise<number> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { count, error } = await sb
    .from("meal_plans")
    .select("*", { count: "exact", head: true })
    .gte("planned_for", from)
    .lte("planned_for", to)
    .not("cooked_at", "is", null);
  if (error) throw error;
  return count ?? 0;
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

// ---------- Month helpers (for the /plan month view) ----------

/** Returns the YYYY-MM of the given date in local time. */
export function monthOf(date: Date = new Date()): string {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

/** Shifts a YYYY-MM by `months` (may be negative). */
export function addMonthsISO(yearMonth: string, months: number): string {
  const [y, m] = yearMonth.split("-").map(Number);
  const d = new Date(y, m - 1 + months, 1);
  return monthOf(d);
}

/**
 * Returns per-day counts of scheduled meals for the given month.
 * Map key is a YYYY-MM-DD string; value is the number of meal_plans rows.
 */
export async function listMonthCounts(
  yearMonth: string,
): Promise<Map<string, number>> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const [y, m] = yearMonth.split("-").map(Number);
  const start = `${yearMonth}-01`;
  const lastDay = new Date(y, m, 0).getDate();
  const end = `${yearMonth}-${String(lastDay).padStart(2, "0")}`;

  const { data, error } = await sb
    .from("meal_plans")
    .select("planned_for")
    .gte("planned_for", start)
    .lte("planned_for", end);
  if (error) throw error;

  const counts = new Map<string, number>();
  for (const row of data ?? []) {
    counts.set(row.planned_for, (counts.get(row.planned_for) ?? 0) + 1);
  }
  return counts;
}

/**
 * Builds a 6-row × 7-column calendar grid for the given month, starting on
 * Monday. Leading/trailing days from adjacent months are included and flagged
 * with `inMonth: false` so the caller can render them muted.
 */
export function buildMonthGrid(
  yearMonth: string,
): { iso: string; day: number; inMonth: boolean }[] {
  const [y, m] = yearMonth.split("-").map(Number);
  const firstOfMonth = new Date(y, m - 1, 1);
  // Monday=0 ... Sunday=6 (shift JS's Sunday=0 scheme)
  const leadingEmpty = (firstOfMonth.getDay() + 6) % 7;

  const cells: { iso: string; day: number; inMonth: boolean }[] = [];
  for (let i = 0; i < 42; i++) {
    const d = new Date(y, m - 1, 1 - leadingEmpty + i);
    const iso = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    cells.push({
      iso,
      day: d.getDate(),
      inMonth: d.getMonth() === m - 1,
    });
  }
  return cells;
}

/** Monday of the week containing the given YYYY-MM-DD. */
export function mondayOfISO(iso: string): string {
  const d = new Date(`${iso}T00:00:00`);
  return mondayOf(d);
}
