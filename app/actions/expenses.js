"use server";

import { revalidatePath } from "next/cache";
import { expenseSchema, firstError } from "@/lib/validations/schemas";
import { parseAmount, centsToDecimal } from "@/lib/utils/money";
import { fail, succeed, withAuth } from "@/lib/action-helpers";

/** Creates or updates an expense and its shares. */
export async function saveExpense(input) {
  const parsed = expenseSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;

  return withAuth(async (supabase) => {
    const expenseRow = {
      description: v.description.trim(),
      category: v.category,
      total_amount: centsToDecimal(parseAmount(v.total_amount)),
      expense_date: v.expense_date,
      paid_by: v.paid_by || null,
      notes: v.notes?.trim() ? v.notes.trim() : null,
    };

    if (!v.id) {
      const { data: created, error: expErr } = await supabase.from("expenses").insert(expenseRow).select("id").single();
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

      if (expenseRow.paid_by) {
        const payerShare = (existingShares || []).find((es) => es.member_id === expenseRow.paid_by);
        if (payerShare?.payments?.length > 0) {
          return fail("The selected payer already has payments recorded on this expense. Delete those payments first.");
        }
      }

      const { error: updErr } = await supabase.from("expenses").update(expenseRow).eq("id", v.id);
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
