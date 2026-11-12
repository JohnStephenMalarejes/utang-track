"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, ChevronRight, HandCoins, Plus, Receipt, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { Kpi, KpiStrip, Meter } from "@/components/layout/kpi";
import { Avatar } from "@/components/layout/avatar";
import {
  Amount,
  BigMoney,
  CategoryGlyph,
  ListGroup,
  ListRow,
  MiniMeter,
  MobileEmpty,
  SectionLabel,
  SplitBar,
  StatusText,
  shortDate,
} from "@/components/layout/mobile";
import { ExpenseDetailDialog } from "@/components/expenses/expense-detail-dialog";
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

function MobileOverview({ ledger, daily, collectedPct, debtors }) {
  const { totals, members, expenses } = ledger;
  const [viewing, setViewing] = useState(null);

  const ranked = useMemo(
    () => [...members].filter((m) => m.expenseCount > 0).sort((a, b) => b.balanceCents - a.balanceCents),
    [members]
  );
  const recent = useMemo(() => expenses.slice(0, 6), [expenses]);
  const fourteenDayTotal = useMemo(() => daily.reduce((s, d) => s + d.totalCents, 0), [daily]);
  const maxDay = useMemo(() => Math.max(...daily.map((d) => d.totalCents), 1), [daily]);

  return (
    <div className="space-y-7">
      {/* Editorial balance header — sits directly on the canvas */}
      <section aria-label="Balance summary">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">To collect</p>
            <BigMoney cents={totals.outstandingCents} size="text-[42px]" className="mt-1.5" />
          </div>
          {(expenses.length > 0 || members.length > 0) && (
            <PdfExportButton
              compact
              label="Export summary"
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
        </div>

        <p className="mt-2 text-[13.5px] text-slate-600">
          {totals.outstandingCents > 0
            ? `From ${debtors} ${debtors === 1 ? "person" : "people"} across ${totals.unsettledCount} open ${totals.unsettledCount === 1 ? "bill" : "bills"}`
            : expenses.length > 0
            ? "Everyone is settled up"
            : "Add an expense to start splitting bills"}
        </p>

        {/* Two-tone collection bar + ledger readout */}
        <div className="mt-4 rounded-2xl bg-white p-4 shadow-hairline">
          <SplitBar value={collectedPct} />
          <div className="mt-3 flex items-center justify-between text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
              <span className="text-slate-500">Collected</span>
              <span className="tabular font-semibold text-ink">{formatPHP(totals.settledCents)}</span>
              <span className="tabular text-slate-400">({Math.round(collectedPct)}%)</span>
            </div>
            <div className="text-right">
              <span className="text-slate-500">Spent </span>
              <span className="tabular font-semibold text-ink">{formatPHP(totals.expensesCents)}</span>
            </div>
          </div>
        </div>

        {/* Primary actions */}
        <div className="mt-3 grid grid-cols-2 gap-2.5">
          <Link
            href="/expenses?new=1"
            className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[14px] font-semibold text-white"
          >
            <Plus className="h-4 w-4 text-mint" strokeWidth={2.4} />
            New expense
          </Link>
          <Link
            href="/payments?new=1"
            className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[14px] font-semibold text-ink shadow-hairline"
          >
            <HandCoins className="h-4 w-4 text-ink-muted" strokeWidth={1.9} />
            Record payment
          </Link>
        </div>
      </section>

      {/* Who owes you */}
      <section aria-label="People">
        <SectionLabel
          action={
            members.length > 0 && (
              <Link href="/members" className="text-[12.5px] font-medium text-ink-soft">
                All ({members.length}) →
              </Link>
            )
          }
        >
          Who owes you
        </SectionLabel>
        <ListGroup>
          {members.length === 0 ? (
            <MobileEmpty icon={Users} title="No people yet" description="Add the friends or housemates you split bills with.">
              <Button asChild size="sm">
                <Link href="/members?new=1">
                  <Plus /> Add member
                </Link>
              </Button>
            </MobileEmpty>
          ) : ranked.length === 0 ? (
            <MobileEmpty icon={Users} title="Nobody owes anything" description="Balances show up once someone is included in a bill." />
          ) : (
            ranked.map((m) => {
              const pct = m.assignedCents > 0 ? (m.paidCents / m.assignedCents) * 100 : 100;
              return (
                <ListRow
                  key={m.id}
                  as={Link}
                  href={`/members/${m.id}`}
                  className="tap"
                  leading={<Avatar name={m.name} id={m.id} />}
                  title={m.name}
                  subtitle={`${formatPHP(m.paidCents)} of ${formatPHP(m.assignedCents)} paid`}
                  trailing={
                    <div className="flex items-center gap-2">
                      <Amount
                        value={formatPHP(Math.max(m.balanceCents, 0))}
                        caption={m.balanceCents > 0 ? "owes" : "settled"}
                        tone={m.balanceCents > 0 ? "text-ink" : "text-slate-400"}
                      />
                      <ChevronRight className="h-4 w-4 text-slate-300" aria-hidden="true" />
                    </div>
                  }
                >
                  <MiniMeter value={pct} className="mt-2" />
                </ListRow>
              );
            })
          )}
        </ListGroup>
      </section>

      {/* Latest bills */}
      <section aria-label="Latest bills">
        <SectionLabel
          action={
            expenses.length > 0 && (
              <Link href="/expenses" className="text-[12.5px] font-medium text-ink-soft">
                See all ({expenses.length}) →
              </Link>
            )
          }
        >
          Latest bills
        </SectionLabel>
        <ListGroup>
          {recent.length === 0 ? (
            <MobileEmpty icon={Receipt} title="No expenses yet" description="Bills you log will appear here, newest first.">
              <Button asChild size="sm">
                <Link href="/expenses?new=1">
                  <Plus /> Add expense
                </Link>
              </Button>
            </MobileEmpty>
          ) : (
            recent.map((e) => {
              const count = (e.userShareCents > 0 ? 1 : 0) + e.shares.length;
              return (
                <ListRow
                  key={e.id}
                  as="button"
                  type="button"
                  onClick={() => setViewing(e)}
                  className="tap"
                  leading={<CategoryGlyph category={e.category} />}
                  title={e.description}
                  subtitle={`${shortDate(e.date)} · ${e.category} · ${count} ${count === 1 ? "person" : "people"}`}
                  trailing={
                    <div className="shrink-0 text-right">
                      <div className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(e.totalCents)}</div>
                      <StatusText status={e.status} className="mt-0.5 justify-end" />
                    </div>
                  }
                />
              );
            })
          )}
        </ListGroup>
      </section>

      {/* Compact 14-day spending pulse */}
      {expenses.length > 0 && (
        <section aria-label="14-day spending">
          <SectionLabel
            action={
              <Link href="/reports" className="text-[12.5px] font-medium text-ink-soft">
                Reports →
              </Link>
            }
          >
            Last 14 days
          </SectionLabel>
          <Link href="/reports" className="tap block rounded-2xl bg-white p-4 shadow-hairline">
            <div className="flex items-baseline justify-between">
              <span className="text-[12.5px] text-slate-500">14-day spend</span>
              <span className="tabular text-[16px] font-semibold text-ink">{formatPHP(fourteenDayTotal)}</span>
            </div>
            <div className="mt-3 flex h-14 items-end gap-1.5" aria-hidden="true">
              {daily.map((d) => {
                const h = d.totalCents > 0 ? Math.max(14, Math.round((d.totalCents / maxDay) * 100)) : 6;
                return (
                  <div key={d.key ?? d.label} className="flex h-full flex-1 items-end">
                    <span
                      className={`w-full rounded-sm ${d.totalCents > 0 ? "bg-ink" : "bg-slate-100"}`}
                      style={{ height: `${h}%` }}
                    />
                  </div>
                );
              })}
            </div>
            <div className="mt-1.5 flex justify-between font-mono text-[10px] text-slate-400">
              <span>{daily[0]?.label}</span>
              <span>Today</span>
            </div>
          </Link>
        </section>
      )}

      <ExpenseDetailDialog expense={viewing} onOpenChange={(o) => !o && setViewing(null)} />
    </div>
  );
}

export function DashboardView({ ledger }) {
  const { totals, members, expenses } = ledger;

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
      <div className="lg:hidden">
        <MobileOverview ledger={ledger} daily={daily} collectedPct={collectedPct} debtors={debtors} />
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
