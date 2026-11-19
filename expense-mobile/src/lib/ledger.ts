import { SettlementStatus } from './constants';
import { splitEqual, sumCents, toCents } from './money';

const UNSETTLED = 'unsettled';
const PARTIAL = 'partial';
const SETTLED = 'settled';

export function statusFor(owedCents: number, paidCents: number): SettlementStatus {
  if (owedCents <= 0 || paidCents >= owedCents) return SETTLED;
  if (paidCents > 0) return PARTIAL;
  return UNSETTLED;
}

export interface RawMember {
  id: string;
  name: string;
  contact?: string | null;
  notes?: string | null;
  created_at?: string;
}

export interface RawExpenseShare {
  id: string;
  expense_id: string;
  member_id: string;
  share_amount: number | string;
}

export interface RawExpense {
  id: string;
  description: string;
  category: string;
  total_amount: number | string;
  expense_date: string;
  paid_by?: string | null;
  notes?: string | null;
  created_at?: string;
  expense_shares?: RawExpenseShare[];
}

export interface RawPayment {
  id: string;
  member_id: string;
  expense_share_id: string;
  amount: number | string;
  payment_date: string;
  notes?: string | null;
  created_at?: string;
}

export interface LedgerShare {
  id: string;
  expenseId: string;
  memberId: string;
  memberName: string;
  amountCents: number;
  owedCents: number;
  paidCents: number;
  remainingCents: number;
  isPayer: boolean;
  status: SettlementStatus;
  expenseDescription: string;
  expenseCategory: string;
  expenseDate: string;
}

export interface LedgerExpense {
  id: string;
  description: string;
  category: string;
  date: string;
  totalCents: number;
  userShareCents: number;
  paidBy: string | null | undefined;
  paidByName: string | null;
  notes: string;
  createdAt?: string;
  shares: LedgerShare[];
  owedCents: number;
  paidCents: number;
  remainingCents: number;
  status: SettlementStatus;
}

export interface LedgerPayment {
  id: string;
  memberId: string;
  memberName: string;
  shareId: string;
  expenseId: string | null;
  expenseDescription: string;
  expenseDate: string | null;
  amountCents: number;
  date: string;
  notes: string;
  createdAt?: string;
}

export interface LedgerMember {
  id: string;
  name: string;
  contact: string;
  notes: string;
  createdAt?: string;
  assignedCents: number;
  paidCents: number;
  balanceCents: number;
  expenseCount: number;
  paymentCount: number;
  status: SettlementStatus;
}

export interface LedgerTotals {
  expensesCents: number;
  settledCents: number;
  outstandingCents: number;
  expenseCount: number;
  unsettledCount: number;
  memberCount: number;
  paymentCount: number;
}

export interface Ledger {
  members: LedgerMember[];
  expenses: LedgerExpense[];
  shares: LedgerShare[];
  payments: LedgerPayment[];
  totals: LedgerTotals;
}

/**
 * Build the complete, derived ledger from raw database rows.
 */
export function buildLedger({
  members = [],
  expenses = [],
  payments = [],
}: {
  members?: RawMember[];
  expenses?: RawExpense[];
  payments?: RawPayment[];
}): Ledger {
  const memberById = new Map(members.map((m) => [m.id, m]));

  // payments grouped by share
  const paidByShare = new Map<string, number>();
  for (const p of payments) {
    paidByShare.set(p.expense_share_id, (paidByShare.get(p.expense_share_id) || 0) + toCents(p.amount));
  }

  const shares: LedgerShare[] = [];
  const ledgerExpenses: LedgerExpense[] = expenses.map((e) => {
    const expenseShares: LedgerShare[] = (e.expense_shares || []).map((s) => {
      const amountCents = toCents(s.share_amount);
      const isPayer = Boolean(e.paid_by) && e.paid_by === s.member_id;
      const owedCents = isPayer ? 0 : amountCents;
      const paidCents = paidByShare.get(s.id) || 0;
      const remainingCents = owedCents - paidCents;
      const share: LedgerShare = {
        id: s.id,
        expenseId: e.id,
        memberId: s.member_id,
        memberName: memberById.get(s.member_id)?.name ?? 'Unknown member',
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
      paidByName: e.paid_by ? memberById.get(e.paid_by)?.name ?? 'Unknown member' : null,
      notes: e.notes || '',
      createdAt: e.created_at,
      shares: expenseShares,
      owedCents,
      paidCents,
      remainingCents: Math.max(owedCents - paidCents, 0),
      status: statusFor(owedCents, paidCents),
    };
  });

  const shareById = new Map(shares.map((s) => [s.id, s]));

  const ledgerPayments: LedgerPayment[] = payments.map((p) => {
    const share = shareById.get(p.expense_share_id);
    return {
      id: p.id,
      memberId: p.member_id,
      memberName: memberById.get(p.member_id)?.name ?? 'Unknown member',
      shareId: p.expense_share_id,
      expenseId: share?.expenseId ?? null,
      expenseDescription: share?.expenseDescription ?? 'Deleted expense',
      expenseDate: share?.expenseDate ?? null,
      amountCents: toCents(p.amount),
      date: p.payment_date,
      notes: p.notes || '',
      createdAt: p.created_at,
    };
  });

  const ledgerMembers: LedgerMember[] = members.map((m) => {
    const own = shares.filter((s) => s.memberId === m.id);
    const ownPayments = ledgerPayments.filter((p) => p.memberId === m.id);
    const assignedCents = sumCents(own.map((s) => s.owedCents));
    const paidCents = sumCents(ownPayments.map((p) => p.amountCents));
    const balanceCents = assignedCents - paidCents;
    let status: SettlementStatus = 'none';
    if (own.length > 0) status = statusFor(assignedCents, paidCents);
    return {
      id: m.id,
      name: m.name,
      contact: m.contact || '',
      notes: m.notes || '',
      createdAt: m.created_at,
      assignedCents,
      paidCents,
      balanceCents,
      expenseCount: own.length,
      paymentCount: ownPayments.length,
      status,
    };
  });

  const totals: LedgerTotals = {
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
