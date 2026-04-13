"use client";

import { useTransition } from "react";
import {
  addShoppingItem,
  clearChecked,
  deleteShoppingItem,
  toggleChecked,
} from "@/app/actions/shopping";
import type { ShoppingItemRow } from "@/lib/data/shopping";

export function ShoppingList({ items }: { items: ShoppingItemRow[] }) {
  const [pending, startTransition] = useTransition();
  const unchecked = items.filter((i) => !i.checked);
  const checked = items.filter((i) => i.checked);

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
          className="rounded-full bg-foreground text-background px-4 h-9 text-sm font-medium hover:opacity-90 disabled:opacity-60"
        >
          Add
        </button>
      </form>

      {unchecked.length === 0 && checked.length === 0 && (
        <p className="text-sm text-zinc-500 py-8">
          Nothing on your list. Add items above or generate from your meal plan.
        </p>
      )}

      {unchecked.length > 0 && (
        <ul className="divide-y divide-black/5 dark:divide-white/10 border-y border-black/5 dark:border-white/10 mb-6">
          {unchecked.map((item) => (
            <Row key={item.id} item={item} />
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
              <Row key={item.id} item={item} />
            ))}
          </ul>
        </>
      )}
    </div>
  );
}

function Row({ item }: { item: ShoppingItemRow }) {
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
