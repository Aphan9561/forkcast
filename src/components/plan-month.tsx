import Link from "next/link";
import {
  buildMonthGrid,
  listMonthCounts,
  mondayOfISO,
  todayISO,
} from "@/lib/data/meal-plans";

type Props = { yearMonth: string };

const WEEKDAY_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export async function PlanMonth({ yearMonth }: Props) {
  const [counts, today] = await Promise.all([
    listMonthCounts(yearMonth),
    Promise.resolve(todayISO()),
  ]);
  const cells = buildMonthGrid(yearMonth);

  return (
    <div className="grid grid-cols-7 gap-2">
      {WEEKDAY_HEADERS.map((h) => (
        <div
          key={h}
          className="text-xs font-medium text-zinc-500 text-center pb-1"
        >
          {h}
        </div>
      ))}
      {cells.map((cell) => {
        const count = counts.get(cell.iso) ?? 0;
        const isToday = cell.iso === today;
        return (
          <Link
            key={cell.iso}
            href={`/plan?week=${mondayOfISO(cell.iso)}`}
            className={`aspect-square rounded-md border flex flex-col items-center justify-between p-2 transition ${
              cell.inMonth
                ? "border-black/[.06] dark:border-white/10 bg-white dark:bg-zinc-950 hover:bg-zinc-50 dark:hover:bg-zinc-900"
                : "border-black/[.04] dark:border-white/5 bg-transparent text-zinc-400 dark:text-zinc-600 hover:bg-zinc-50/40 dark:hover:bg-zinc-900/40"
            } ${isToday ? "ring-1 ring-zinc-900 dark:ring-zinc-100" : ""}`}
          >
            <span
              className={`text-sm self-start ${
                cell.inMonth ? "font-medium" : ""
              }`}
            >
              {cell.day}
            </span>
            {count > 0 && cell.inMonth && (
              <div className="flex items-center gap-1 mb-1">
                {Array.from({ length: Math.min(count, 4) }).map((_, i) => (
                  <span
                    key={i}
                    className="w-1.5 h-1.5 rounded-full bg-zinc-700 dark:bg-zinc-300"
                  />
                ))}
                {count > 4 && (
                  <span className="text-[10px] text-zinc-500">+</span>
                )}
              </div>
            )}
          </Link>
        );
      })}
    </div>
  );
}
