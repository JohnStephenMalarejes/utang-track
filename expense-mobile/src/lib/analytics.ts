import { format, parseISO, startOfMonth, startOfWeek, subDays, subMonths } from 'date-fns';
import { LedgerExpense } from './ledger';
import { sumCents } from './money';

export interface ExpenseEntry {
  date: string;
  category: string;
  amountCents: number;
  expenseId: string;
}

export interface PeriodSummary {
  key: string;
  label: string;
  totalCents: number;
  count: number;
}

export interface CategoryTotal {
  category: string;
  totalCents: number;
}

/**
 * "Entries" are the unit that reports aggregate: { date, category, amountCents }.
 * Build them from ledger expenses, optionally scoped to one member's share.
 */
export function expenseEntries(expenses: LedgerExpense[], memberId = ''): ExpenseEntry[] {
  const entries: ExpenseEntry[] = [];
  for (const e of expenses) {
    if (memberId) {
      const share = e.shares.find((s) => s.memberId === memberId);
      if (!share) continue;
      entries.push({ date: e.date, category: e.category, amountCents: share.amountCents, expenseId: e.id });
    } else {
      entries.push({ date: e.date, category: e.category, amountCents: e.totalCents, expenseId: e.id });
    }
  }
  return entries;
}

function groupBy(entries: ExpenseEntry[], keyFn: (d: string) => string, labelFn: (k: string) => string): PeriodSummary[] {
  const map = new Map<string, PeriodSummary>();
  for (const e of entries) {
    const key = keyFn(e.date);
    const row = map.get(key) || { key, label: labelFn(key), totalCents: 0, count: 0 };
    row.totalCents += e.amountCents;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

const dayKey = (d: string) => d;
const weekKey = (d: string) => format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), 'yyyy-MM-dd');
const weekLabel = (k: string) => `Week of ${format(parseISO(k), 'MMM d')}`;
const monthKey = (d: string) => d.slice(0, 7);
const monthLabel = (k: string) => format(parseISO(`${k}-01`), 'MMM yyyy');

/** Group entries into daily / weekly / monthly buckets (only buckets that have data). */
export function summarize(entries: ExpenseEntry[], granularity: 'daily' | 'weekly' | 'monthly'): PeriodSummary[] {
  if (granularity === 'weekly') return groupBy(entries, weekKey, weekLabel);
  if (granularity === 'monthly') return groupBy(entries, monthKey, monthLabel);
  return groupBy(entries, dayKey, (k) => format(parseISO(k), 'MMM d, yyyy'));
}

/** The last `days` days including today, zero-filled, for the dashboard. */
export function lastDaysSeries(
  entries: ExpenseEntry[],
  days = 14,
  now = new Date()
): { key: string; label: string; totalCents: number; count: number }[] {
  const totals = new Map<string, number>();
  const counts = new Map<string, number>();
  for (const e of entries) {
    totals.set(e.date, (totals.get(e.date) || 0) + e.amountCents);
    counts.set(e.date, (counts.get(e.date) || 0) + 1);
  }
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(now, days - 1 - i);
    const key = format(d, 'yyyy-MM-dd');
    return {
      key,
      label: format(d, 'MMM d'),
      totalCents: totals.get(key) || 0,
      count: counts.get(key) || 0,
    };
  });
}

/** The last `months` months including this one, zero-filled, for the dashboard. */
export function lastMonthsSeries(entries: ExpenseEntry[], months = 6, now = new Date()): { key: string; label: string; totalCents: number }[] {
  const totals = new Map<string, number>();
  for (const e of entries) {
    const k = e.date.slice(0, 7);
    totals.set(k, (totals.get(k) || 0) + e.amountCents);
  }
  return Array.from({ length: months }, (_, i) => {
    const d = startOfMonth(subMonths(now, months - 1 - i));
    const key = format(d, 'yyyy-MM');
    return { key, label: format(d, 'MMM yyyy'), totalCents: totals.get(key) || 0 };
  });
}

export function categoryTotals(entries: ExpenseEntry[]): CategoryTotal[] {
  const map = new Map<string, number>();
  for (const e of entries) map.set(e.category, (map.get(e.category) || 0) + e.amountCents);
  return [...map.entries()]
    .map(([category, totalCents]) => ({ category, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export function total(entries: ExpenseEntry[]): number {
  return sumCents(entries.map((e) => e.amountCents));
}
