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
export function buildLedger({ members = [], expenses = [], payments = [] }) {
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
      notes: p.notes || "",
      createdAt: p.created_at,
    };
  });

  const ledgerMembers = members.map((m) => {
    const own = shares.filter((s) => s.memberId === m.id);
    const ownPayments = ledgerPayments.filter((p) => p.memberId === m.id);
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

  return { members: ledgerMembers, expenses: ledgerExpenses, shares, payments: ledgerPayments, totals };
}
