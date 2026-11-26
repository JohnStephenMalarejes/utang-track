"use client";

import { useState } from "react";
import { Check, Copy, Receipt, Wallet } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar } from "@/components/layout/avatar";
import { BigMoney, CategoryGlyph, ListGroup, ListRow, MobileEmpty, SplitBar, StatusText, UnderlineTabs, shortDate } from "@/components/layout/mobile";
import { formatDate, formatPHP } from "@/lib/utils";

export function PublicStatement({ statement }) {
  const { member, shares, payments, paymentDetails } = statement;
  const [tab, setTab] = useState("unpaid");
  const [copiedDetails, setCopiedDetails] = useState(false);

  const unpaidShares = shares.filter((s) => !s.isPayer && s.remainingCents > 0);
  const paidPct = member.assignedCents > 0 ? Math.min(100, (member.paidCents / member.assignedCents) * 100) : 100;

  async function copyPaymentDetails() {
    if (!paymentDetails) return;
    try {
      await navigator.clipboard.writeText(paymentDetails);
      setCopiedDetails(true);
      toast.success("Payment details copied");
      setTimeout(() => setCopiedDetails(false), 2000);
    } catch {
      toast.error("Could not copy payment details");
    }
  }

  return (
    <div className="min-h-screen bg-canvas px-4 py-8 sm:py-12">
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Header */}
        <header className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={member.name} id={member.id} size="lg" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-slate-500">Utang Statement</p>
              <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.025em] text-ink">{member.name}</h1>
            </div>
          </div>
          <Badge variant="outline" className="shrink-0 bg-white">
            Read-only
          </Badge>
        </header>

        {/* Balance summary */}
        <section className="rounded-2xl bg-white p-5 shadow-hairline dark:bg-slate-900">
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-slate-500 dark:text-slate-400">
            {member.balanceCents < 0 ? "Credit (overpaid)" : "Outstanding balance"}
          </p>
          <BigMoney cents={Math.abs(member.balanceCents)} size="text-[40px]" className="mt-1.5" forceVisible />
          <p className="mt-2 text-[13px] text-slate-500">
            {unpaidShares.length > 0
              ? `${unpaidShares.length} unpaid ${unpaidShares.length === 1 ? "expense" : "expenses"} remaining`
              : "All expenses are settled up!"}
          </p>

          <SplitBar value={paidPct} className="mt-4" />
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[12.5px]">
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
              <span className="text-slate-500">Paid</span>
              <span className="tabular font-semibold text-ink">{formatPHP(member.paidCents)}</span>
            </div>
            <div>
              <span className="text-slate-500">Total assigned </span>
              <span className="tabular font-semibold text-ink">{formatPHP(member.assignedCents)}</span>
            </div>
          </div>
        </section>

        {/* Saved payment instructions */}
        {paymentDetails && unpaidShares.length > 0 && (
          <section className="rounded-2xl bg-white p-5 shadow-hairline dark:bg-slate-900">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Where to pay</h2>
                <p className="mt-2 whitespace-pre-wrap text-[14px] leading-relaxed text-ink">{paymentDetails}</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={copyPaymentDetails} className="shrink-0">
                {copiedDetails ? <Check /> : <Copy />}
                {copiedDetails ? "Copied" : "Copy"}
              </Button>
            </div>
          </section>
        )}

        {/* Tabs */}
        <UnderlineTabs
          label="Statement sections"
          tabs={[
            { id: "unpaid", label: "Unpaid", count: unpaidShares.length },
            { id: "expenses", label: "All expenses", count: shares.length },
            { id: "payments", label: "Payments", count: payments.length },
          ]}
          value={tab}
          onChange={setTab}
        />

        {tab === "unpaid" && (
          <ListGroup>
            {unpaidShares.length === 0 ? (
              <MobileEmpty icon={Receipt} title="Nothing unpaid" description="You're all caught up!" />
            ) : (
              unpaidShares.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <CategoryGlyph category={s.expenseCategory} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink">{s.expenseDescription}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                      {shortDate(s.expenseDate)} · {s.expenseCategory}
                      {s.paidCents > 0 ? ` · paid ${formatPHP(s.paidCents)} of ${formatPHP(s.owedCents)}` : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(s.remainingCents)}</p>
                    <StatusText status={s.status} className="mt-0.5 justify-end" />
                  </div>
                </div>
              ))
            )}
          </ListGroup>
        )}

        {tab === "expenses" && (
          <ListGroup>
            {shares.length === 0 ? (
              <MobileEmpty icon={Receipt} title="No expenses yet" description="Shared bills will appear here." />
            ) : (
              shares.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <CategoryGlyph category={s.expenseCategory} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink">{s.expenseDescription}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                      {formatDate(s.expenseDate)} · share {formatPHP(s.amountCents)}
                      {s.isPayer ? " · paid the bill" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(Math.max(s.remainingCents, 0))}</p>
                    <StatusText status={s.status} className="mt-0.5 justify-end" />
                  </div>
                </div>
              ))
            )}
          </ListGroup>
        )}

        {tab === "payments" && (
          <ListGroup>
            {payments.length === 0 ? (
              <MobileEmpty icon={Wallet} title="No payments yet" description="Payments you've made will show up here." />
            ) : (
              payments.map((p) => (
                <ListRow
                  key={p.id}
                  title={p.expenseDescription}
                  subtitle={`${formatDate(p.date)} · ${p.paymentMethod}${p.notes ? ` · “${p.notes}”` : ""}`}
                  trailing={<span className="tabular shrink-0 text-[14.5px] font-semibold text-mint-deep">+{formatPHP(p.amountCents)}</span>}
                />
              ))
            )}
          </ListGroup>
        )}
      </div>
    </div>
  );
}
