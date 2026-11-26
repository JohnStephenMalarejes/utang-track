import { toCents, sumCents, splitEqual } from "../utils/money.js";

// Settlement states, shared by shares, expenses and members.
const UNSETTLED = "unsettled";
const PARTIAL = "partial";
const SETTLED = "settled";

export function statusFor(owedCents, paidCents) {
  if (owedCents <= 0 || paidCents >= owedCents) return SETTLED;
  if (paidCents > 0) return PARTIAL;
  return UNSETTLED;
}

/**
 * Allocate a lump-sum payment across a member's unpaid shares, oldest expense first.
 * Each share needs `{ id, remainingCents, isPayer, expenseDate }`.
 */
export function allocateMemberPayment(shares, amountCents) {
  const unpaid = shares
    .filter((s) => !s.isPayer && s.remainingCents > 0)
    .sort((a, b) => {
      const dateCmp = String(a.expenseDate ?? "").localeCompare(String(b.expenseDate ?? ""));
      return dateCmp !== 0 ? dateCmp : String(a.id ?? "").localeCompare(String(b.id ?? ""));
    });

  const totalRemainingCents = sumCents(unpaid.map((s) => s.remainingCents));
  const target = Number.isInteger(amountCents) && amountCents > 0 ? amountCents : 0;
  let left = target;
  const allocations = [];

  for (const share of unpaid) {
    if (left <= 0) break;
    const take = Math.min(left, share.remainingCents);
    allocations.push({
      share,
      amountCents: take,
      settlesShare: take === share.remainingCents,
    });
    left -= take;
  }

  const allocatedCents = target - left;
  return {
    unpaid,
    allocations,
    allocatedCents,
    totalRemainingCents,
    excessCents: Math.max(target - totalRemainingCents, 0),
  };
}

/**
 * Collapses bulk payments that share a `batchId` (2+ items) into grouped rows
 * while preserving the existing sort order.
 */
export function groupPaymentsByBatch(payments = []) {
  const byBatch = new Map();
  for (const p of payments) {
    if (!p.batchId) continue;
    if (!byBatch.has(p.batchId)) byBatch.set(p.batchId, []);
    byBatch.get(p.batchId).push(p);
  }

  const emitted = new Set();
  const entries = [];
  for (const p of payments) {
    if (p.batchId && (byBatch.get(p.batchId)?.length ?? 0) > 1) {
      if (emitted.has(p.batchId)) continue;
      emitted.add(p.batchId);
      const items = byBatch.get(p.batchId);
      entries.push({
        id: `batch-${p.batchId}`,
        isBatch: true,
        batchId: p.batchId,
        memberId: p.memberId,
        memberName: p.memberName,
        date: p.date,
        paymentMethod: p.paymentMethod || "Cash",
        notes: p.notes || "",
        receiptPath: items.find((i) => i.receiptPath)?.receiptPath ?? null,
        amountCents: sumCents(items.map((i) => i.amountCents)),
        expenseDescription: `${items.length} expenses`,
        items,
      });
    } else {
      entries.push({ ...p, isBatch: false, items: [p] });
    }
  }
  return entries;
}

/**
 * Build the complete, derived ledger from raw database rows.
 *
 * Rules
 *  - Total Assigned  = sum of a member's shares
 *  - Total Paid      = sum of that member's payments
 *  - Outstanding     = Assigned - Paid   (negative means the member overpaid / has credit)
 *  - The person who paid the original bill does not owe themselves: if the payer is also
 *    a participant, their own share is shown but is not counted as a debt.
 *
 * Everything is integer centavos.
 */
export function buildLedger({ members = [], expenses = [], payments = [], paymentDetails = "" }) {
  const memberById = new Map(members.map((m) => [m.id, m]));

  // payments grouped by share
  const paidByShare = new Map();
  for (const p of payments) {
    paidByShare.set(p.expense_share_id, (paidByShare.get(p.expense_share_id) || 0) + toCents(p.amount));
  }

  const shares = [];
  const ledgerExpenses = expenses.map((e) => {
    const expenseShares = (e.expense_shares || []).map((s) => {
      const amountCents = toCents(s.share_amount);
      const isPayer = Boolean(e.paid_by) && e.paid_by === s.member_id;
      const owedCents = isPayer ? 0 : amountCents;
      const paidCents = paidByShare.get(s.id) || 0;
      const remainingCents = owedCents - paidCents;
      const share = {
        id: s.id,
        expenseId: e.id,
        memberId: s.member_id,
        memberName: memberById.get(s.member_id)?.name ?? "Unknown member",
        amountCents,
        owedCents,
        paidCents,
        remainingCents,
        isPayer,
        status: statusFor(owedCents, paidCents),
        expenseDescription: e.description,
        expenseCategory: e.category,
        expenseDate: e.expense_date,
      };
      shares.push(share);
      return share;
    });

    const totalCents = toCents(e.total_amount);
    const memberSharesCents = sumCents(expenseShares.map((s) => s.amountCents));
    const equalMembersOnly = splitEqual(totalCents, expenseShares.length);
    const isEqualMembersOnly =
      expenseShares.length > 0 && expenseShares.every((s, i) => s.amountCents === equalMembersOnly[i]);
    const equalWithUser = splitEqual(totalCents, expenseShares.length + 1);
    const isEqualWithUser =
      expenseShares.length > 0 && expenseShares.every((s, i) => s.amountCents === equalWithUser[i + 1]);
    const userShareCents = isEqualWithUser
      ? equalWithUser[0]
      : isEqualMembersOnly
        ? 0
        : Math.max(totalCents - memberSharesCents, 0);

    const owedCents = sumCents(expenseShares.map((s) => s.owedCents));
    const paidCents = sumCents(expenseShares.map((s) => Math.min(s.paidCents, Math.max(s.owedCents, 0))));
    return {
      id: e.id,
      description: e.description,
      category: e.category,
      date: e.expense_date,
      totalCents,
      userShareCents,
      paidBy: e.paid_by,
      paidByName: e.paid_by ? memberById.get(e.paid_by)?.name ?? "Unknown member" : null,
      notes: e.notes || "",
      receiptPath: e.receipt_path || null,
      createdAt: e.created_at,
      shares: expenseShares,
      owedCents,
      paidCents,
      remainingCents: Math.max(owedCents - paidCents, 0),
      status: statusFor(owedCents, paidCents),
    };
  });

  const shareById = new Map(shares.map((s) => [s.id, s]));

  const ledgerPayments = payments.map((p) => {
    const share = shareById.get(p.expense_share_id);
    return {
      id: p.id,
      memberId: p.member_id,
      memberName: memberById.get(p.member_id)?.name ?? "Unknown member",
      shareId: p.expense_share_id,
      expenseId: share?.expenseId ?? null,
      expenseDescription: share?.expenseDescription ?? "Deleted expense",
      expenseDate: share?.expenseDate ?? null,
      amountCents: toCents(p.amount),
      date: p.payment_date,
      paymentMethod: p.payment_method || "Cash",
      batchId: p.batch_id || null,
      receiptPath: p.receipt_path || null,
      notes: p.notes || "",
      createdAt: p.created_at,
    };
  });

  const sharesByMember = new Map();
  for (const s of shares) {
    const list = sharesByMember.get(s.memberId);
    if (list) list.push(s);
    else sharesByMember.set(s.memberId, [s]);
  }

  const paymentsByMember = new Map();
  for (const p of ledgerPayments) {
    const list = paymentsByMember.get(p.memberId);
    if (list) list.push(p);
    else paymentsByMember.set(p.memberId, [p]);
  }

  const ledgerMembers = members.map((m) => {
    const own = sharesByMember.get(m.id) || [];
    const ownPayments = paymentsByMember.get(m.id) || [];
    const assignedCents = sumCents(own.map((s) => s.owedCents));
    const paidCents = sumCents(ownPayments.map((p) => p.amountCents));
    const balanceCents = assignedCents - paidCents;
    let status = "none";
    if (own.length > 0) status = statusFor(assignedCents, paidCents);
    return {
      id: m.id,
      name: m.name,
      contact: m.contact || "",
      notes: m.notes || "",
      shareToken: m.share_token || null,
      createdAt: m.created_at,
      assignedCents,
      paidCents,
      balanceCents,
      expenseCount: own.length,
      paymentCount: ownPayments.length,
      status,
    };
  });

  const totals = {
    expensesCents: sumCents(ledgerExpenses.map((e) => e.totalCents)),
    settledCents: sumCents(ledgerMembers.map((m) => m.paidCents)),
    outstandingCents: sumCents(ledgerMembers.map((m) => Math.max(m.balanceCents, 0))),
    expenseCount: ledgerExpenses.length,
    unsettledCount: ledgerExpenses.filter((e) => e.status !== SETTLED).length,
    memberCount: ledgerMembers.length,
    paymentCount: ledgerPayments.length,
  };

  return { members: ledgerMembers, expenses: ledgerExpenses, shares, payments: ledgerPayments, totals, paymentDetails };
}
