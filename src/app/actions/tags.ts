"use server";

import { revalidatePath } from "next/cache";
import { requireUser } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

/**
 * Idempotent: returns the existing tag if the name already exists (citext
 * unique constraint handles case-insensitive matching).
 */
export async function createTag(
  name: string,
): Promise<{ id: string; name: string }> {
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Tag name is required");

  const userId = await requireUser();
  const sb = await createSupabaseServerClient();

  const { data, error } = await sb
    .from("tags")
    .insert({ user_id: userId, name: trimmed })
    .select("id, name")
    .single();

  if (error) {
    // 23505 = unique violation: tag with this (case-insensitive) name already exists.
    if (error.code === "23505") {
      const { data: existing, error: findErr } = await sb
        .from("tags")
        .select("id, name")
        .ilike("name", trimmed)
        .single();
      if (findErr) throw findErr;
      return existing;
    }
    throw error;
  }

  revalidatePath("/favorites");
  return data;
}

export async function assignTag(mealId: string, tagId: string): Promise<void> {
  const userId = await requireUser();
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("favorite_tags")
    .insert({ user_id: userId, meal_id: mealId, tag_id: tagId });

  // 23505 = already assigned; treat as no-op rather than throwing.
  if (error && error.code !== "23505") throw error;

  revalidatePath("/favorites");
}

export async function removeTag(mealId: string, tagId: string): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();

  const { error } = await sb
    .from("favorite_tags")
    .delete()
    .eq("meal_id", mealId)
    .eq("tag_id", tagId);
  if (error) throw error;

  revalidatePath("/favorites");
}

export async function deleteTag(tagId: string): Promise<void> {
  await requireUser();
  const sb = await createSupabaseServerClient();
  const { error } = await sb.from("tags").delete().eq("id", tagId);
  if (error) throw error;
  revalidatePath("/favorites");
}
