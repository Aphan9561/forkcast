import { auth } from "@clerk/nextjs/server";

/**
 * Server-side helper: ensures a Clerk session exists and returns the user id.
 * Throws if unauthenticated — use at the top of server actions that must be
 * called by a signed-in user. Middleware already blocks unauthenticated access
 * to protected routes, so this is a belt-and-suspenders check for actions
 * callable from any page.
 */
export async function requireUser(): Promise<string> {
  const { userId } = await auth();
  if (!userId) {
    throw new Error("UNAUTHENTICATED");
  }
  return userId;
}
