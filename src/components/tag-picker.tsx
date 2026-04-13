"use client";

import { useState, useTransition } from "react";
import { assignTag, createTag, removeTag } from "@/app/actions/tags";

type Tag = { id: string; name: string };

type Props = {
  mealId: string;
  assigned: Tag[];
  allTags: Tag[];
  /** Preset tag names shown as suggestions. Clicking one creates + assigns. */
  presets?: readonly string[];
};

export function TagPicker({ mealId, assigned, allTags, presets = [] }: Props) {
  const [adding, setAdding] = useState(false);
  const [input, setInput] = useState("");
  const [pending, startTransition] = useTransition();

  const available = allTags.filter(
    (t) => !assigned.some((a) => a.id === t.id),
  );
  const typed = input.trim();
  const suggestion = typed
    ? available.filter((t) =>
        t.name.toLowerCase().includes(typed.toLowerCase()),
      )
    : available;
  const exactExists = available.some(
    (t) => t.name.toLowerCase() === typed.toLowerCase(),
  );

  // Presets that aren't already used for this favorite (either assigned or
  // exist as a user-created tag that's in `available`, which would already be
  // listed in `suggestion`).
  const assignedNames = new Set(assigned.map((t) => t.name.toLowerCase()));
  const allTagNames = new Set(allTags.map((t) => t.name.toLowerCase()));
  const presetSuggestions = presets.filter((name) => {
    const lower = name.toLowerCase();
    if (assignedNames.has(lower)) return false;
    if (allTagNames.has(lower)) return false; // already shown in `suggestion`
    if (typed && !lower.includes(typed.toLowerCase())) return false;
    return true;
  });

  function closeEditor() {
    setAdding(false);
    setInput("");
  }

  function onAssign(tag: Tag) {
    startTransition(() => assignTag(mealId, tag.id));
    closeEditor();
  }

  function onCreate(name: string = typed) {
    const value = name.trim();
    if (!value) return;
    startTransition(async () => {
      const tag = await createTag(value);
      await assignTag(mealId, tag.id);
    });
    closeEditor();
  }

  function onRemove(tag: Tag) {
    startTransition(() => removeTag(mealId, tag.id));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {assigned.map((tag) => (
        <span
          key={tag.id}
          className="inline-flex items-center gap-1 text-xs bg-zinc-100 dark:bg-zinc-800 rounded-full pl-2.5 pr-1 py-0.5"
        >
          {tag.name}
          <button
            type="button"
            onClick={() => onRemove(tag)}
            disabled={pending}
            className="text-zinc-500 hover:text-zinc-900 dark:hover:text-white w-4 h-4 inline-flex items-center justify-center rounded-full hover:bg-black/5 dark:hover:bg-white/10"
            aria-label={`Remove tag ${tag.name}`}
          >
            ×
          </button>
        </span>
      ))}
      {!adding && (
        <button
          type="button"
          onClick={() => setAdding(true)}
          className="text-xs text-zinc-600 dark:text-zinc-400 border border-dashed border-black/20 dark:border-white/20 rounded-full px-2 py-0.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
        >
          + tag
        </button>
      )}
      {adding && (
        <div className="relative">
          <input
            autoFocus
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Escape") closeEditor();
              if (e.key === "Enter" && typed) {
                e.preventDefault();
                const match = available.find(
                  (t) => t.name.toLowerCase() === typed.toLowerCase(),
                );
                if (match) onAssign(match);
                else onCreate();
              }
            }}
            onBlur={() => {
              // Delay so clicks on suggestions register first.
              setTimeout(() => setAdding(false), 150);
            }}
            placeholder="tag name"
            className="text-xs rounded border border-black/15 dark:border-white/20 px-2 py-0.5 bg-transparent w-32 outline-none focus:border-black/40 dark:focus:border-white/50"
          />
          {(suggestion.length > 0 ||
            presetSuggestions.length > 0 ||
            (typed && !exactExists)) && (
            <ul className="absolute z-10 top-full left-0 mt-1 w-48 bg-white dark:bg-zinc-900 border border-black/10 dark:border-white/15 rounded-md shadow-md text-xs">
              {suggestion.map((tag) => (
                <li key={tag.id}>
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onAssign(tag)}
                    className="w-full text-left px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  >
                    {tag.name}
                  </button>
                </li>
              ))}
              {presetSuggestions.length > 0 && (
                <>
                  {suggestion.length > 0 && (
                    <li
                      aria-hidden
                      className="border-t border-black/5 dark:border-white/10"
                    />
                  )}
                  <li className="px-2 pt-1.5 pb-0.5 text-[10px] uppercase tracking-wide text-zinc-400">
                    Suggested
                  </li>
                  {presetSuggestions.map((name) => (
                    <li key={name}>
                      <button
                        type="button"
                        onMouseDown={(e) => e.preventDefault()}
                        onClick={() => onCreate(name)}
                        className="w-full text-left px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-700 dark:text-zinc-300"
                      >
                        {name}
                      </button>
                    </li>
                  ))}
                </>
              )}
              {typed && !exactExists && (
                <li className="border-t border-black/5 dark:border-white/10">
                  <button
                    type="button"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => onCreate()}
                    className="w-full text-left px-2 py-1.5 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400"
                  >
                    Create &ldquo;{typed}&rdquo;
                  </button>
                </li>
              )}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
