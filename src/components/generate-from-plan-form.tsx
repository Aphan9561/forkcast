"use client";

import { useState, useTransition } from "react";
import { generateFromPlan } from "@/app/actions/shopping";

type Props = { initialFrom?: string; initialTo?: string };

export function GenerateFromPlanForm({ initialFrom, initialTo }: Props = {}) {
  const today = todayISO();
  const defaultEnd = addDaysISO(today, 6);
  const [from, setFrom] = useState(initialFrom ?? today);
  const [to, setTo] = useState(initialTo ?? defaultEnd);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage(null);
    startTransition(async () => {
      try {
        const { added } = await generateFromPlan({ from, to });
        setMessage(
          added === 0
            ? "Nothing added — either no meals are planned in this range, or your pantry already covers everything."
            : `Added ${added} ingredient${added === 1 ? "" : "s"} to your list.`,
        );
      } catch (err) {
        setMessage(err instanceof Error ? err.message : "Failed to generate");
      }
    });
  }

  return (
    <form
      onSubmit={onSubmit}
      className="flex gap-2 items-end flex-wrap p-3 rounded-lg border border-black/10 dark:border-white/15 bg-zinc-50 dark:bg-zinc-900 mb-6"
    >
      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs font-medium mb-1">From</label>
        <input
          type="date"
          value={from}
          onChange={(e) => setFrom(e.target.value)}
          className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
        />
      </div>
      <div className="flex-1 min-w-[120px]">
        <label className="block text-xs font-medium mb-1">To</label>
        <input
          type="date"
          value={to}
          onChange={(e) => setTo(e.target.value)}
          className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
        />
      </div>
      <button
        type="submit"
        disabled={pending || !from || !to}
        className="rounded-full bg-accent text-white px-4 h-9 text-sm font-medium hover:opacity-90 disabled:opacity-60"
      >
        {pending ? "Generating…" : "Generate from plan"}
      </button>
      {message && (
        <p className="text-xs text-zinc-600 dark:text-zinc-400 basis-full">
          {message}
        </p>
      )}
    </form>
  );
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}

function addDaysISO(iso: string, days: number): string {
  const d = new Date(`${iso}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}
