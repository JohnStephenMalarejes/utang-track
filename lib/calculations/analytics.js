import { format, parseISO, startOfWeek, subDays, subMonths, startOfMonth } from "date-fns";
import { sumCents } from "../utils/money.js";

/**
 * "Entries" are the unit that reports aggregate: { date, category, amountCents }.
 * Build them from ledger expenses, optionally scoped to one member's share.
 */
export function expenseEntries(expenses, memberId = "") {
  const entries = [];
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

function groupBy(entries, keyFn, labelFn) {
  const map = new Map();
  for (const e of entries) {
    const key = keyFn(e.date);
    const row = map.get(key) || { key, label: labelFn(key), totalCents: 0, count: 0 };
    row.totalCents += e.amountCents;
    row.count += 1;
    map.set(key, row);
  }
  return [...map.values()].sort((a, b) => (a.key < b.key ? -1 : 1));
}

const dayKey = (d) => d;
const dayLabel = (k) => format(parseISO(k), "MMM d");
const weekKey = (d) => format(startOfWeek(parseISO(d), { weekStartsOn: 1 }), "yyyy-MM-dd");
const weekLabel = (k) => `Week of ${format(parseISO(k), "MMM d")}`;
const monthKey = (d) => d.slice(0, 7);
const monthLabel = (k) => format(parseISO(`${k}-01`), "MMM yyyy");

/** Group entries into daily / weekly / monthly buckets (only buckets that have data). */
export function summarize(entries, granularity) {
  if (granularity === "weekly") return groupBy(entries, weekKey, weekLabel);
  if (granularity === "monthly") return groupBy(entries, monthKey, monthLabel);
  return groupBy(entries, dayKey, (k) => format(parseISO(k), "MMM d, yyyy"));
}

/** The last `days` days including today, zero-filled, for the dashboard. */
export function lastDaysSeries(entries, days = 14, now = new Date()) {
  const totals = new Map();
  for (const e of entries) totals.set(e.date, (totals.get(e.date) || 0) + e.amountCents);
  return Array.from({ length: days }, (_, i) => {
    const d = subDays(now, days - 1 - i);
    const key = format(d, "yyyy-MM-dd");
    return { key, label: format(d, "MMM d"), totalCents: totals.get(key) || 0 };
  });
}

/** The last `months` months including this one, zero-filled, for the dashboard. */
export function lastMonthsSeries(entries, months = 6, now = new Date()) {
  const totals = new Map();
  for (const e of entries) {
    const k = e.date.slice(0, 7);
    totals.set(k, (totals.get(k) || 0) + e.amountCents);
  }
  return Array.from({ length: months }, (_, i) => {
    const d = startOfMonth(subMonths(now, months - 1 - i));
    const key = format(d, "yyyy-MM");
    return { key, label: format(d, "MMM yyyy"), totalCents: totals.get(key) || 0 };
  });
}

export function categoryTotals(entries) {
  const map = new Map();
  for (const e of entries) map.set(e.category, (map.get(e.category) || 0) + e.amountCents);
  return [...map.entries()]
    .map(([category, totalCents]) => ({ category, totalCents }))
    .sort((a, b) => b.totalCents - a.totalCents);
}

export function total(entries) {
  return sumCents(entries.map((e) => e.amountCents));
}
