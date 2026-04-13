"use client";

import { useTransition } from "react";
import { unscheduleMeal } from "@/app/actions/meal-plans";

export function UnscheduleButton({ planId }: { planId: string }) {
  const [pending, startTransition] = useTransition();
  return (
    <button
      type="button"
      onClick={() => startTransition(() => unscheduleMeal(planId))}
      disabled={pending}
      className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white bg-white/80 dark:bg-zinc-900/80 w-5 h-5 rounded-full inline-flex items-center justify-center text-xs backdrop-blur-sm"
      aria-label="Remove from plan"
    >
      ×
    </button>
  );
}
