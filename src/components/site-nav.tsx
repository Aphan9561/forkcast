import {
  Show,
  SignInButton,
  SignUpButton,
  UserButton,
} from "@clerk/nextjs";
import Link from "next/link";

// Public link shown to everyone.
const PUBLIC_LINKS = [{ href: "/browse", label: "Browse" }];

// Protected links — only rendered when signed in. Middleware still enforces
// access if someone navigates directly.
const AUTHED_LINKS = [
  { href: "/favorites", label: "Favorites" },
  { href: "/plan", label: "Plan" },
  { href: "/shopping", label: "Shopping" },
  { href: "/pantry", label: "Pantry" },
];

export function SiteNav() {
  return (
    <header className="flex items-center justify-between gap-4 px-6 py-3 border-b border-black/5 dark:border-white/10">
      <div className="flex items-center gap-6">
        <Link
          href="/"
          className="font-display text-xl font-semibold tracking-tight"
        >
          Forkcast
        </Link>
        <nav className="flex items-center gap-4 text-sm text-zinc-600 dark:text-zinc-400">
          {PUBLIC_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="hover:text-zinc-900 dark:hover:text-white"
            >
              {link.label}
            </Link>
          ))}
          <Show when="signed-in">
            {AUTHED_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="hover:text-zinc-900 dark:hover:text-white"
              >
                {link.label}
              </Link>
            ))}
          </Show>
        </nav>
      </div>
      <div className="flex items-center gap-3">
        <Show when="signed-out">
          <SignInButton />
          <SignUpButton />
        </Show>
        <Show when="signed-in">
          <UserButton />
        </Show>
      </div>
    </header>
  );
}
