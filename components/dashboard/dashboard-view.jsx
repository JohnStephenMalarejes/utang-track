"use client";

import { useMemo } from "react";
import Link from "next/link";
import { CheckCircle2, Clock, HandCoins, Plus, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { CategoryChart, SettlementChart, SpendingBarChart } from "./charts";
import { categoryTotals, expenseEntries, lastDaysSeries, lastMonthsSeries } from "@/lib/calculations/analytics";
import { buildLedgerPdf, formatDateLong, formatPHP, todayISO } from "@/lib/utils";

function SummaryCard({ label, value, icon: Icon, hint }) {
  return (
    <Card>
      <CardContent className="flex items-start justify-between gap-3 p-5">
        <div className="min-w-0">
          <p className="text-[13px] text-muted-foreground">{label}</p>
          <p className="mt-2 truncate text-2xl font-semibold tracking-tight tabular">{value}</p>
          {hint && <p className="mt-1 text-xs text-muted-foreground">{hint}</p>}
        </div>
        <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-muted text-secondary">
          <Icon className="h-4 w-4" />
        </span>
      </CardContent>
    </Card>
  );
}

function MemberCard({ member }) {
  return (
    <Link
      href={`/members/${member.id}`}
      className="block rounded-xl border bg-card p-4 shadow-card transition-colors hover:border-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="truncate font-medium">{member.name}</p>
        <StatusBadge status={member.status} />
      </div>
      <dl className="mt-3 grid grid-cols-3 gap-2 text-xs">
        <div>
          <dt className="text-muted-foreground">Assigned</dt>
          <dd className="mt-0.5 font-medium tabular">{formatPHP(member.assignedCents)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Paid</dt>
          <dd className="mt-0.5 font-medium tabular">{formatPHP(member.paidCents)}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Outstanding</dt>
          <dd className="mt-0.5 font-semibold tabular">{formatPHP(member.balanceCents)}</dd>
        </div>
      </dl>
    </Link>
  );
}

function RecentTransactions({ expenses }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const e of expenses.slice(0, 10)) {
      if (!map.has(e.date)) map.set(e.date, []);
      map.get(e.date).push(e);
    }
    return [...map.entries()];
  }, [expenses]);

  return (
    <Card>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <div className="space-y-1">
          <CardTitle>Recent transactions</CardTitle>
          <CardDescription>Your latest expenses, grouped by date</CardDescription>
        </div>
        {expenses.length > 0 && (
          <Button asChild variant="ghost" size="sm">
            <Link href="/expenses">View all</Link>
          </Button>
        )}
      </CardHeader>
      <CardContent className="p-0">
        {groups.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses yet" description="Recorded expenses will show up here, newest first.">
            <Button asChild>
              <Link href="/expenses?new=1">
                <Plus /> Add First Expense
              </Link>
            </Button>
          </EmptyState>
        ) : (
          groups.map(([date, items]) => (
            <section key={date} aria-label={formatDateLong(date)}>
              <h3 className="border-y bg-muted/60 px-5 py-1.5 text-xs font-medium text-muted-foreground first:border-t-0">{formatDateLong(date)}</h3>
              <ul className="divide-y">
                {items.map((e) => (
                  <li key={e.id} className="flex flex-col gap-2 px-5 py-3 sm:flex-row sm:items-center sm:justify-between">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{e.description}</p>
                      <p className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground">
                        <Badge variant="outline">{e.category}</Badge>
                        <span className="truncate">
                          {[...(e.userShareCents > 0 ? ["You"] : []), ...e.shares.map((s) => s.memberName)].join(", ")}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center justify-between gap-3 sm:justify-end">
                      <StatusBadge status={e.status} />
                      <span className="w-28 text-right text-sm font-semibold tabular">{formatPHP(e.totalCents)}</span>
                    </div>
                  </li>
                ))}
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

  return (
    <>
      <PageHeader title="Dashboard" description="Where everyone stands right now.">
        {(expenses.length > 0 || members.length > 0) && (
          <PdfExportButton
            filename={`utang-tracker-summary-${todayISO()}.pdf`}
            shareTitle="Utang Tracker Summary"
            getPdfBytes={() =>
              buildLedgerPdf({
                title: "Ledger Summary",
                members,
                expenses,
                payments: ledger.payments,
              })
            }
          />
        )}
        <Button asChild>
          <Link href="/expenses?new=1">
            <Plus /> Add expense
          </Link>
        </Button>
      </PageHeader>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard label="Total Outstanding Debt" value={formatPHP(totals.outstandingCents)} icon={HandCoins} hint="Still owed to you" />
        <SummaryCard label="Total Settled" value={formatPHP(totals.settledCents)} icon={CheckCircle2} hint="Payments received" />
        <SummaryCard label="Total Expenses" value={formatPHP(totals.expensesCents)} icon={Receipt} hint="Across all bills" />
        <SummaryCard
          label="Unsettled Transactions"
          value={String(totals.unsettledCount)}
          icon={Clock}
          hint={`${totals.expenseCount} ${totals.expenseCount === 1 ? "transaction" : "transactions"} in total`}
        />
      </div>

      <section className="mt-8" aria-labelledby="members-overview">
        <div className="mb-3 flex items-center justify-between">
          <h2 id="members-overview" className="text-base font-semibold">
            Members overview
          </h2>
          {members.length > 0 && (
            <Button asChild variant="ghost" size="sm">
              <Link href="/members">Manage members</Link>
            </Button>
          )}
        </div>
        {members.length === 0 ? (
          <Card>
            <EmptyState icon={Users} title="No members yet" description="Add the people you share expenses with to start tracking who owes what.">
              <Button asChild>
                <Link href="/members?new=1">
                  <Plus /> Add First Member
                </Link>
              </Button>
            </EmptyState>
          </Card>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {members.map((m) => (
              <MemberCard key={m.id} member={m} />
            ))}
          </div>
        )}
      </section>

      <section className="mt-8">
        <RecentTransactions expenses={expenses} />
      </section>

      <section className="mt-8" aria-labelledby="analytics">
        <h2 id="analytics" className="mb-3 text-base font-semibold">
          Analytics
        </h2>
        <div className="grid gap-4 lg:grid-cols-2">
          <SpendingBarChart title="Daily expenses" description="Last 14 days" data={daily} emptyText="No expenses in the last 14 days" />
          <SpendingBarChart title="Monthly expenses" description="Last 6 months" data={monthly} emptyText="No expenses in the last 6 months" tickInterval={0} />
          <CategoryChart description="Share of total spending" data={categories} />
          <SettlementChart description="Payments received vs still owed" settledCents={totals.settledCents} outstandingCents={totals.outstandingCents} />
        </div>
      </section>
    </>
  );
}
