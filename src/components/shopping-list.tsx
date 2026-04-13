"use client";

import { useTransition } from "react";
import {
  addShoppingItem,
  clearChecked,
  deleteShoppingItem,
  mergeDuplicates,
  toggleChecked,
} from "@/app/actions/shopping";
import type { ShoppingItemRow } from "@/lib/data/shopping";

type Props = {
  items: ShoppingItemRow[];
  /** Lowercased pantry item names — items with matching names get an
   *  "in pantry" chip so the user knows they already have it. */
  pantryNames?: string[];
};

export function ShoppingList({ items, pantryNames = [] }: Props) {
  const [pending, startTransition] = useTransition();
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);
  const pantrySet = new Set(pantryNames);

  // Count duplicate unchecked names so we can enable/disable the merge button.
  const duplicateCount = (() => {
    const counts = new Map<string, number>();
    for (const item of unchecked) {
      const key = item.name.toLowerCase();
      counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    let extras = 0;
    for (const n of counts.values()) if (n > 1) extras += n - 1;
    return extras;
  })();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") as string).trim();
    if (!name) return;
    const quantityStr = (data.get("quantity") as string).trim();
    const unit = (data.get("unit") as string).trim();
    startTransition(async () => {
      await addShoppingItem({
        name,
        quantity: quantityStr ? Number(quantityStr) : null,
        unit: unit || null,
      });
      form.reset();
    });
  }

  return (
    <div>
      <form onSubmit={onAdd} className="flex gap-2 mb-4 flex-wrap">
        <input
          name="name"
          placeholder="Add an item…"
          required
          className="flex-1 min-w-[180px] rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
        />
        <input
          name="quantity"
          type="number"
          min="0"
          step="any"
          placeholder="Qty"
          className="w-20 rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
        />
        <input
          name="unit"
          placeholder="Unit"
          className="w-24 rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
        />
        <button
          type="submit"
          disabled={pending}
          className="rounded-full bg-accent text-accent-fg px-4 h-9 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {duplicateCount > 0 && (
        <div className="flex items-center justify-between gap-2 p-2 px-3 mb-4 rounded-md bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900/50 text-xs text-amber-900 dark:text-amber-200">
          <span>
            {duplicateCount} duplicate item
            {duplicateCount === 1 ? "" : "s"} detected.
          </span>
          <button
            type="button"
            onClick={() =>
              startTransition(async () => {
                await mergeDuplicates();
              })
            }
            disabled={pending}
            className="font-medium hover:underline disabled:opacity-60"
          >
            Merge now
          </button>
        </div>
      )}

      {unchecked.length === 0 && checked.length === 0 && (
        <p className="text-sm text-zinc-500 py-8">
          Nothing on your list. Add items above or generate from your meal plan.
        </p>
      )}

      {unchecked.length > 0 && (
        <ul className="divide-y divide-black/5 dark:divide-white/10 border-y border-black/5 dark:border-white/10 mb-6">
          {unchecked.map((item) => (
            <Row
              key={item.id}
              item={item}
              inPantry={pantrySet.has(item.name.toLowerCase())}
            />
          ))}
        </ul>
      )}

      {checked.length > 0 && (
        <>
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-xs font-medium text-zinc-500 uppercase tracking-wide">
              Checked off ({checked.length})
            </h2>
            <button
              type="button"
              onClick={() => startTransition(() => clearChecked())}
              disabled={pending}
              className="text-xs text-zinc-500 hover:text-rose-600 disabled:opacity-50"
            >
              Clear
            </button>
          </div>
          <ul className="divide-y divide-black/5 dark:divide-white/10 border-y border-black/5 dark:border-white/10 opacity-60">
            {checked.map((item) => (
              <Row
              key={item.id}
              item={item}
              inPantry={pantrySet.has(item.name.toLowerCase())}
            />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Row({
  item,
  inPantry,
}: {
  item: ShoppingItemRow;
  inPantry: boolean;
}) {
  const [, startTransition] = useTransition();
  const amount =
    item.quantity != null
      ? `${item.quantity} ${item.unit ?? ""}`.trim()
      : item.unit ?? "";
  return (
    <li className="py-2 flex items-center gap-3">
      <input
        type="checkbox"
        checked={item.checked}
        onChange={(e) =>
          startTransition(() => toggleChecked(item.id, e.target.checked))
        }
        className="h-4 w-4 accent-zinc-900 dark:accent-zinc-100"
      />
      <span
        className={`flex-1 text-sm ${item.checked ? "line-through" : ""}`}
      >
        {item.name}
        {inPantry && (
          <span
            className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-700 dark:text-amber-300 align-middle"
            title="This item is also in your pantry"
          >
            in pantry
          </span>
        )}
      </span>
      {amount && (
        <span className="text-sm text-zinc-500 text-right">{amount}</span>
      )}
      <button
        type="button"
        onClick={() => startTransition(() => deleteShoppingItem(item.id))}
        className="text-xs text-zinc-400 hover:text-rose-600 w-5"
        aria-label="Remove"
      >
        ×
      </button>
    </li>
  );
}
