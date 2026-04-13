"use client";

import { SignInButton } from "@clerk/nextjs";
import { useState, useTransition } from "react";
import { scheduleMeal } from "@/app/actions/meal-plans";

const SLOTS = ["breakfast", "lunch", "dinner", "snack"] as const;
type MealSlot = (typeof SLOTS)[number];

type Props = {
  mealId: string;
  mealName?: string;
  signedIn: boolean;
  presetDate?: string;
  presetSlot?: MealSlot;
  triggerLabel?: string;
  triggerClassName?: string;
};

const DEFAULT_TRIGGER_CLASS =
  "inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-sm font-medium transition border bg-white border-black/10 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-white/15 dark:hover:bg-zinc-900";

export function SchedulePicker({
  mealId,
  mealName,
  signedIn,
  presetDate,
  presetSlot,
  triggerLabel = "Schedule",
  triggerClassName = DEFAULT_TRIGGER_CLASS,
}: Props) {
  const [open, setOpen] = useState(false);
  const [date, setDate] = useState(presetDate ?? todayISO());
  const [slot, setSlot] = useState<MealSlot>(presetSlot ?? "dinner");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  if (!signedIn) {
    return (
      <SignInButton mode="modal">
        <button type="button" className={triggerClassName}>
          {triggerLabel}
        </button>
      </SignInButton>
    );
  }

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      try {
        await scheduleMeal({
          meal_id: mealId,
          planned_for: date,
          meal_slot: slot,
          notes: notes.trim() || null,
        });
        setOpen(false);
        setNotes("");
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to schedule");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={triggerClassName}
      >
        {triggerLabel}
      </button>
      {open && (
        <div
          onClick={() => !pending && setOpen(false)}
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
        >
          <form
            onClick={(e) => e.stopPropagation()}
            onSubmit={onSubmit}
            className="bg-white dark:bg-zinc-950 rounded-lg p-5 w-full max-w-sm border border-black/10 dark:border-white/15 shadow-xl"
          >
            <h2 className="font-semibold mb-1">Schedule meal</h2>
            {mealName && (
              <p className="text-xs text-zinc-500 mb-3 line-clamp-1">{mealName}</p>
            )}
            <label className="block text-sm mb-3">
              <span className="block text-xs font-medium mb-1">Date</span>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 bg-transparent"
              />
            </label>
            <label className="block text-sm mb-3">
              <span className="block text-xs font-medium mb-1">Meal slot</span>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value as MealSlot)}
                className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 bg-transparent"
              >
                {SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s.charAt(0).toUpperCase() + s.slice(1)}
                  </option>
                ))}
              </select>
            </label>
            <label className="block text-sm mb-3">
              <span className="block text-xs font-medium mb-1">
                Notes <span className="text-zinc-400">(optional)</span>
              </span>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                maxLength={200}
                placeholder="e.g. double batch for leftovers"
                className="w-full rounded border border-black/10 dark:border-white/15 px-2 py-1.5 bg-transparent"
              />
            </label>
            {error && <p className="text-xs text-rose-600 mb-3">{error}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setOpen(false)}
                disabled={pending}
                className="text-sm px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="text-sm px-3 py-1.5 rounded-full bg-accent text-white hover:opacity-90 disabled:opacity-60"
              >
                {pending ? "Saving…" : "Schedule"}
              </button>
            </div>
            <p className="text-xs text-zinc-500 mt-3">
              Overwrites any existing meal in that slot.
            </p>
          </form>
        </div>
      )}
    </>
  );
}

function todayISO(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${dd}`;
}
