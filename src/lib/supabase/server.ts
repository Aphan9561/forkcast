import { auth } from "@clerk/nextjs/server";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

/**
 * Server-side Supabase client that forwards the current Clerk session token
 * so Postgres RLS sees `auth.jwt()->>'sub'` === Clerk user ID.
 *
 * Requires Clerk to be enabled as a third-party auth provider in the Supabase
 * dashboard (Authentication → Sign In / Providers → Clerk).
 */
export async function createSupabaseServerClient() {
  const { getToken } = await auth();

  return createClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    {
      async accessToken() {
        return (await getToken()) ?? null;
      },
    },
  );
}
