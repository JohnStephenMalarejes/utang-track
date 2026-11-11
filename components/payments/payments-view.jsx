"use client";

import { useMemo, useState } from "react";
import { CheckCheck, Clock, History, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { deletePayment, settleShare } from "@/app/actions/payments";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { Pagination } from "@/components/layout/pagination";
import { Avatar } from "@/components/layout/avatar";
import { PaymentFormDialog } from "./payment-form-dialog";
import { PAGE_SIZE } from "@/lib/constants";
import { formatDate, formatPHP, todayISO } from "@/lib/utils";

export function PaymentsView({ ledger }) {
  const [memberFilter, setMemberFilter] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [mobileTab, setMobileTab] = useState("unpaid");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [preset, setPreset] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toSettle, setToSettle] = useState(null);
  const { pending, run } = useServerAction();

  const outstanding = useMemo(
    () =>
      ledger.shares
        .filter((s) => !s.isPayer && s.remainingCents > 0 && (!memberFilter || s.memberId === memberFilter))
        .sort((a, b) => (a.expenseDate < b.expenseDate ? -1 : 1)),
    [ledger.shares, memberFilter]
  );

  const history = useMemo(() => {
    const q = query.trim().toLowerCase();
    return ledger.payments.filter(
      (p) =>
        (!memberFilter || p.memberId === memberFilter) &&
        (!q || `${p.memberName} ${p.expenseDescription} ${p.notes}`.toLowerCase().includes(q))
    );
  }, [ledger.payments, memberFilter, query]);

  const pageCount = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = history.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openForm({ payment = null, shareId = null } = {}) {
    setEditing(payment);
    setPreset(shareId ? { shareId } : null);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader eyebrow="Ledger" title="Payments" description="Record what people have paid back. Balances update immediately.">
        <Button onClick={() => openForm()}>
          <Plus /> Record payment
        </Button>
      </PageHeader>

      {ledger.members.length > 0 && (
        <div className="mb-4 sm:max-w-xs">
          <Select
            aria-label="Filter by member"
            value={memberFilter}
            onChange={(e) => {
              setMemberFilter(e.target.value);
              setPage(1);
            }}
            className="bg-white"
          >
            <option value="">All members</option>
            {ledger.members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name}
              </option>
            ))}
          </Select>
        </div>
      )}

      {/* ==================== MOBILE SCREEN (< md) ==================== */}
      <div className="space-y-3 md:hidden">
        {/* Segmented Screen Switcher */}
        <div className="grid grid-cols-2 gap-1 rounded-xl border border-slate-200 bg-slate-100 p-1" role="tablist" aria-label="Payment screens">
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "unpaid"}
            onClick={() => setMobileTab("unpaid")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
              mobileTab === "unpaid" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Clock className="h-3.5 w-3.5" />
            Unpaid ({outstanding.length})
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "history"}
            onClick={() => setMobileTab("history")}
            className={`flex items-center justify-center gap-1.5 rounded-lg py-2 text-[12.5px] font-semibold transition-all ${
              mobileTab === "history" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <History className="h-3.5 w-3.5" />
            History ({history.length})
          </button>
        </div>

        {/* Mobile Tab 1: Unpaid Shares */}
        {mobileTab === "unpaid" && (
          <div className="space-y-2.5">
            {outstanding.length === 0 ? (
              <Card>
                <EmptyState icon={CheckCheck} title="All caught up" description="No unpaid expense shares right now." />
              </Card>
            ) : (
              outstanding.map((s) => (
                <div key={s.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Avatar name={s.memberName} id={s.memberId} />
                      <div className="min-w-0">
                        <p className="truncate text-[14px] font-semibold text-slate-900">{s.memberName}</p>
                        <p className="truncate text-[12px] text-slate-500">
                          {s.expenseDescription} · {formatDate(s.expenseDate)}
                        </p>
                      </div>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-[15px] font-bold text-slate-900">{formatPHP(s.remainingCents)}</p>
                      <p className="tabular text-[11px] text-slate-500">of {formatPHP(s.owedCents)}</p>
                    </div>
                  </div>
                  <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                    <StatusBadge status={s.status} />
                    <div className="flex items-center gap-1.5">
                      <Button size="sm" variant="outline" className="h-8 px-3 text-[12px]" onClick={() => openForm({ shareId: s.id })}>
                        Pay partial
                      </Button>
                      <Button size="sm" className="h-8 px-3 text-[12px]" onClick={() => setToSettle(s)}>
                        <CheckCheck className="h-3.5 w-3.5" /> Settle
                      </Button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* Mobile Tab 2: Payment History */}
        {mobileTab === "history" && (
          <div className="space-y-2.5">
            {ledger.payments.length > 0 && (
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search payments..."
                  aria-label="Search payments"
                  className="h-10 rounded-xl bg-white pl-9"
                />
              </div>
            )}

            {ledger.payments.length === 0 ? (
              <Card>
                <EmptyState icon={Wallet} title="No payments yet" description="Payments will appear here after they are recorded." />
              </Card>
            ) : history.length === 0 ? (
              <Card>
                <EmptyState icon={Search} title="No matching payments" description="Try a different member or search term." />
              </Card>
            ) : (
              <>
                {rows.map((p) => (
                  <div key={p.id} className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2.5">
                        <Avatar name={p.memberName} id={p.memberId} />
                        <div className="min-w-0">
                          <p className="truncate text-[14px] font-semibold text-slate-900">{p.memberName}</p>
                          <p className="truncate text-[12px] text-slate-500">
                            {p.expenseDescription} · {formatDate(p.date)}
                          </p>
                          {p.notes && <p className="mt-0.5 truncate text-[11.5px] text-slate-500">“{p.notes}”</p>}
                        </div>
                      </div>
                      <p className="tabular shrink-0 text-[15px] font-bold text-emerald-700">+{formatPHP(p.amountCents)}</p>
                    </div>
                    <div className="mt-2.5 flex items-center justify-end gap-1 border-t border-slate-100 pt-2">
                      <Button variant="ghost" size="icon" className="h-7 w-7" aria-label="Edit payment" onClick={() => openForm({ payment: p })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" aria-label="Delete payment" onClick={() => setToDelete(p)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                ))}
                <Card className="overflow-hidden">
                  <Pagination page={safePage} pageSize={PAGE_SIZE} total={history.length} onPageChange={setPage} />
                </Card>
              </>
            )}
          </div>
        )}
      </div>

      {/* ==================== DESKTOP VIEW (md+) ==================== */}
      <div className="hidden md:block">
        {outstanding.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Outstanding debts</CardTitle>
              <CardDescription>
                {outstanding.length} unpaid {outstanding.length === 1 ? "share" : "shares"}, oldest first
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Member</TableHead>
                    <TableHead>Expense</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Share</TableHead>
                    <TableHead className="hidden text-right md:table-cell">Paid</TableHead>
                    <TableHead className="text-right">Remaining</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstanding.map((s) => (
                    <TableRow key={s.id}>
                      <TableCell className="font-medium">{s.memberName}</TableCell>
                      <TableCell>
                        <p>{s.expenseDescription}</p>
                        <p className="text-xs text-muted-foreground">{formatDate(s.expenseDate)}</p>
                      </TableCell>
                      <TableCell className="hidden text-right tabular md:table-cell">{formatPHP(s.owedCents)}</TableCell>
                      <TableCell className="hidden text-right tabular md:table-cell">{formatPHP(s.paidCents)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatPHP(s.remainingCents)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge status={s.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="outline" onClick={() => openForm({ shareId: s.id })}>
                            Pay
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => setToSettle(s)} aria-label={`Settle ${s.memberName}'s ${s.expenseDescription}`}>
                            <CheckCheck /> <span className="hidden lg:inline">Settle</span>
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        )}

        <Card>
          <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="space-y-1">
              <CardTitle>Payment history</CardTitle>
              <CardDescription>{ledger.payments.length} recorded</CardDescription>
            </div>
            {ledger.payments.length > 0 && (
              <div className="relative w-full sm:w-64">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search payments"
                  aria-label="Search payments"
                  className="pl-9"
                />
              </div>
            )}
          </CardHeader>
          <CardContent className="p-0">
            {ledger.payments.length === 0 ? (
              <EmptyState icon={Wallet} title="No payments yet" description="Payments will appear here after they are recorded. Use “Record payment” when someone pays you back, even partially." />
            ) : history.length === 0 ? (
              <EmptyState icon={Search} title="No matching payments" description="Try a different member or search term." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="hidden sm:table-cell">Expense</TableHead>
                      <TableHead className="hidden lg:table-cell">Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-24">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(p.date)}</TableCell>
                        <TableCell className="font-medium">{p.memberName}</TableCell>
                        <TableCell className="hidden sm:table-cell">{p.expenseDescription}</TableCell>
                        <TableCell className="hidden max-w-[16rem] truncate text-muted-foreground lg:table-cell">{p.notes || "—"}</TableCell>
                        <TableCell className="text-right font-semibold tabular">{formatPHP(p.amountCents)}</TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="icon" aria-label="Edit payment" onClick={() => openForm({ payment: p })}>
                              <Pencil />
                            </Button>
                            <Button variant="ghost" size="icon" aria-label="Delete payment" onClick={() => setToDelete(p)}>
                              <Trash2 />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                <Pagination page={safePage} pageSize={PAGE_SIZE} total={history.length} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <PaymentFormDialog open={formOpen} onOpenChange={setFormOpen} ledger={ledger} payment={editing} preset={preset} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title="Delete this payment?"
        description={toDelete ? `${formatPHP(toDelete.amountCents)} from ${toDelete.memberName} on ${formatDate(toDelete.date)} will be removed and their balance will go back up.` : ""}
        confirmLabel="Delete payment"
        destructive
        loading={pending}
        onConfirm={() => run(() => deletePayment(toDelete.id), { success: "Payment deleted", onSuccess: () => setToDelete(null) })}
      />

      <ConfirmDialog
        open={Boolean(toSettle)}
        onOpenChange={(o) => !o && setToSettle(null)}
        title="Mark as fully settled?"
        description={toSettle ? `This records a payment of ${formatPHP(toSettle.remainingCents)} from ${toSettle.memberName} for “${toSettle.expenseDescription}”, dated today.` : ""}
        confirmLabel="Mark as settled"
        loading={pending}
        onConfirm={() => run(() => settleShare(toSettle.id, todayISO()), { success: "Marked as settled", onSuccess: () => setToSettle(null) })}
      />
    </>
  );
}
