"use client";

import { useTransition } from "react";
import { toggleCooked } from "@/app/actions/meal-plans";

type Props = { planId: string; cooked: boolean };

/**
 * Toggles the cooked_at flag on a meal_plans row.
 * Visual state:
 *  - cooked   → filled green checkmark (always visible)
 *  - pending  → dimmed white bubble (hover-only, set by parent wrapper)
 */
export function CookedButton({ planId, cooked }: Props) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => toggleCooked(planId))}
      disabled={pending}
      className={`w-5 h-5 rounded-full inline-flex items-center justify-center text-xs backdrop-blur-sm transition ${
        cooked
          ? "bg-emerald-500 text-white hover:bg-emerald-600"
          : "bg-white/80 dark:bg-zinc-900/80 text-zinc-500 hover:text-emerald-600 hover:bg-white dark:hover:bg-zinc-900"
      }`}
      aria-label={cooked ? "Mark as not cooked" : "Mark as cooked"}
      title={cooked ? "Cooked — click to undo" : "Mark as cooked"}
    >
      ✓
    </button>
  );
}
