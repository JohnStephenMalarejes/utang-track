"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, BarChart3, Plus, Receipt, Users, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { Kpi, KpiStrip, Meter } from "@/components/layout/kpi";
import { Avatar } from "@/components/layout/avatar";
import { CategoryChart, SettlementChart, SpendingBarChart } from "./charts";
import { categoryTotals, expenseEntries, lastDaysSeries, lastMonthsSeries } from "@/lib/calculations/analytics";
import { buildLedgerPdf, formatDateLong, formatPHP, todayISO } from "@/lib/utils";

function SectionTitle({ id, title, action }) {
  return (
    <div className="mb-3 flex items-center justify-between">
      <h2 id={id} className="text-[14px] font-semibold tracking-[-0.01em]">
        {title}
      </h2>
      {action}
    </div>
  );
}

/** Ranked list of who still owes money, with how much of their share has come back. */
function Receivables({ members }) {
  const ranked = useMemo(
    () => [...members].filter((m) => m.expenseCount > 0).sort((a, b) => b.balanceCents - a.balanceCents),
    [members]
  );

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b pb-4">
        <div className="space-y-1">
          <CardTitle>Who owes you</CardTitle>
          <CardDescription>Ranked by outstanding balance</CardDescription>
        </div>
        {members.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="-mr-2">
            <Link href="/members">
              All members <ArrowUpRight />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" description="Add the people you share expenses with to start tracking who owes what.">
            <Button asChild size="sm">
              <Link href="/members?new=1">
                <Plus /> Add member
              </Link>
            </Button>
          </EmptyState>
        ) : ranked.length === 0 ? (
          <EmptyState icon={Users} title="Nobody owes anything" description="Balances appear here once members are added to an expense." />
        ) : (
          <ul className="divide-y">
            {ranked.map((m) => {
              const pct = m.assignedCents > 0 ? (m.paidCents / m.assignedCents) * 100 : 100;
              return (
                <li key={m.id}>
                  <Link
                    href={`/members/${m.id}`}
                    className="flex items-center gap-3 px-4 py-3.5 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none sm:px-5 sm:py-3"
                  >
                    <Avatar name={m.name} id={m.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13.5px] font-medium text-slate-900">{m.name}</p>
                        <p className={`tabular shrink-0 text-[13.5px] font-semibold ${m.balanceCents > 0 ? "text-slate-900" : "text-slate-500"}`}>
                          {formatPHP(Math.max(m.balanceCents, 0))}
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <Meter value={pct} tone={pct >= 100 ? "bg-emerald-600" : "bg-teal-600"} className="h-1.5" />
                        <span className="tabular w-24 shrink-0 text-right text-[11.5px] text-slate-500">
                          {formatPHP(m.paidCents)} paid
                        </span>
                      </div>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function RecentActivity({ expenses }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of expenses.slice(0, 8)) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return [...map.entries()];
  }, [expenses]);

  return (
    <Card className="flex flex-col">
      <CardHeader className="flex-row items-start justify-between space-y-0 border-b pb-4">
        <div className="space-y-1">
          <CardTitle>Recent expenses</CardTitle>
          <CardDescription>Latest bills, grouped by day</CardDescription>
        </div>
        {expenses.length > 0 && (
          <Button asChild variant="ghost" size="sm" className="-mr-2">
            <Link href="/expenses">
              View all <ArrowUpRight />
            </Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="flex-1 p-0">
        {groups.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses yet" description="Recorded expenses will show up here, newest first.">
            <Button asChild size="sm">
              <Link href="/expenses?new=1">
                <Plus /> Add expense
              </Link>
            </Button>
          </EmptyState>
        ) : (
          groups.map(([date, items]) => (
            <section key={date} aria-label={formatDateLong(date)}>
              <h3 className="eyebrow border-b bg-slate-50 px-4 py-1.5 sm:px-5">{formatDateLong(date)}</h3>
              <ul className="divide-y">
                {items.map((e) => {
                  const people = [...(e.userShareCents > 0 ? ["You"] : []), ...e.shares.map((s) => s.memberName)];
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-3 px-4 py-3 sm:gap-4 sm:px-5">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium text-slate-900">{e.description}</p>
                        <p className="mt-0.5 truncate text-[12px] text-slate-500">
                          <span className="font-medium text-slate-700">{e.category}</span>
                          <span className="mx-1.5 text-slate-400">·</span>
                          {people.join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden sm:inline-flex">
                          <StatusBadge status={e.status} />
                        </span>
                        <span className="tabular text-right text-[13.5px] font-semibold text-slate-900 sm:w-24">{formatPHP(e.totalCents)}</span>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))
        )}
      </CardContent>
    </Card>
  );
}

const MOBILE_SECTIONS = [
  { id: "balances", label: "Balances", icon: Users },
  { id: "activity", label: "Recent Bills", icon: Receipt },
  { id: "spending", label: "Insights", icon: BarChart3 },
];

export function DashboardView({ ledger }) {
  const { totals, members, expenses } = ledger;
  const [mobileTab, setMobileTab] = useState("balances");

  const entries = useMemo(() => expenseEntries(expenses), [expenses]);
  const daily = useMemo(() => lastDaysSeries(entries, 14), [entries]);
  const monthly = useMemo(() => lastMonthsSeries(entries, 6), [entries]);
  const categories = useMemo(() => categoryTotals(entries), [entries]);

  const owedTotal = totals.settledCents + totals.outstandingCents;
  const collectedPct = owedTotal > 0 ? (totals.settledCents / owedTotal) * 100 : 0;
  const debtors = members.filter((m) => m.balanceCents > 0).length;

  return (
    <>
      {/* ==================== MOBILE APP SCREEN (< lg) ==================== */}
      <div className="space-y-4 lg:hidden">
        {/* Mobile Wallet Summary Card */}
        <div className="overflow-hidden rounded-2xl bg-slate-900 p-4 text-white shadow-card">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">Total Outstanding</p>
              <p className="tabular mt-1 text-[28px] font-bold leading-none tracking-[-0.03em] text-white">
                {formatPHP(totals.outstandingCents)}
              </p>
              <p className="mt-1.5 text-[12px] text-slate-300">
                Owed by {debtors} {debtors === 1 ? "member" : "members"} · {totals.unsettledCount} open {totals.unsettledCount === 1 ? "bill" : "bills"}
              </p>
            </div>
            {(expenses.length > 0 || members.length > 0) && (
              <div className="[&_button]:border-slate-700 [&_button]:bg-slate-800 [&_button]:text-slate-100 [&_button:hover]:bg-slate-700">
                <PdfExportButton
                  label="PDF"
                  filename={`utang-tracker-summary-${todayISO()}.pdf`}
                  shareTitle="Utang Tracker Summary"
                  getPdfBytes={() =>
                    buildLedgerPdf({
                      members,
                      expenses,
                      payments: ledger.payments,
                    })
                  }
                />
              </div>
            )}
          </div>

          {/* Collection progress bar */}
          <div className="mt-4">
            <div className="mb-1.5 flex items-center justify-between text-[11.5px]">
              <span className="text-slate-300">Collection progress</span>
              <span className="tabular font-semibold text-emerald-400">{Math.round(collectedPct)}% collected</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div className="h-full rounded-full bg-emerald-400 transition-all duration-500" style={{ width: `${Math.max(0, Math.min(100, collectedPct))}%` }} />
            </div>
          </div>

          {/* Mini stats strip */}
          <div className="mt-4 grid grid-cols-2 gap-2.5 border-t border-slate-800 pt-3.5">
            <div className="rounded-xl bg-slate-800/70 px-3 py-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">Collected</p>
              <p className="tabular mt-0.5 text-[15px] font-semibold text-emerald-400">{formatPHP(totals.settledCents)}</p>
            </div>
            <div className="rounded-xl bg-slate-800/70 px-3 py-2.5">
              <p className="text-[10.5px] font-medium uppercase tracking-wider text-slate-400">Total Spent</p>
              <p className="tabular mt-0.5 text-[15px] font-semibold text-white">{formatPHP(totals.expensesCents)}</p>
            </div>
          </div>

          {/* Quick mobile actions */}
          <div className="mt-3.5 grid grid-cols-2 gap-2">
            <Button asChild size="sm" variant="accent" className="w-full rounded-xl font-semibold">
              <Link href="/expenses?new=1">
                <Plus className="h-4 w-4" /> Add expense
              </Link>
            </Button>
            <Button asChild size="sm" variant="outline" className="w-full rounded-xl border-slate-700 bg-slate-800 text-white hover:bg-slate-700 hover:text-white">
              <Link href="/payments">
                <Wallet className="h-4 w-4" /> Payments
              </Link>
            </Button>
          </div>
        </div>

        {/* Mobile Segmented Screen Switcher */}
        <div className="grid grid-cols-3 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Overview sections">
          {MOBILE_SECTIONS.map(({ id, label, icon: Icon }) => {
            const active = mobileTab === id;
            return (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setMobileTab(id)}
                className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
                  active ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            );
          })}
        </div>

        {/* Active Mobile Sub-screen */}
        {mobileTab === "balances" && <Receivables members={members} />}
        {mobileTab === "activity" && <RecentActivity expenses={expenses} />}
        {mobileTab === "spending" && (
          <div className="space-y-4">
            <SpendingBarChart title="Daily" description="Last 14 days" data={daily} emptyText="No expenses in the last 14 days" />
            <SpendingBarChart title="Monthly" description="Last 6 months" data={monthly} emptyText="No expenses in the last 6 months" tickInterval={0} />
            <CategoryChart title="By category" description="Share of total spending" data={categories} />
            <SettlementChart title="Collection" description="Received vs still owed" settledCents={totals.settledCents} outstandingCents={totals.outstandingCents} />
          </div>
        )}
      </div>

      {/* ==================== DESKTOP VIEW (lg+) ==================== */}
      <div className="hidden lg:block">
        <PageHeader eyebrow="Overview" title="Where everyone stands" description="Outstanding balances, recent bills and spending trends.">
          {(expenses.length > 0 || members.length > 0) && (
            <PdfExportButton
              filename={`utang-tracker-summary-${todayISO()}.pdf`}
              shareTitle="Utang Tracker Summary"
              getPdfBytes={() =>
                buildLedgerPdf({
                  members,
                  expenses,
                  payments: ledger.payments,
                })
              }
            />
          )}
        </PageHeader>

        <KpiStrip>
          <Kpi label="Outstanding" tone="bg-destructive" value={formatPHP(totals.outstandingCents)} hint={`Owed by ${debtors} ${debtors === 1 ? "member" : "members"}`} />
          <Kpi label="Collected" tone="bg-success" value={formatPHP(totals.settledCents)} hint={`${totals.paymentCount} ${totals.paymentCount === 1 ? "payment" : "payments"} received`}>
            <div className="mt-1 flex items-center gap-2">
              <Meter value={collectedPct} tone="bg-success" className="h-1" />
              <span className="tabular text-[11px] text-muted-foreground">{Math.round(collectedPct)}%</span>
            </div>
          </Kpi>
          <Kpi label="Total spent" value={formatPHP(totals.expensesCents)} hint={`Across ${totals.expenseCount} ${totals.expenseCount === 1 ? "bill" : "bills"}`} />
          <Kpi label="Open bills" tone="bg-warning" value={String(totals.unsettledCount)} hint={`of ${totals.expenseCount} not fully settled`} />
        </KpiStrip>

        <div className="mt-6 grid gap-6 lg:grid-cols-5">
          <div className="lg:col-span-2">
            <Receivables members={members} />
          </div>
          <div className="lg:col-span-3">
            <RecentActivity expenses={expenses} />
          </div>
        </div>

        <section className="mt-8" aria-labelledby="analytics">
          <SectionTitle id="analytics" title="Spending" />
          <div className="grid gap-6 lg:grid-cols-2">
            <SpendingBarChart title="Daily" description="Last 14 days" data={daily} emptyText="No expenses in the last 14 days" />
            <SpendingBarChart title="Monthly" description="Last 6 months" data={monthly} emptyText="No expenses in the last 6 months" tickInterval={0} />
            <CategoryChart title="By category" description="Share of total spending" data={categories} />
            <SettlementChart title="Collection" description="Received vs still owed" settledCents={totals.settledCents} outstandingCents={totals.outstandingCents} />
          </div>
        </section>
      </div>
    </>
  );
}
