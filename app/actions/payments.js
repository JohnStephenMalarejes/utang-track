"use server";

import { revalidatePath } from "next/cache";
import { paymentSchema, firstError } from "@/lib/validations/schemas";
import { parseAmount, centsToDecimal, toCents, formatPHP } from "@/lib/utils/money";
import { todayISO } from "@/lib/utils/dates";
import { fail, succeed, withAuth } from "@/lib/action-helpers";

/** Loads a share plus everything needed to know how much is still owed on it. */
async function loadShare(supabase, shareId, ignorePaymentId) {
  const { data: share, error } = await supabase
    .from("expense_shares")
    .select("id, member_id, share_amount, expenses(paid_by)")
    .eq("id", shareId)
    .maybeSingle();
  if (error) throw error;
  if (!share) return null;

  const { data: existing, error: payErr } = await supabase.from("payments").select("id, amount").eq("expense_share_id", shareId);
  if (payErr) throw payErr;

  const paidCents = existing.filter((p) => p.id !== ignorePaymentId).reduce((sum, p) => sum + toCents(p.amount), 0);
  return {
    memberId: share.member_id,
    owedCents: toCents(share.share_amount),
    isPayer: Boolean(share.expenses?.paid_by) && share.expenses.paid_by === share.member_id,
    remainingCents: toCents(share.share_amount) - paidCents,
  };
}

export async function savePayment(input) {
  const parsed = paymentSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;
  const amountCents = parseAmount(v.amount);

  return withAuth(async (supabase) => {
    const share = await loadShare(supabase, v.expense_share_id, v.id);
    if (!share) return fail("That expense share no longer exists.");
    if (share.memberId !== v.member_id) return fail("The selected expense does not belong to this member.");
    if (share.isPayer) return fail("The person who paid the bill doesn't owe their own share.");

    if (amountCents > share.remainingCents && !v.confirmOverpay) {
      return fail(`This is more than the remaining balance of ${formatPHP(Math.max(share.remainingCents, 0))}. Confirm the overpayment to continue.`, {
        code: "OVERPAY",
      });
    }

    const row = {
      member_id: v.member_id,
      expense_share_id: v.expense_share_id,
      amount: centsToDecimal(amountCents),
      payment_date: v.payment_date,
      notes: v.notes || null,
    };
    const { error } = v.id ? await supabase.from("payments").update(row).eq("id", v.id) : await supabase.from("payments").insert(row);
    if (error) return fail(error);

    revalidatePath("/", "layout");
    return succeed();
  });
}

export async function deletePayment(id) {
  return withAuth(async (supabase) => {
    const { error } = await supabase.from("payments").delete().eq("id", id);
    if (error) return fail(error);
    revalidatePath("/", "layout");
    return succeed();
  });
}

/** Pays off whatever is still owed. Used by the "Settle" buttons. */
async function settleShares(supabase, shareIds, date) {
  const rows = [];
  for (const id of shareIds) {
    const share = await loadShare(supabase, id);
    if (share && !share.isPayer && share.remainingCents > 0) {
      rows.push({
        member_id: share.memberId,
        expense_share_id: id,
        amount: centsToDecimal(share.remainingCents),
        payment_date: date,
        notes: "Marked as fully settled",
      });
    }
  }
  if (rows.length === 0) return fail("Nothing is outstanding here.");
  const { error } = await supabase.from("payments").insert(rows);
  if (error) return fail(error);
  revalidatePath("/", "layout");
  return succeed({ count: rows.length });
}

export async function settleShare(shareId, date = todayISO()) {
  return withAuth((supabase) => settleShares(supabase, [shareId], date));
}

export async function settleMember(memberId, date = todayISO()) {
  return withAuth(async (supabase) => {
    const { data, error } = await supabase.from("expense_shares").select("id").eq("member_id", memberId);
    if (error) return fail(error);
    return settleShares(supabase, data.map((s) => s.id), date);
  });
}
