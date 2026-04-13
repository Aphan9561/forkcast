import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type PantryItemRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  created_at: string;
};

export async function listPantry(): Promise<PantryItemRow[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("pantry_items")
    .select("id, name, quantity, unit, created_at")
    .order("name", { ascending: true });
  if (error) throw error;
  return data ?? [];
}
