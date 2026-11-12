"use client";

import { useState } from "react";
import { CheckCheck, HandCoins, Pencil, Plus, Receipt, Wallet } from "lucide-react";
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
import {
  BigMoney,
  CategoryGlyph,
  IconButton,
  ListGroup,
  ListRow,
  MobileEmpty,
  SplitBar,
  StatusText,
  UnderlineTabs,
  shortDate,
} from "@/components/layout/mobile";
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

  const paidPct = member.assignedCents > 0 ? Math.min(100, (member.paidCents / member.assignedCents) * 100) : 100;
  const statementFilename = `statement-${member.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "member"}-${todayISO()}.pdf`;

  return (
    <>
      {/* ==================== MOBILE SCREEN (< md) ==================== */}
      <div className="space-y-6 md:hidden">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Avatar name={member.name} id={member.id} size="lg" />
            <div className="min-w-0">
              <h1 className="truncate text-[22px] font-semibold leading-tight tracking-[-0.025em] text-ink">{member.name}</h1>
              <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                {[member.contact, member.notes].filter(Boolean).join(" · ") || `Since ${formatDate(member.createdAt?.slice(0, 10))}`}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <PdfExportButton
              compact
              label="Statement"
              filename={statementFilename}
              shareTitle={`Statement for ${member.name}`}
              getPdfBytes={() => buildMemberStatementPdf({ member, shares, payments })}
            />
            <IconButton aria-label={`Edit ${member.name}`} onClick={() => setEditOpen(true)}>
              <Pencil />
            </IconButton>
          </div>
        </div>

        {/* Balance readout + progress */}
        <div>
          <p className="text-[11.5px] font-semibold uppercase tracking-[0.09em] text-slate-500">
            {member.balanceCents < 0 ? "Credit (overpaid)" : "Outstanding"}
          </p>
          <BigMoney cents={Math.abs(member.balanceCents)} size="text-[38px]" className="mt-1" />

          <div className="mt-3.5 rounded-2xl bg-white p-4 shadow-hairline">
            <SplitBar value={paidPct} />
            <div className="mt-3 flex items-center justify-between text-[12.5px]">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-mint" aria-hidden="true" />
                <span className="text-slate-500">Paid back</span>
                <span className="tabular font-semibold text-ink">{formatPHP(member.paidCents)}</span>
              </div>
              <div>
                <span className="text-slate-500">Assigned </span>
                <span className="tabular font-semibold text-ink">{formatPHP(member.assignedCents)}</span>
              </div>
            </div>
          </div>

          {hasOutstanding && (
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                type="button"
                onClick={() => setSettleOpen(true)}
                className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-ink px-4 text-[14px] font-semibold text-white"
              >
                <CheckCheck className="h-4 w-4 text-mint" strokeWidth={2.2} />
                Settle all
              </button>
              <button
                type="button"
                onClick={() => {
                  setPayShare(null);
                  setPayOpen(true);
                }}
                className="press flex h-11 items-center justify-center gap-2 rounded-xl bg-white px-4 text-[14px] font-semibold text-ink shadow-hairline"
              >
                <HandCoins className="h-4 w-4 text-ink-muted" strokeWidth={1.9} />
                Record payment
              </button>
            </div>
          )}
        </div>

        <UnderlineTabs
          label="Member records"
          tabs={[
            { id: "expenses", label: "Expenses", count: shares.length },
            { id: "payments", label: "Payments", count: payments.length },
          ]}
          value={mobileTab}
          onChange={setMobileTab}
        />

        {mobileTab === "expenses" && (
          <ListGroup>
            {shares.length === 0 ? (
              <MobileEmpty icon={Receipt} title="No expenses yet" description={`Bills that include ${member.name} will show up here.`} />
            ) : (
              shares.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <CategoryGlyph category={s.expenseCategory} />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14.5px] font-medium text-ink">{s.expenseDescription}</p>
                    <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                      {shortDate(s.expenseDate)} · share {formatPHP(s.amountCents)}
                      {s.isPayer ? " · paid the bill" : ""}
                    </p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(Math.max(s.remainingCents, 0))}</p>
                    <StatusText status={s.status} className="mt-0.5 justify-end" />
                  </div>
                  {s.remainingCents > 0 && !s.isPayer && (
                    <button
                      type="button"
                      onClick={() => {
                        setPayShare(s.id);
                        setPayOpen(true);
                      }}
                      className="press shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-ink"
                    >
                      Pay
                    </button>
                  )}
                </div>
              ))
            )}
          </ListGroup>
        )}

        {mobileTab === "payments" && (
          <ListGroup>
            {payments.length === 0 ? (
              <MobileEmpty icon={Wallet} title="No payments yet" description="Payments will appear here after you record them." />
            ) : (
              payments.map((p) => (
                <ListRow
                  key={p.id}
                  title={p.expenseDescription}
                  subtitle={`${shortDate(p.date)}${p.notes ? ` · “${p.notes}”` : ""}`}
                  trailing={<span className="tabular shrink-0 text-[14.5px] font-semibold text-mint-deep">+{formatPHP(p.amountCents)}</span>}
                />
              ))
            )}
          </ListGroup>
        )}
      </div>

      {/* ==================== DESKTOP VIEW (md+) ==================== */}
      <div className="hidden md:block">
        <div className="mb-7 flex flex-row items-center justify-between gap-3.5">
          <div className="flex min-w-0 items-center gap-4">
            <Avatar name={member.name} id={member.id} size="lg" />
            <div className="min-w-0">
              <div className="flex items-center gap-2">
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
              filename={statementFilename}
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
