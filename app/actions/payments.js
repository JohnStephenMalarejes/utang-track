"use server";

import crypto from "node:crypto";
import { revalidatePath } from "next/cache";
import { paymentSchema, memberPaymentSchema, firstError } from "@/lib/validations/schemas";
import { allocateMemberPayment } from "@/lib/calculations/ledger";
import { parseAmount, centsToDecimal, toCents, formatPHP } from "@/lib/utils/money";
import { todayISO } from "@/lib/utils/dates";
import { fail, succeed, withAuth } from "@/lib/action-helpers";

function isMissingColumnError(error) {
  return error?.code === "42703" || error?.code === "PGRST204";
}

function stripExtendedPaymentFields(row) {
  const { payment_method, batch_id, receipt_path, ...legacy } = row;
  return legacy;
}

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

/** Loads all shares for a member along with their remaining unpaid balances. */
async function loadMemberShares(supabase, memberId) {
  const [{ data: shares, error: shareErr }, { data: payments, error: payErr }] = await Promise.all([
    supabase
      .from("expense_shares")
      .select("id, member_id, share_amount, expenses(paid_by, expense_date)")
      .eq("member_id", memberId),
    supabase.from("payments").select("expense_share_id, amount").eq("member_id", memberId),
  ]);
  if (shareErr) throw shareErr;
  if (payErr) throw payErr;

  const paidByShare = new Map();
  for (const p of payments) {
    paidByShare.set(p.expense_share_id, (paidByShare.get(p.expense_share_id) || 0) + toCents(p.amount));
  }

  return shares.map((s) => {
    const isPayer = Boolean(s.expenses?.paid_by) && s.expenses.paid_by === s.member_id;
    const owedCents = isPayer ? 0 : toCents(s.share_amount);
    const paidCents = paidByShare.get(s.id) || 0;
    return {
      id: s.id,
      memberId: s.member_id,
      owedCents,
      isPayer,
      remainingCents: owedCents - paidCents,
      expenseDate: s.expenses?.expense_date ?? "",
    };
  });
}

async function insertPaymentRows(supabase, rows, { requireExtended = false } = {}) {
  let { error } = await supabase.from("payments").insert(rows);
  if (error && isMissingColumnError(error)) {
    if (requireExtended) {
      return fail("Run supabase/migrations/0004_features.sql in Supabase first to save payment method or proof photo.");
    }
    ({ error } = await supabase.from("payments").insert(rows.map(stripExtendedPaymentFields)));
  }
  if (error) return fail(error);
  return null;
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
      payment_method: v.payment_method,
      notes: v.notes || null,
      receipt_path: v.receipt_path || null,
    };

    const requireExtended = Boolean(v.receipt_path);
    let error;
    if (v.id) {
      ({ error } = await supabase.from("payments").update(row).eq("id", v.id));
      if (error && isMissingColumnError(error) && !requireExtended) {
        ({ error } = await supabase.from("payments").update(stripExtendedPaymentFields(row)).eq("id", v.id));
      } else if (error && isMissingColumnError(error)) {
        return fail("Run supabase/migrations/0004_features.sql in Supabase first to attach a payment proof photo.");
      }
    } else {
      const insertFail = await insertPaymentRows(supabase, [row], { requireExtended });
      if (insertFail) return insertFail;
    }
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

/** Deletes all payments that belong to the same bulk payment batch. */
export async function deletePaymentBatch(batchId) {
  return withAuth(async (supabase) => {
    if (!batchId) return fail("Missing batch ID.");
    const { error } = await supabase.from("payments").delete().eq("batch_id", batchId);
    if (error) {
      if (isMissingColumnError(error)) {
        return fail("Run supabase/migrations/0004_features.sql in Supabase first.");
      }
      return fail(error);
    }
    revalidatePath("/", "layout");
    return succeed();
  });
}

/** Pays off whatever is still owed. Used by the "Settle" buttons. */
async function settleShares(supabase, shareIds, date, paymentMethod = "Cash") {
  const rows = [];
  const batchId = shareIds.length > 1 ? crypto.randomUUID() : null;
  for (const id of shareIds) {
    const share = await loadShare(supabase, id);
    if (share && !share.isPayer && share.remainingCents > 0) {
      rows.push({
        member_id: share.memberId,
        expense_share_id: id,
        amount: centsToDecimal(share.remainingCents),
        payment_date: date,
        payment_method: paymentMethod,
        batch_id: batchId,
        notes: "Marked as fully settled",
      });
    }
  }
  if (rows.length === 0) return fail("Nothing is outstanding here.");
  const insertFail = await insertPaymentRows(supabase, rows);
  if (insertFail) return insertFail;
  revalidatePath("/", "layout");
  return succeed({ count: rows.length });
}

export async function payAllMemberUtang(input) {
  const parsed = memberPaymentSchema.safeParse(input);
  if (!parsed.success) return fail(firstError(parsed));
  const v = parsed.data;
  const amountCents = parseAmount(v.amount);

  return withAuth(async (supabase) => {
    const shares = await loadMemberShares(supabase, v.member_id);
    const { allocations, allocatedCents, totalRemainingCents, excessCents } = allocateMemberPayment(shares, amountCents);

    if (totalRemainingCents <= 0) return fail("This member has no unpaid utang left.");
    if (excessCents > 0) {
      return fail(
        `Amount exceeds this member's total unpaid balance of ${formatPHP(totalRemainingCents)}. Enter up to ${formatPHP(totalRemainingCents)} or switch to a single expense to record an overpayment.`
      );
    }
    if (allocations.length === 0) return fail("Nothing is outstanding here.");

    const batchId = allocations.length > 1 ? crypto.randomUUID() : null;
    const rows = allocations.map((a) => ({
      member_id: v.member_id,
      expense_share_id: a.share.id,
      amount: centsToDecimal(a.amountCents),
      payment_date: v.payment_date,
      payment_method: v.payment_method,
      batch_id: batchId,
      notes: v.notes || null,
      receipt_path: v.receipt_path || null,
    }));

    const insertFail = await insertPaymentRows(supabase, rows, { requireExtended: Boolean(v.receipt_path) });
    if (insertFail) return insertFail;

    revalidatePath("/", "layout");
    return succeed({
      count: rows.length,
      batchId,
      settledAll: allocatedCents === totalRemainingCents,
      totalCents: allocatedCents,
    });
  });
}

export async function settleShare(shareId, date = todayISO(), paymentMethod = "Cash") {
  return withAuth((supabase) => settleShares(supabase, [shareId], date, paymentMethod));
}

export async function settleMember(memberId, date = todayISO(), paymentMethod = "Cash") {
  return withAuth(async (supabase) => {
    const shares = await loadMemberShares(supabase, memberId);
    const { unpaid } = allocateMemberPayment(shares, 0);
    if (unpaid.length === 0) return fail("Nothing is outstanding here.");

    const batchId = unpaid.length > 1 ? crypto.randomUUID() : null;
    const rows = unpaid.map((share) => ({
      member_id: share.memberId,
      expense_share_id: share.id,
      amount: centsToDecimal(share.remainingCents),
      payment_date: date,
      payment_method: paymentMethod,
      batch_id: batchId,
      notes: "Marked as fully settled",
    }));

    const insertFail = await insertPaymentRows(supabase, rows);
    if (insertFail) return insertFail;
    revalidatePath("/", "layout");
    return succeed({ count: rows.length, batchId });
  });
}
