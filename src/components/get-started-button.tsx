"use client";

import { useClerk } from "@clerk/nextjs";

/**
 * Opens Clerk's sign-up modal on click. Uses useClerk() rather than Clerk's
 * <SignUpButton> wrapper so we don't hit v7's strict React.Children.only()
 * assertion (it rejects any children that render as more than one node,
 * including JSX whitespace).
 */
export function GetStartedButton() {
  const clerk = useClerk();
  return (
    <button
      type="button"
      onClick={() => clerk.openSignUp()}
      className="inline-flex items-center justify-center rounded-full bg-accent text-white px-6 h-11 text-sm font-medium hover:opacity-90"
    >
      Get started
    </button>
  );
}
