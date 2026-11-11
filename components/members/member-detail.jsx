"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCheck, Pencil, Plus, Receipt, Wallet } from "lucide-react";
import { settleMember } from "@/app/actions/payments";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
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

  const [editOpen, setEditOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [payShare, setPayShare] = useState(null);
  const [settleOpen, setSettleOpen] = useState(false);
  const { pending, run } = useServerAction();

  return (
    <>
      <Button asChild variant="ghost" size="sm" className="-ml-2.5 mb-3 lg:hidden">
        <Link href="/members">
          <ArrowLeft /> Members
        </Link>
      </Button>

      <div className="mb-7 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <Avatar name={member.name} id={member.id} size="lg" />
          <div className="min-w-0">
            <div className="flex items-center gap-2.5">
              <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.02em]">{member.name}</h1>
              <StatusBadge status={member.status} />
            </div>
            <p className="mt-1 truncate text-[13.5px] text-muted-foreground">
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
        <Button variant="outline" onClick={() => setEditOpen(true)}>
          <Pencil /> Edit
        </Button>
        {hasOutstanding && (
          <>
            <Button
              variant="outline"
              onClick={() => {
                setPayShare(null);
                setPayOpen(true);
              }}
            >
              <Plus /> Record payment
            </Button>
            <Button onClick={() => setSettleOpen(true)}>
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
