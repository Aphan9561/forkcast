import Image from "next/image";
import Link from "next/link";
import { CookedButton } from "./cooked-button";
import { UnscheduleButton } from "./unschedule-button";
import {
  addDaysISO,
  MEAL_SLOTS,
  todayISO,
  type MealPlanRow,
  type MealSlot,
} from "@/lib/data/meal-plans";
import { lookupMeal } from "@/lib/mealdb/client";

type Props = {
  startDate: string;
  rows: MealPlanRow[];
};

const SLOT_LABELS: Record<MealSlot, string> = {
  breakfast: "Breakfast",
  lunch: "Lunch",
  dinner: "Dinner",
  snack: "Snack",
};

export async function PlanWeek({ startDate, rows }: Props) {
  const uniqueIds = [...new Set(rows.map((r) => r.meal_id))];
  const meals = await Promise.all(uniqueIds.map((id) => lookupMeal(id)));
  const mealById = new Map(
    meals
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => [m.id, m]),
  );

  const today = todayISO();
  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(startDate, i);
    const date = new Date(`${iso}T00:00:00`);
    return {
      iso,
      isToday: iso === today,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      monthDay: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });

  return (
    <div className="overflow-x-auto">
      <div
        className="grid gap-2 min-w-[760px]"
        style={{
          gridTemplateColumns: "auto repeat(7, minmax(0, 1fr))",
        }}
      >
        {/* Header row: empty corner + 7 day headers */}
        <div />
        {days.map((d) => (
          <div key={d.iso} className="text-xs text-center">
            <div
              className={
                d.isToday
                  ? "font-semibold text-zinc-900 dark:text-zinc-100"
                  : "font-medium text-zinc-600 dark:text-zinc-400"
              }
            >
              {d.weekday}
            </div>
            <div
              className={
                d.isToday
                  ? "text-zinc-900 dark:text-zinc-100"
                  : "text-zinc-400 dark:text-zinc-500 font-normal"
              }
            >
              {d.monthDay}
            </div>
            {d.isToday && (
              <div className="h-0.5 bg-zinc-900 dark:bg-zinc-100 mt-1 w-full rounded-full" />
            )}
          </div>
        ))}

        {/* Slot rows: label cell + 7 day cells */}
        {MEAL_SLOTS.flatMap((slot) => [
          <div
            key={`${slot}-label`}
            className="text-xs font-medium text-zinc-500 pr-2 flex items-center capitalize"
          >
            {SLOT_LABELS[slot]}
          </div>,
          ...days.map((d) => {
            const row = rows.find(
              (r) => r.planned_for === d.iso && r.meal_slot === slot,
            );
            const meal = row ? mealById.get(row.meal_id) : null;
            const isCooked = Boolean(row?.cooked_at);

            return (
              <div
                key={`${slot}-${d.iso}`}
                className={`aspect-square rounded-md relative overflow-hidden ${
                  d.isToday
                    ? "ring-1 ring-zinc-300 dark:ring-zinc-700"
                    : ""
                }`}
              >
                {row && meal ? (
                  <div
                    className={`group absolute inset-0 bg-white dark:bg-zinc-950 border rounded-md overflow-hidden ${
                      isCooked
                        ? "border-emerald-300/80 dark:border-emerald-900"
                        : "border-black/[.06] dark:border-white/10"
                    }`}
                  >
                    <Link
                      href={`/meals/${meal.id}`}
                      className="absolute inset-0 flex flex-col"
                    >
                      <div
                        className={`relative flex-1 bg-zinc-100 dark:bg-zinc-900 ${
                          isCooked ? "opacity-75" : ""
                        }`}
                      >
                        <Image
                          src={meal.thumbnail}
                          alt=""
                          fill
                          sizes="150px"
                          className="object-cover"
                        />
                      </div>
                      <div className="px-1.5 py-1 text-[10px] font-medium leading-tight line-clamp-2 bg-white dark:bg-zinc-950">
                        {meal.name}
                      </div>
                    </Link>
                    <div
                      className={`absolute top-1 left-1 transition ${
                        isCooked
                          ? "opacity-100"
                          : "opacity-0 group-hover:opacity-100 focus-within:opacity-100"
                      }`}
                    >
                      <CookedButton planId={row.id} cooked={isCooked} />
                    </div>
                    <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                      <UnscheduleButton planId={row.id} />
                    </div>
                  </div>
                ) : (
                  <div className="absolute inset-0 rounded-md border border-dashed border-black/10 dark:border-white/10" />
                )}
              </div>
            );
          }),
        ])}
      </div>
    </div>
  );
}
