import Link from "next/link";
import { PlanMonth } from "@/components/plan-month";
import { PlanWeek } from "@/components/plan-week";
import {
  addDaysISO,
  addMonthsISO,
  listWeek,
  mondayOf,
  monthOf,
} from "@/lib/data/meal-plans";

type SearchParams = {
  view?: "week" | "month";
  week?: string;
  month?: string;
};

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { view = "week", week, month } = await searchParams;

  return (
    <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
      {view === "month" ? (
        <MonthView month={month ?? monthOf()} />
      ) : (
        <WeekView start={week ?? mondayOf()} />
      )}
      <p className="text-xs text-zinc-500 mt-6">
        To add meals, open a meal from{" "}
        <Link href="/browse" className="underline">
          Browse
        </Link>{" "}
        or your{" "}
        <Link href="/favorites" className="underline">
          Favorites
        </Link>{" "}
        and click Schedule.
      </p>
    </div>
  );
}

async function WeekView({ start }: { start: string }) {
  const rows = await listWeek(start);
  const prev = addDaysISO(start, -7);
  const next = addDaysISO(start, 7);
  const end = addDaysISO(start, 6);

  return (
    <>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Meal plan</h1>
          <p className="text-sm text-zinc-500">{formatRange(start, end)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle active="week" />
          <div className="flex gap-2">
            <Link
              href={`/plan?week=${prev}`}
              className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              ← Prev
            </Link>
            <Link
              href="/plan"
              className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Today
            </Link>
            <Link
              href={`/plan?week=${next}`}
              className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Next →
            </Link>
          </div>
        </div>
      </div>
      <PlanWeek startDate={start} rows={rows} />
    </>
  );
}

function MonthView({ month }: { month: string }) {
  const prev = addMonthsISO(month, -1);
  const next = addMonthsISO(month, 1);

  return (
    <>
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Meal plan</h1>
          <p className="text-sm text-zinc-500">{formatMonth(month)}</p>
        </div>
        <div className="flex gap-2 items-center">
          <ViewToggle active="month" />
          <div className="flex gap-2">
            <Link
              href={`/plan?view=month&month=${prev}`}
              className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              ← Prev
            </Link>
            <Link
              href="/plan?view=month"
              className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Today
            </Link>
            <Link
              href={`/plan?view=month&month=${next}`}
              className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
            >
              Next →
            </Link>
          </div>
        </div>
      </div>
      <PlanMonth yearMonth={month} />
      <p className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-3">
        Dots indicate days with scheduled meals. Click any day to jump to that
        week.
      </p>
    </>
  );
}

function ViewToggle({ active }: { active: "week" | "month" }) {
  const base =
    "text-sm px-3 py-1.5 rounded-full transition border";
  const activeCls =
    "bg-foreground text-background border-transparent";
  const inactiveCls =
    "border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900";
  return (
    <div className="flex gap-1">
      <Link
        href="/plan"
        className={`${base} ${active === "week" ? activeCls : inactiveCls}`}
      >
        Week
      </Link>
      <Link
        href="/plan?view=month"
        className={`${base} ${active === "month" ? activeCls : inactiveCls}`}
      >
        Month
      </Link>
    </div>
  );
}

function formatRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}

function formatMonth(yearMonth: string): string {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString(undefined, {
    month: "long",
    year: "numeric",
  });
}
