"use client";

import { useState, useTransition } from "react";
import {
  addPantryItem,
  deletePantryItem,
  updatePantryItem,
} from "@/app/actions/pantry";
import type { PantryItemRow } from "@/lib/data/pantry";

export function PantryList({ items }: { items: PantryItemRow[] }) {
  const [pending, startTransition] = useTransition();

  function onAdd(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    const name = (data.get("name") as string).trim();
    if (!name) return;
    const quantityStr = (data.get("quantity") as string).trim();
    const unit = (data.get("unit") as string).trim();
    startTransition(async () => {
      await addPantryItem({
        name,
        quantity: quantityStr ? Number(quantityStr) : null,
        unit: unit || null,
      });
      form.reset();
    });
  }

  return (
    <div>
      <form onSubmit={onAdd} className="flex gap-2 mb-6 flex-wrap">
        <input
          name="name"
          placeholder="Item (e.g. eggs)"
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

      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 py-8">
          Your pantry is empty. Add items so the shopping list can skip things
          you already have.
        </p>
      ) : (
        <ul className="divide-y divide-black/5 dark:divide-white/10 border-y border-black/5 dark:border-white/10">
          {items.map((item) => (
            <PantryRow key={item.id} item={item} />
          ))}
        </ul>
      )}
    </div>
  );
}

function PantryRow({ item }: { item: PantryItemRow }) {
  const [editing, setEditing] = useState(false);
  const [pending, startTransition] = useTransition();

  if (editing) {
    return (
      <li className="py-2">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            const data = new FormData(e.currentTarget);
            const name = (data.get("name") as string).trim();
            const quantityStr = (data.get("quantity") as string).trim();
            const unit = (data.get("unit") as string).trim();
            startTransition(async () => {
              await updatePantryItem(item.id, {
                name,
                quantity: quantityStr ? Number(quantityStr) : null,
                unit: unit || null,
              });
              setEditing(false);
            });
          }}
          className="flex gap-2 items-center flex-wrap"
        >
          <input
            name="name"
            defaultValue={item.name}
            required
            className="flex-1 min-w-[180px] rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
          />
          <input
            name="quantity"
            type="number"
            min="0"
            step="any"
            defaultValue={item.quantity ?? ""}
            placeholder="Qty"
            className="w-20 rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
          />
          <input
            name="unit"
            defaultValue={item.unit ?? ""}
            placeholder="Unit"
            className="w-24 rounded border border-black/10 dark:border-white/15 px-2 py-1.5 text-sm bg-transparent"
          />
          <button
            type="submit"
            disabled={pending}
            className="text-sm px-3 py-1.5 rounded-full bg-accent text-accent-fg hover:opacity-90"
          >
            Save
          </button>
          <button
            type="button"
            onClick={() => setEditing(false)}
            className="text-sm px-3 py-1.5 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-900"
          >
            Cancel
          </button>
        </form>
      </li>
    );
  }

  return (
    <li className="py-2 flex items-center gap-3">
      <span className="flex-1 text-sm">{item.name}</span>
      <span className="text-sm text-zinc-500 min-w-[80px] text-right">
        {item.quantity != null
          ? `${item.quantity} ${item.unit ?? ""}`.trim()
          : item.unit ?? ""}
      </span>
      <button
        type="button"
        onClick={() => setEditing(true)}
        className="text-xs text-zinc-500 hover:text-zinc-900 dark:hover:text-white"
      >
        Edit
      </button>
      <button
        type="button"
        onClick={() => startTransition(() => deletePantryItem(item.id))}
        disabled={pending}
        className="text-xs text-zinc-500 hover:text-rose-600 disabled:opacity-50"
      >
        Delete
      </button>
    </li>
  );
}
