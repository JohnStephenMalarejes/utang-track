"use server";

import { revalidatePath } from "next/cache";
import { expenseSchema, firstError } from "@/lib/validations/schemas";
import { parseAmount, centsToDecimal } from "@/lib/utils/money";
import { fail, succeed, withAuth } from "@/lib/action-helpers";

function isMissingColumnError(error) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

/** Creates or updates an expense and its shares. */
export async function saveExpense(input) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;

  return withAuth(async (supabase) => {
    const baseRow = {
      description: v.description.trim(),
      category: v.category,
      total_amount: centsToDecimal(parseAmount(v.total_amount)),
      expense_date: v.expense_date,
      paid_by: v.paid_by || null,
      notes: v.notes?.trim() ? v.notes.trim() : null,
    };
    const expenseRow = { ...baseRow, receipt_path: v.receipt_path || null };

    if (!v.id) {
      let { data: created, error: expErr } = await supabase.from("expenses").insert(expenseRow).select("id").single();
      if (expErr && isMissingColumnError(expErr) && !v.receipt_path) {
        ({ data: created, error: expErr } = await supabase.from("expenses").insert(baseRow).select("id").single());
      } else if (expErr && isMissingColumnError(expErr)) {
        return fail("Run supabase/migrations/0004_features.sql in Supabase first to attach receipt photos.");
      }
      if (expErr) return fail(expErr);

      const shareRows = v.shares.map((s) => ({
        expense_id: created.id,
        member_id: s.member_id,
        share_amount: centsToDecimal(parseAmount(s.share_amount)),
      }));
      const { error: shareErr } = await supabase.from("expense_shares").insert(shareRows);
      if (shareErr) {
        await supabase.from("expenses").delete().eq("id", created.id);
        return fail(shareErr);
      }
    } else {
      const { data: existingShares, error: loadErr } = await supabase
        .from("expense_shares")
        .select("id, member_id, members(name), payments(id)")
        .eq("expense_id", v.id);
      if (loadErr) return fail(loadErr);

      const keepMemberIds = new Set(v.shares.map((s) => s.member_id));
      const removedWithPayments = (existingShares || []).filter(
        (es) => !keepMemberIds.has(es.member_id) && es.payments && es.payments.length > 0
      );
      if (removedWithPayments.length > 0) {
        const names = removedWithPayments.map((es) => es.members?.name ?? "member").join(", ");
        return fail(`Cannot remove participant(s) who already have payments: ${names}. Delete those payments first.`);
      }

      if (baseRow.paid_by) {
        const payerShare = (existingShares || []).find((es) => es.member_id === baseRow.paid_by);
        if (payerShare?.payments?.length > 0) {
          return fail("The selected payer already has payments recorded on this expense. Delete those payments first.");
        }
      }

      let { error: updErr } = await supabase.from("expenses").update(expenseRow).eq("id", v.id);
      if (updErr && isMissingColumnError(updErr) && !v.receipt_path) {
        ({ error: updErr } = await supabase.from("expenses").update(baseRow).eq("id", v.id));
      } else if (updErr && isMissingColumnError(updErr)) {
        return fail("Run supabase/migrations/0004_features.sql in Supabase first to attach receipt photos.");
      }
      if (updErr) return fail(updErr);

      const toRemoveIds = (existingShares || []).filter((es) => !keepMemberIds.has(es.member_id)).map((es) => es.id);
      if (toRemoveIds.length > 0) {
        const { error: delErr } = await supabase.from("expense_shares").delete().in("id", toRemoveIds);
        if (delErr) return fail(delErr);
      }

      const shareRows = v.shares.map((s) => ({
        expense_id: v.id,
        member_id: s.member_id,
        share_amount: centsToDecimal(parseAmount(s.share_amount)),
      }));
      const { error: upsertErr } = await supabase
        .from("expense_shares")
        .upsert(shareRows, { onConflict: "expense_id,member_id" });
      if (upsertErr) return fail(upsertErr);
    }

    revalidatePath("/", "layout");
    return succeed();
  });
}

export async function deleteExpense(id) {
  return withAuth(async (supabase) => {
    // expense_shares and their payments are removed by ON DELETE CASCADE
    const { error } = await supabase.from("expenses").delete().eq("id", id);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return succeed();
  });
}
