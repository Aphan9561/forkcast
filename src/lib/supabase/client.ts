"use client";

import { useSession } from "@clerk/nextjs";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { useMemo } from "react";
import type { Database } from "./types";

/**
 * Browser Supabase client tied to the Clerk session.
 * Returns a memoized client that forwards Clerk's session token on every request.
 */
export function useSupabaseClient(): SupabaseClient<Database> {
  const { session } = useSession();

  return useMemo(
    () =>
      createClient<Database>(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
        {
          async accessToken() {
            return (await session?.getToken()) ?? null;
          },
        },
      ),
    [session],
  );
}
