import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export type ShoppingItemRow = {
  id: string;
  name: string;
  quantity: number | null;
  unit: string | null;
  checked: boolean;
  source_meal_id: string | null;
  created_at: string;
};

export async function listShopping(): Promise<ShoppingItemRow[]> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { data, error } = await sb
    .from("shopping_list_items")
    .select("id, name, quantity, unit, checked, source_meal_id, created_at")
    .order("checked", { ascending: true })
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data ?? [];
}
