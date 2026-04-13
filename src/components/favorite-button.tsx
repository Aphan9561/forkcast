"use client";

import { SignInButton } from "@clerk/nextjs";
import { useState, useTransition } from "react";
import { toggleFavorite } from "@/app/actions/favorites";

type Props = {
  mealId: string;
  initialFavorited: boolean;
  signedIn: boolean;
};

export function FavoriteButton({ mealId, initialFavorited, signedIn }: Props) {
  const [favorited, setFavorited] = useState(initialFavorited);
  const [pending, startTransition] = useTransition();

  const className = `inline-flex items-center gap-1.5 rounded-full px-4 h-9 text-sm font-medium transition border disabled:opacity-60 ${
    favorited
      ? "bg-rose-50 border-rose-200 text-rose-700 hover:bg-rose-100 dark:bg-rose-950/40 dark:border-rose-900 dark:text-rose-300"
      : "bg-white border-black/10 hover:bg-zinc-50 dark:bg-zinc-950 dark:border-white/15 dark:hover:bg-zinc-900"
  }`;

  if (!signedIn) {
    return (
      <SignInButton mode="modal">
        <button type="button" className={className}>
          <span aria-hidden>♡</span>
          Favorite
        </button>
      </SignInButton>
    );
  }

  function onClick() {
    const nextState = !favorited;
    setFavorited(nextState);
    startTransition(async () => {
      try {
        const result = await toggleFavorite(mealId);
        setFavorited(result.favorited);
      } catch {
        // Revert optimistic update on error.
        setFavorited(!nextState);
      }
    });
  }

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={pending}
      aria-pressed={favorited}
      className={className}
    >
      <span aria-hidden>{favorited ? "♥" : "♡"}</span>
      {favorited ? "Favorited" : "Favorite"}
    </button>
  );
}
