"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center p-6 py-24">
      <h1 className="text-lg font-semibold">Something went wrong.</h1>
      <p className="text-sm text-zinc-500 max-w-sm">
        {error.message || "An unexpected error occurred."}
      </p>
      <button
        type="button"
        onClick={reset}
        className="rounded-full bg-foreground text-background px-4 h-9 text-sm font-medium hover:opacity-90"
      >
        Try again
      </button>
    </div>
  );
}
