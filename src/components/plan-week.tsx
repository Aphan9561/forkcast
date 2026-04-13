import Image from "next/image";
import Link from "next/link";
import { UnscheduleButton } from "./unschedule-button";
import {
  addDaysISO,
  MEAL_SLOTS,
  type MealPlanRow,
} from "@/lib/data/meal-plans";
import { lookupMeal } from "@/lib/mealdb/client";

type Props = {
  startDate: string;
  rows: MealPlanRow[];
};

export async function PlanWeek({ startDate, rows }: Props) {
  // Hydrate each distinct meal once. Next's fetch cache dedupes anyway, but
  // building the lookup-by-id map keeps the render pass O(1) per cell.
  const uniqueIds = [...new Set(rows.map((r) => r.meal_id))];
  const meals = await Promise.all(uniqueIds.map((id) => lookupMeal(id)));
  const mealById = new Map(
    meals
      .filter((m): m is NonNullable<typeof m> => m !== null)
      .map((m) => [m.id, m]),
  );

  const days = Array.from({ length: 7 }, (_, i) => {
    const iso = addDaysISO(startDate, i);
    const date = new Date(`${iso}T00:00:00`);
    return {
      iso,
      weekday: date.toLocaleDateString(undefined, { weekday: "short" }),
      monthDay: date.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
    };
  });

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm min-w-[720px]">
        <thead>
          <tr>
            <th className="p-2 text-left text-xs font-medium text-zinc-500 w-20"></th>
            {days.map((d) => (
              <th
                key={d.iso}
                className="p-2 text-left text-xs font-medium text-zinc-600 dark:text-zinc-400"
              >
                <div>{d.weekday}</div>
                <div className="text-zinc-400 dark:text-zinc-500 font-normal">
                  {d.monthDay}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {MEAL_SLOTS.map((slot) => (
            <tr key={slot}>
              <td className="p-2 align-top text-xs font-medium text-zinc-600 dark:text-zinc-400 capitalize">
                {slot}
              </td>
              {days.map((d) => {
                const row = rows.find(
                  (r) => r.planned_for === d.iso && r.meal_slot === slot,
                );
                const meal = row ? mealById.get(row.meal_id) : null;
                return (
                  <td key={d.iso} className="p-1 align-top">
                    {row && meal ? (
                      <div className="group relative h-24 bg-white dark:bg-zinc-950 border border-black/[.06] dark:border-white/10 rounded-md p-2">
                        <Link
                          href={`/meals/${meal.id}`}
                          className="flex gap-2 h-full"
                        >
                          <div className="relative w-12 h-12 shrink-0 rounded overflow-hidden bg-zinc-100 dark:bg-zinc-900">
                            <Image
                              src={meal.thumbnail}
                              alt=""
                              fill
                              sizes="48px"
                              className="object-cover"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="text-xs font-medium leading-tight line-clamp-3">
                              {meal.name}
                            </div>
                            {row.notes && (
                              <div className="text-[10px] text-zinc-500 mt-0.5 line-clamp-1 italic">
                                {row.notes}
                              </div>
                            )}
                          </div>
                        </Link>
                        <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition">
                          <UnscheduleButton planId={row.id} />
                        </div>
                      </div>
                    ) : (
                      <div className="h-24 rounded-md border border-dashed border-black/10 dark:border-white/10" />
                    )}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
