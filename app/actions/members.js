"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { memberSchema, firstError } from "@/lib/validations/schemas";
import { fail, succeed, withAuth } from "@/lib/action-helpers";

export async function saveMember(input) {
  const parsed = memberSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const { id, name, contact, notes } = parsed.data;

  return withAuth(async (supabase) => {
    const row = { name, contact: contact || null, notes: notes || null };
    const { error } = id ? await supabase.from("members").update(row).eq("id", id) : await supabase.from("members").insert(row);
    if (error) {
      if (error.code === "23505") return fail("A member with this name already exists.");
      return fail(error);
    }
    revalidatePath("/", "layout");
    return succeed();
  });
}

export async function deleteMember(id) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("members").delete().eq("id", id);
    if (error) {
      if (error.code === "23503") return fail("This member still has expenses or payments. Remove those records first.");
      return fail(error);
    }
    revalidatePath("/", "layout");
    return succeed();
  });
}

/** Generates (or rotates) a private read-only statement token for a member. */
export async function generateMemberShareToken(memberId) {
  return withAuth(async (supabase) => {
    const token = crypto.randomBytes(18).toString("base64url");
    const { error } = await supabase.from("members").update({ share_token: token }).eq("id", memberId);
    if (error) {
      if (error.code === "42703" || error.code === "PGRST204") {
        return fail("Run supabase/migrations/0004_features.sql in your Supabase SQL Editor first to enable shareable links.");
      }
      return fail(error);
    }
    revalidatePath("/", "layout");
    return succeed({ token });
  });
}

/** Revokes a member's read-only statement link immediately. */
export async function revokeMemberShareToken(memberId) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("members").update({ share_token: null }).eq("id", memberId);
    if (error) {
      if (error.code === "42703" || error.code === "PGRST204") {
        return fail("Run supabase/migrations/0004_features.sql in your Supabase SQL Editor first.");
      }
      return fail(error);
    }
    revalidatePath("/", "layout");
    return succeed();
  });
}
