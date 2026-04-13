import { clerkMiddleware } from "@clerk/nextjs/server";

// All routes are public by default. We'll add `createRouteMatcher` + `auth.protect()`
// here once we introduce protected pages (e.g. /meal-plan, /favorites).
export default clerkMiddleware();

export const config = {
  matcher: [
    // Skip Next.js internals and static files
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    // Always run for API routes
    "/(api|trpc)(.*)",
  ],
};
