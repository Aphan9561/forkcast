import Link from "next/link";
import { PlanWeek } from "@/components/plan-week";
import { addDaysISO, listWeek, mondayOf } from "@/lib/data/meal-plans";

type SearchParams = { week?: string };

export default async function PlanPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const { week } = await searchParams;
  const start = week ?? mondayOf();
  const rows = await listWeek(start);

  const prev = addDaysISO(start, -7);
  const next = addDaysISO(start, 7);
  const end = addDaysISO(start, 6);

  return (
    <div className="flex-1 max-w-7xl mx-auto px-6 py-8 w-full">
      <div className="flex items-start justify-between mb-6 gap-4 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold tracking-tight">Meal plan</h1>
          <p className="text-sm text-zinc-500">{formatRange(start, end)}</p>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/plan?week=${prev}`}
            className="text-sm px-3 py-1.5 rounded-full border border-black/10 dark:border-white/15 hover:bg-zinc-50 dark:hover:bg-zinc-900"
          >
            ← Previous
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
      <PlanWeek startDate={start} rows={rows} />
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

function formatRange(start: string, end: string): string {
  const s = new Date(`${start}T00:00:00`);
  const e = new Date(`${end}T00:00:00`);
  const fmt = (d: Date) =>
    d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  return `${fmt(s)} – ${fmt(e)}`;
}
