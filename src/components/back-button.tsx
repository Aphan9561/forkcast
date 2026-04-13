"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

type Props = {
  fallbackHref?: string;
  label?: string;
  className?: string;
};

const DEFAULT_CLASSNAME =
  "inline-flex items-center gap-1 text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-white";

/**
 * Back button that uses router.back() when there's history (e.g., user
 * navigated here from /browse), or falls through to `fallbackHref` on a
 * cold page load where history.length === 1.
 */
export function BackButton({
  fallbackHref = "/browse",
  label = "← Back",
  className = DEFAULT_CLASSNAME,
}: Props) {
  const router = useRouter();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    setCanGoBack(window.history.length > 1);
  }, []);

  if (!canGoBack) {
    return (
      <Link href={fallbackHref} className={className}>
        {label}
      </Link>
    );
  }

  return (
    <button type="button" onClick={() => router.back()} className={className}>
      {label}
    </button>
  );
}
