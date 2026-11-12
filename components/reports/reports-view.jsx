"use client";

import { useEffect, useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import Link from "next/link";
import { BarChart3, PieChart, Plus, Users, Wallet, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Table, TableBody, TableCell, TableFooter, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { Kpi, KpiStrip } from "@/components/layout/kpi";
import { Avatar } from "@/components/layout/avatar";
import {
  Amount,
  CategoryGlyph,
  ListGroup,
  ListRow,
  MobileEmpty,
  SectionLabel,
  StatusText,
  UnderlineTabs,
  shortDate,
} from "@/components/layout/mobile";
import { CategoryChart, SettlementChart } from "@/components/dashboard/charts";
import { categoryTotals, expenseEntries, summarize, total } from "@/lib/calculations/analytics";
import { statusFor } from "@/lib/calculations/ledger";
import { buildLedgerPdf, formatDate, formatPHP, sumCents, todayISO } from "@/lib/utils";

const GRANULARITY = [
  ["daily", "Daily"],
  ["weekly", "Weekly"],
  ["monthly", "Monthly"],
];

const MOBILE_REPORT_TABS = [
  { id: "trends", label: "Trends", icon: BarChart3 },
  { id: "balances", label: "Balances", icon: Users },
  { id: "categories", label: "Categories", icon: PieChart },
  { id: "payments", label: "Payments", icon: Wallet },
];

function Stat({ label, value, hint }) {
  return <Kpi label={label} value={value} hint={hint} />;
}

export function ReportsView({ ledger }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [memberId, setMemberId] = useState("");
  const [granularity, setGranularity] = useState("daily");
  const [mobileTab, setMobileTab] = useState("trends");
  const filtersActive = Boolean(from || to || memberId);

  // Expenses inside the date range (and, if a member is chosen, only those they shared)
  const scoped = useMemo(
    () =>
      ledger.expenses.filter(
        (e) => (!from || e.date >= from) && (!to || e.date <= to) && (!memberId || e.shares.some((s) => s.memberId === memberId))
      ),
    [ledger.expenses, from, to, memberId]
  );

  const entries = useMemo(() => expenseEntries(scoped, memberId), [scoped, memberId]);
  const periods = useMemo(() => summarize(entries, granularity), [entries, granularity]);
  const categories = useMemo(() => categoryTotals(entries), [entries]);

  // Member balances for the shares inside the scope
  const balances = useMemo(() => {
    const shares = scoped.flatMap((e) => e.shares).filter((s) => !memberId || s.memberId === memberId);
    return ledger.members
      .filter((m) => !memberId || m.id === memberId)
      .map((m) => {
        const own = shares.filter((s) => s.memberId === m.id);
        const assigned = sumCents(own.map((s) => s.owedCents));
        const paid = sumCents(own.map((s) => s.paidCents));
        return { id: m.id, name: m.name, count: own.length, assigned, paid, balance: assigned - paid, status: own.length ? statusFor(assigned, paid) : "none" };
      })
      .filter((r) => r.count > 0);
  }, [scoped, ledger.members, memberId]);

  const outstandingCents = sumCents(balances.map((b) => Math.max(b.balance, 0)));
  const settledCents = sumCents(balances.map((b) => b.paid));

  const payments = useMemo(
    () => ledger.payments.filter((p) => (!from || p.date >= from) && (!to || p.date <= to) && (!memberId || p.memberId === memberId)),
    [ledger.payments, from, to, memberId]
  );

  const clear = () => {
    setFrom("");
    setTo("");
    setMemberId("");
  };

  if (ledger.expenses.length === 0 && ledger.payments.length === 0) {
    return (
      <>
        <PageHeader title="Reports" description="Summaries, balances and trends." />
        <Card>
          <EmptyState icon={BarChart3} title="Nothing to report yet" description="Reports are built from your expenses and payments. Add an expense and this page will fill in.">
            <Button asChild>
              <Link href="/expenses?new=1">
                <Plus /> Add First Expense
              </Link>
            </Button>
          </EmptyState>
        </Card>
      </>
    );
  }

  return (
    <>
      <PageHeader
        eyebrow="Insights"
        title="Reports"
        description="Summaries, balances and trends for any date range."
        mobileSubtitle={`${scoped.length} ${scoped.length === 1 ? "bill" : "bills"} · ${formatPHP(total(entries))} spent`}
        mobileActions={
          <PdfExportButton
            compact
            label="Export report"
            filename={`utang-tracker-report-${todayISO()}.pdf`}
            shareTitle="Utang Tracker Report"
            getPdfBytes={() =>
              buildLedgerPdf({
                members: ledger.members.filter((m) => !memberId || m.id === memberId),
                expenses: scoped,
                allExpenses: ledger.expenses,
              })
            }
          />
        }
      >
        <PdfExportButton
          filename={`utang-tracker-report-${todayISO()}.pdf`}
          shareTitle="Utang Tracker Report"
          getPdfBytes={() =>
            buildLedgerPdf({
              members: ledger.members.filter((m) => !memberId || m.id === memberId),
              expenses: scoped,
              allExpenses: ledger.expenses,
            })
          }
        />
      </PageHeader>

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-hairline sm:mb-6 md:rounded-lg md:border md:border-slate-200 md:shadow-card">
        <div className="grid grid-cols-2 gap-3 sm:flex sm:flex-wrap sm:items-end">
          <label className="space-y-1">
            <span className="eyebrow block">From</span>
            <Input type="date" value={from} onChange={(e) => setFrom(e.target.value)} className="w-full sm:w-40" />
          </label>
          <label className="space-y-1">
            <span className="eyebrow block">To</span>
            <Input type="date" value={to} onChange={(e) => setTo(e.target.value)} className="w-full sm:w-40" />
          </label>
          <label className="col-span-2 space-y-1 sm:col-span-1">
            <span className="eyebrow block">Member</span>
            <Select value={memberId} onChange={(e) => setMemberId(e.target.value)} className="w-full sm:w-48">
              <option value="">All members</option>
              {ledger.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </Select>
          </label>
          {filtersActive && (
            <Button variant="ghost" size="sm" onClick={clear} className="col-span-2 sm:col-span-1">
              <X /> Clear
            </Button>
          )}
          <p className="col-span-2 hidden w-full text-xs text-muted-foreground sm:block">
            Dates filter expenses by expense date and payments by payment date. With a member selected, amounts are that member's shares.
          </p>
        </div>
      </div>

      {scoped.length === 0 && payments.length === 0 ? (
        <Card>
          <EmptyState icon={BarChart3} title="No records in this range" description="Widen the date range or choose a different member.">
            <Button variant="outline" onClick={clear}>
              Clear filters
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          <KpiStrip className="grid-cols-2 rounded-2xl border-0 shadow-hairline md:rounded-xl md:border md:border-slate-200 md:shadow-card">
            <Stat label="Total expenses" value={formatPHP(total(entries))} hint={`${scoped.length} ${scoped.length === 1 ? "transaction" : "transactions"}`} />
            <Stat label="Outstanding" value={formatPHP(outstandingCents)} hint="Still owed in range" />
            <Stat label="Settled" value={formatPHP(settledCents)} hint="Paid back in range" />
            <Stat label="Payments" value={formatPHP(sumCents(payments.map((p) => p.amountCents)))} hint={`${payments.length} ${payments.length === 1 ? "payment" : "payments"}`} />
          </KpiStrip>

          {/* ==================== MOBILE SCREEN (< md) ==================== */}
          <div className="mt-5 space-y-4 md:hidden">
            <UnderlineTabs label="Report sections" tabs={MOBILE_REPORT_TABS} value={mobileTab} onChange={setMobileTab} />

            {mobileTab === "trends" && (
              <div className="space-y-4">
                <div className="rounded-2xl bg-white p-4 shadow-hairline">
                  <div className="mb-3 flex items-center justify-between">
                    <div>
                      <p className="text-[14px] font-semibold text-ink">Spending</p>
                      <p className="text-[12px] text-slate-500">Grouped by period</p>
                    </div>
                    <div className="inline-flex rounded-full bg-slate-100 p-0.5" role="group" aria-label="Group by">
                      {GRANULARITY.map(([value, label]) => (
                        <button
                          key={value}
                          type="button"
                          aria-pressed={granularity === value}
                          onClick={() => setGranularity(value)}
                          className={`rounded-full px-2.5 py-1 text-[11.5px] font-medium transition-colors ${
                            granularity === value ? "bg-white text-ink shadow-xs" : "text-slate-500"
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="h-52">
                    <SpendingBarChartInline data={periods} />
                  </div>
                </div>

                {periods.length > 0 && (
                  <section aria-label="Period totals">
                    <SectionLabel>By period</SectionLabel>
                    <ListGroup>
                      {[...periods].reverse().map((r) => (
                        <ListRow
                          key={r.key}
                          title={r.label}
                          subtitle={`${r.count} ${r.count === 1 ? "bill" : "bills"}`}
                          trailing={<span className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(r.totalCents)}</span>}
                        />
                      ))}
                    </ListGroup>
                  </section>
                )}
              </div>
            )}

            {mobileTab === "balances" && (
              <div className="space-y-4">
                <SettlementChart settledCents={settledCents} outstandingCents={outstandingCents} description="For records in this report" />
                <section aria-label="Member balances">
                  <SectionLabel>People</SectionLabel>
                  <ListGroup>
                    {balances.length === 0 ? (
                      <MobileEmpty title="No balances in this range" />
                    ) : (
                      balances.map((b) => (
                        <ListRow
                          key={b.id}
                          as={Link}
                          href={`/members/${b.id}`}
                          className="tap"
                          leading={<Avatar name={b.name} id={b.id} />}
                          title={b.name}
                          subtitle={`Paid ${formatPHP(b.paid)} of ${formatPHP(b.assigned)}`}
                          trailing={
                            <div className="text-right">
                              <div className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(b.balance)}</div>
                              <StatusText status={b.status} className="mt-0.5 justify-end" />
                            </div>
                          }
                        />
                      ))
                    )}
                  </ListGroup>
                </section>
              </div>
            )}

            {mobileTab === "categories" && (
              <div className="space-y-4">
                <CategoryChart title="Category breakdown" description="Where the money went" data={categories} />
                <section aria-label="Category totals">
                  <SectionLabel>Totals</SectionLabel>
                  <ListGroup>
                    {categories.map((c) => (
                      <ListRow
                        key={c.category}
                        leading={<CategoryGlyph category={c.category} />}
                        title={c.category}
                        subtitle={`${((c.totalCents / (total(entries) || 1)) * 100).toFixed(1)}% of spending`}
                        trailing={<Amount value={formatPHP(c.totalCents)} />}
                      />
                    ))}
                  </ListGroup>
                </section>
              </div>
            )}

            {mobileTab === "payments" && (
              <ListGroup>
                {payments.length === 0 ? (
                  <MobileEmpty icon={Wallet} title="No payments in this range" description="Payments will appear here after they are recorded." />
                ) : (
                  payments.slice(0, 50).map((p) => (
                    <ListRow
                      key={p.id}
                      leading={<Avatar name={p.memberName} id={p.memberId} />}
                      title={p.memberName}
                      subtitle={`${p.expenseDescription} · ${shortDate(p.date)}`}
                      trailing={<span className="tabular shrink-0 text-[14.5px] font-semibold text-mint-deep">+{formatPHP(p.amountCents)}</span>}
                    />
                  ))
                )}
              </ListGroup>
            )}
          </div>

          {/* ==================== DESKTOP VIEW (md+) ==================== */}
          <div className="mt-6 hidden space-y-6 md:block">
            <Card>
              <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="space-y-1">
                  <CardTitle>Expense summary</CardTitle>
                  <CardDescription>Spending grouped by day, week (Mon–Sun) or month</CardDescription>
                </div>
                <div className="inline-flex rounded-md border border-slate-200 bg-slate-100 p-0.5" role="group" aria-label="Group by">
                  {GRANULARITY.map(([value, label]) => (
                    <button
                      key={value}
                      type="button"
                      aria-pressed={granularity === value}
                      onClick={() => setGranularity(value)}
                      className={`rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 ${
                        granularity === value ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                      }`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="h-64">
                  <SpendingBarChartInline data={periods} />
                </div>
                {periods.length > 0 && (
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Period</TableHead>
                          <TableHead className="text-right">Transactions</TableHead>
                          <TableHead className="text-right">Total</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {[...periods].reverse().map((r) => (
                          <TableRow key={r.key}>
                            <TableCell>{r.label}</TableCell>
                            <TableCell className="text-right tabular">{r.count}</TableCell>
                            <TableCell className="text-right font-semibold tabular">{formatPHP(r.totalCents)}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                      <TableFooter>
                        <TableRow className="hover:bg-transparent">
                          <TableCell className="font-semibold">Total</TableCell>
                          <TableCell className="text-right font-semibold tabular">{sumCents(periods.map((r) => r.count))}</TableCell>
                          <TableCell className="text-right font-semibold tabular">{formatPHP(sumCents(periods.map((r) => r.totalCents)))}</TableCell>
                        </TableRow>
                      </TableFooter>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 lg:grid-cols-2">
              <CategoryChart title="Category breakdown" description="Where the money went" data={categories} />
              <SettlementChart settledCents={settledCents} outstandingCents={outstandingCents} description="For the records in this report" />
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Category totals</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Category</TableHead>
                      <TableHead className="text-right">Share of spending</TableHead>
                      <TableHead className="text-right">Total</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {categories.map((c) => (
                      <TableRow key={c.category}>
                        <TableCell>{c.category}</TableCell>
                        <TableCell className="text-right tabular text-muted-foreground">{((c.totalCents / (total(entries) || 1)) * 100).toFixed(1)}%</TableCell>
                        <TableCell className="text-right font-semibold tabular">{formatPHP(c.totalCents)}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Member balances</CardTitle>
                <CardDescription>Assigned minus paid, for expenses in this report</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {balances.length === 0 ? (
                  <EmptyState title="No balances in this range" className="py-8" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Member</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Assigned</TableHead>
                        <TableHead className="hidden text-right sm:table-cell">Paid</TableHead>
                        <TableHead className="text-right">Outstanding</TableHead>
                        <TableHead className="hidden md:table-cell">Status</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {balances.map((b) => (
                        <TableRow key={b.id}>
                          <TableCell className="font-medium">
                            <Link href={`/members/${b.id}`} className="hover:text-accent-strong hover:underline">
                              {b.name}
                            </Link>
                          </TableCell>
                          <TableCell className="hidden text-right tabular sm:table-cell">{formatPHP(b.assigned)}</TableCell>
                          <TableCell className="hidden text-right tabular sm:table-cell">{formatPHP(b.paid)}</TableCell>
                          <TableCell className="text-right font-semibold tabular">{formatPHP(b.balance)}</TableCell>
                          <TableCell className="hidden md:table-cell">
                            <StatusBadge status={b.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Payment history</CardTitle>
                <CardDescription>{payments.length} in this range</CardDescription>
              </CardHeader>
              <CardContent className="p-0">
                {payments.length === 0 ? (
                  <EmptyState title="No payments in this range" description="Payments will appear here after they are recorded." className="py-8" />
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow className="hover:bg-transparent">
                        <TableHead>Date</TableHead>
                        <TableHead>Member</TableHead>
                        <TableHead className="hidden sm:table-cell">Expense</TableHead>
                        <TableHead className="text-right">Amount</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payments.slice(0, 50).map((p) => (
                        <TableRow key={p.id}>
                          <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</TableCell>
                          <TableCell className="font-medium">{p.memberName}</TableCell>
                          <TableCell className="hidden sm:table-cell">{p.expenseDescription}</TableCell>
                          <TableCell className="text-right font-semibold tabular">{formatPHP(p.amountCents)}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
                {payments.length > 50 && (
                  <p className="border-t px-4 py-3 text-xs text-muted-foreground">
                    Showing the latest 50 of {payments.length}. See <Link href="/payments" className="font-medium text-accent-strong underline">Payments</Link> for the full history.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </>
  );
}

// The period chart sits inside the summary card, so it uses the bare chart without a second card frame.

function SpendingBarChartInline({ data }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  if (!mounted) return <Skeleton className="h-full w-full" />;
  if (data.length === 0) return <EmptyState icon={BarChart3} title="No expenses in this range" className="h-full py-4" />;
  const rows = data.map((d) => ({ label: d.label, amount: d.totalCents / 100 }));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={rows} margin={{ top: 4, right: 8, left: 0, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#EDF0F3" />
        <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#7A828E", fontFamily: "var(--font-geist-mono)" }} tickLine={false} axisLine={false} interval="preserveStartEnd" minTickGap={16} dy={6} />
        <YAxis tick={{ fontSize: 11, fill: "#7A828E", fontFamily: "var(--font-geist-mono)" }} tickLine={false} axisLine={false} width={52} tickFormatter={(v) => (v >= 1000 ? `₱${+(v / 1000).toFixed(1)}k` : `₱${v}`)} />
        <Tooltip formatter={(v) => [formatPHP(Math.round(Number(v) * 100)), "Spent"]} contentStyle={{ borderRadius: 6, border: "1px solid #E3E7EB", fontSize: 12, boxShadow: "0 12px 32px -8px rgb(16 24 40 / 0.18)" }} cursor={{ fill: "#F3F5F7" }} />
        <Bar dataKey="amount" fill="#00ADB5" radius={[3, 3, 0, 0]} maxBarSize={28} />
      </BarChart>
    </ResponsiveContainer>
  );
}
