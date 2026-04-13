"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TablesUpdate } from "@/lib/supabase/types";

export async function addPantryItem(input: {
  name: string;
  quantity?: number | null;
  unit?: string | null;
}): Promise<void> {
  const name = input.name.trim();
  if (!name) throw new Error("Name is required");

  const userId = await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("pantry_items").insert({
    user_id: userId,
    name,
    quantity: input.quantity ?? null,
    unit: (input.unit ?? "").trim() || null,
  });
  if (error) throw error;
  revalidatePath("/pantry");
}

export async function updatePantryItem(
  id: string,
  patch: {
    name?: string;
    quantity?: number | null;
    unit?: string | null;
  },
): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();

  const payload: TablesUpdate<"pantry_items"> = {};
  if (patch.name !== undefined) {
    const trimmed = patch.name.trim();
    if (!trimmed) throw new Error("Name is required");
    payload.name = trimmed;
  }
  if (patch.quantity !== undefined) payload.quantity = patch.quantity;
  if (patch.unit !== undefined) payload.unit = (patch.unit ?? "").trim() || null;

  const { error } = await sb.from("pantry_items").update(payload).eq("id", id);
  if (error) throw error;
  revalidatePath("/pantry");
}

export async function deletePantryItem(id: string): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("pantry_items").delete().eq("id", id);
  if (error) throw error;
  revalidatePath("/pantry");
}
