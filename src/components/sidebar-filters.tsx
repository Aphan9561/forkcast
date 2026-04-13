"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";

type Props = {
  categories: string[];
  areas: string[];
};

export function SidebarFilters({ categories, areas }: Props) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const current = {
    q: searchParams.get("q") ?? "",
    category: searchParams.get("category") ?? "",
    area: searchParams.get("area") ?? "",
  };

  function pushWith(updates: Partial<typeof current>) {
    const next = new URLSearchParams(searchParams.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    const qs = next.toString();
    startTransition(() => {
      router.push(`/browse${qs ? `?${qs}` : ""}`);
    });
  }

  function reset() {
    startTransition(() => {
      router.push("/browse");
    });
  }

  const hasActiveFilter = Boolean(current.q || current.category || current.area);

  return (
    <aside className="space-y-5 text-sm">
      <div>
        <label className="block font-medium mb-1.5">Search</label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const q = (new FormData(e.currentTarget).get("q") as string) ?? "";
            pushWith({ q: q.trim() });
          }}
        >
          <input
            name="q"
            type="search"
            defaultValue={current.q}
            placeholder="e.g. chicken curry"
            className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 bg-transparent outline-none focus:border-black/30 dark:focus:border-white/40"
          />
        </form>
      </div>

      <div>
        <label className="block font-medium mb-1.5">Category</label>
        <select
          value={current.category}
          onChange={(e) => pushWith({ category: e.target.value })}
          className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 bg-transparent"
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block font-medium mb-1.5">Cuisine</label>
        <select
          value={current.area}
          onChange={(e) => pushWith({ area: e.target.value })}
          className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 bg-transparent"
        >
          <option value="">All cuisines</option>
          {areas.map((a) => (
            <option key={a} value={a}>
              {a}
            </option>
          ))}
        </select>
      </div>

      {hasActiveFilter && (
        <button
          onClick={reset}
          className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white underline-offset-2 hover:underline"
        >
          Clear filters
        </button>
      )}

      {isPending && <p className="text-xs text-zinc-500">Updating…</p>}
    </aside>
  );
}
