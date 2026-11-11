"use client";

import { useState } from "react";
import { CheckCheck, Pencil, Plus, Receipt, Wallet } from "lucide-react";
import { settleMember } from "@/app/actions/payments";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { Kpi, KpiStrip, Meter } from "@/components/layout/kpi";
import { Avatar } from "@/components/layout/avatar";
import { MemberFormDialog } from "./member-form-dialog";
import { PaymentFormDialog } from "@/components/payments/payment-form-dialog";
import { buildMemberStatementPdf, formatDate, formatPHP, todayISO } from "@/lib/utils";

function Stat({ label, value, children }) {
  return (
    <Kpi label={label} value={value}>
      {children}
    </Kpi>
  );
}

export function MemberDetail({ ledger, memberId }) {
  const member = ledger.members.find((m) => m.id === memberId);
  const shares = ledger.shares.filter((s) => s.memberId === memberId);
  const payments = ledger.payments.filter((p) => p.memberId === memberId);
  const openShares = shares.filter((s) => s.remainingCents > 0 && !s.isPayer);
  const hasOutstanding = openShares.length > 0;
  const openCents = openShares.reduce((sum, s) => sum + s.remainingCents, 0);

  const [mobileTab, setMobileTab] = useState("expenses");
  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payShare, setPayShare] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const { pending, run } = useServerAction();

  return (
    <>
      <div className="mb-5 flex flex-col gap-3.5 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-3.5 sm:gap-4">
          <Avatar name={member.name} id={member.id} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="truncate text-[20px] font-semibold leading-tight tracking-[-0.02em] sm:text-[22px]">{member.name}</h1>
              <StatusBadge status={member.status} />
            </div>
            <p className="mt-0.5 truncate text-[12.5px] text-muted-foreground sm:mt-1 sm:text-[13.5px]">
              {[member.contact, member.notes].filter(Boolean).join(" · ") || `Member since ${formatDate(member.createdAt?.slice(0, 10))}`}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <PdfExportButton
            label="Statement"
            filename={`statement-${member.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "member"}-${todayISO()}.pdf`}
            shareTitle={`Statement for ${member.name}`}
            getPdfBytes={() => buildMemberStatementPdf({ member, shares, payments })}
          />
          <Button variant="outline" size="sm" className="sm:h-9 sm:px-3.5" onClick={() => setEditOpen(true)}>
            <Pencil /> Edit
          </Button>
          {hasOutstanding && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="sm:h-9 sm:px-3.5"
                onClick={() => {
                  setPayShare(null);
                  setPayOpen(true);
                }}
              >
                <Plus /> Record payment
              </Button>
              <Button size="sm" className="sm:h-9 sm:px-3.5" onClick={() => setSettleOpen(true)}>
                <CheckCheck /> Settle all
              </Button>
            </>
          )}
        </div>
      </div>

      <KpiStrip cols={3}>
        <Stat label="Assigned" value={formatPHP(member.assignedCents)} />
        <Stat label="Paid back" value={formatPHP(member.paidCents)}>
          <div className="mt-1 flex items-center gap-2">
            <Meter value={member.assignedCents > 0 ? (member.paidCents / member.assignedCents) * 100 : 0} tone="bg-success" className="h-1" />
            <span className="tabular text-[11px] text-muted-foreground">
              {member.assignedCents > 0 ? Math.min(100, Math.round((member.paidCents / member.assignedCents) * 100)) : 0}%
            </span>
          </div>
        </Stat>
        <Stat label={member.balanceCents < 0 ? "Credit (overpaid)" : "Outstanding"} value={formatPHP(Math.abs(member.balanceCents))} />
      </KpiStrip>

      {/* ==================== MOBILE SCREEN (< md) ==================== */}
      <div className="mt-4 space-y-3 md:hidden">
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Member records">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "expenses"}
            onClick={() => setMobileTab("expenses")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
              mobileTab === "expenses" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Receipt className="h-3.5 w-3.5" />
            Expenses ({shares.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "payments"}
            onClick={() => setMobileTab("payments")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
              mobileTab === "payments" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Wallet className="h-3.5 w-3.5" />
            Payments ({payments.length})
          </button>
        </div>

        {mobileTab === "expenses" && (
          <div className="space-y-2.5">
            {shares.length === 0 ? (
              <Card>
                <EmptyState icon={Receipt} title="No expenses yet" description={`Expenses that include ${member.name} will be listed here.`} />
              </Card>
            ) : (
              shares.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-[14px] font-semibold text-slate-900">{s.expenseDescription}</p>
                      <p className="mt-0.5 text-[12px] text-slate-500">
                        {formatDate(s.expenseDate)} · <span className="font-medium text-slate-700">{s.expenseCategory}</span>
                      </p>
                      {s.isPayer && <p className="mt-1 text-[11px] text-slate-500">Paid the bill, so this share isn't owed</p>}
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-[15px] font-bold text-slate-900">{formatPHP(Math.max(s.remainingCents, 0))}</p>
                      <p className="tabular text-[11px] text-slate-500">share {formatPHP(s.amountCents)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-2.5">
                    <StatusBadge status={s.status} />
                    {s.remainingCents > 0 && !s.isPayer && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 px-3 text-[12px]"
                        onClick={() => {
                          setPayShare(s.id);
                          setPayOpen(true);
                        }}
                      >
                        Pay
                      </Button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {mobileTab === "payments" && (
          <div className="space-y-2.5">
            {payments.length === 0 ? (
              <Card>
                <EmptyState icon={Wallet} title="No payments yet" description="Payments will appear here after you record them." />
              </Card>
            ) : (
              payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="min-w-0">
                    <p className="truncate text-[14px] font-semibold text-slate-900">{p.expenseDescription}</p>
                    <p className="mt-0.5 text-[12px] text-slate-500">
                      {formatDate(p.date)}
                      {p.notes ? ` · ${p.notes}` : ""}
                    </p>
                  </div>
                  <p className="tabular shrink-0 text-[15px] font-bold text-emerald-700">+{formatPHP(p.amountCents)}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>

      {/* ==================== DESKTOP VIEW (md+) ==================== */}
      <div className="hidden md:block">
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Expense history</CardTitle>
            <CardDescription>Every expense {member.name} took part in</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {shares.length === 0 ? (
              <EmptyState icon={Receipt} title="No expenses yet" description={`Expenses that include ${member.name} will be listed here.`} />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead className="text-right">Share</TableHead>
                    <TableHead className="hidden text-right sm:table-cell">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="w-20">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shares.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(s.expenseDate)}</TableCell>
                      <TableCell>
                        <p className="font-medium">{s.expenseDescription}</p>
                        <Badge variant="outline" className="mt-1">
                          {s.expenseCategory}
                        </Badge>
                        {s.isPayer && <p className="mt-1 text-xs text-muted-foreground">Paid the bill, so this share isn't owed</p>}
                      </TableCell>
                      <TableCell className="text-right tabular">{formatPHP(s.amountCents)}</TableCell>
                      <TableCell className="hidden text-right tabular sm:table-cell">{formatPHP(s.paidCents)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatPHP(Math.max(s.remainingCents, 0))}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>
                        {s.remainingCents > 0 && !s.isPayer && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setPayShare(s.id);
                              setPayOpen(true);
                            }}
                          >
                            Pay
                          </Button>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Payment history</CardTitle>
            <CardDescription>Payments {member.name} has made</CardDescription>
          </CardHeader>
          <CardContent className="p-0">
            {payments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments yet" description="Payments will appear here after you record them." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead className="hidden sm:table-cell">Notes</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</TableCell>
                      <TableCell>{p.expenseDescription}</TableCell>
                      <TableCell className="hidden text-muted-foreground sm:table-cell">{p.notes || "—"}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatPHP(p.amountCents)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      <MemberFormDialog open={editOpen} onOpenChange={setEditOpen} member={member} />
      <PaymentFormDialog open={payOpen} onOpenChange={setPayOpen} ledger={ledger} preset={{ memberId, shareId: payShare }} />
      <ConfirmDialog
        open={settleOpen}
        onOpenChange={setSettleOpen}
        title={`Settle everything for ${member.name}?`}
        description={`This records payments totalling ${formatPHP(openCents)} dated today, marking all of ${member.name}'s open expenses as settled.`}
        confirmLabel="Settle all"
        loading={pending}
        onConfirm={() => run(() => settleMember(memberId, todayISO()), { success: "All expenses settled", onSuccess: () => setSettleOpen(false) })}
      />
    </>
  );
}
