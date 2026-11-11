"use client";

import { useMemo } from "react";
import Link from "next/link";
import { ArrowUpRight, Plus, Receipt, Users } from "lucide-react";
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
                    className="flex items-center gap-3 px-5 py-3 transition-colors hover:bg-muted/40 focus-visible:bg-muted/40 focus-visible:outline-none"
                  >
                    <Avatar name={m.name} id={m.id} />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-baseline justify-between gap-3">
                        <p className="truncate text-[13.5px] font-medium">{m.name}</p>
                        <p className={`tabular shrink-0 text-[13.5px] font-medium ${m.balanceCents > 0 ? "" : "text-muted-foreground"}`}>
                          {formatPHP(Math.max(m.balanceCents, 0))}
                        </p>
                      </div>
                      <div className="mt-1.5 flex items-center gap-3">
                        <Meter value={pct} tone={pct >= 100 ? "bg-success" : "bg-accent"} className="h-1" />
                        <span className="tabular w-24 shrink-0 text-right text-[11.5px] text-muted-foreground">
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
              <h3 className="eyebrow border-b bg-muted/40 px-5 py-1.5">{formatDateLong(date)}</h3>
              <ul className="divide-y">
                {items.map((e) => {
                  const people = [...(e.userShareCents > 0 ? ["You"] : []), ...e.shares.map((s) => s.memberName)];
                  return (
                    <li key={e.id} className="flex items-center justify-between gap-4 px-5 py-3">
                      <div className="min-w-0">
                        <p className="truncate text-[13.5px] font-medium">{e.description}</p>
                        <p className="mt-0.5 truncate text-[12px] text-muted-foreground">
                          <span className="text-foreground/70">{e.category}</span>
                          <span className="mx-1.5 text-subtle">·</span>
                          {people.join(", ")}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-3">
                        <span className="hidden sm:inline-flex">
                          <StatusBadge status={e.status} />
                        </span>
                        <span className="tabular w-24 text-right text-[13.5px] font-medium">{formatPHP(e.totalCents)}</span>
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

export function DashboardView({ ledger }) {
  const { totals, members, expenses } = ledger;
  const entries = useMemo(() => expenseEntries(expenses), [expenses]);
  // Computed on the client so "today" is the viewer's today, not the server's.
  const daily = useMemo(() => lastDaysSeries(entries, 14), [entries]);
  const monthly = useMemo(() => lastMonthsSeries(entries, 6), [entries]);
  const categories = useMemo(() => categoryTotals(entries), [entries]);

  const owedTotal = totals.settledCents + totals.outstandingCents;
  const collectedPct = owedTotal > 0 ? (totals.settledCents / owedTotal) * 100 : 0;
  const debtors = members.filter((m) => m.balanceCents > 0).length;

  return (
    <>
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
    </>
  );
}
