"use client";

import { useMemo, useState } from "react";
import { CheckCheck, HandCoins, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
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
import {
  ActionSheet,
  ChipRow,
  IconButton,
  ListGroup,
  ListRow,
  MobileEmpty,
  SearchField,
  SectionLabel,
  UnderlineTabs,
  dayLabel,
  groupByDate,
  shortDate,
} from "@/components/layout/mobile";
import { PaymentFormDialog } from "./payment-form-dialog";
import { PAGE_SIZE } from "@/lib/constants";
import { formatDate, formatPHP, sumCents, todayISO } from "@/lib/utils";

export function PaymentsView({ ledger, initialOpen = false }) {
  const [memberFilter, setMemberFilter] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [mobileTab, setMobileTab] = useState("unpaid");
  const [formOpen, setFormOpen] = useState(initialOpen);
  const [editing, setEditing] = useState(null);
  const [preset, setPreset] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toSettle, setToSettle] = useState(null);
  const [shareMenu, setShareMenu] = useState(null);
  const [paymentMenu, setPaymentMenu] = useState(null);
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
  const groupedHistory = useMemo(() => groupByDate(rows, (p) => p.date), [rows]);
  const outstandingTotal = useMemo(() => sumCents(outstanding.map((s) => s.remainingCents)), [outstanding]);
  const memberChips = useMemo(
    () => [{ value: "", label: "All people" }, ...ledger.members.map((m) => ({ value: m.id, label: m.name }))],
    [ledger.members]
  );

  function openForm({ payment = null, shareId = null } = {}) {
    setEditing(payment);
    setPreset(shareId ? { shareId } : null);
    setFormOpen(true);
  }

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Payments"
        description="Record what people have paid back. Balances update immediately."
        mobileSubtitle={
          outstanding.length > 0
            ? `${outstanding.length} unpaid ${outstanding.length === 1 ? "share" : "shares"} · ${formatPHP(outstandingTotal)}`
            : "All shares settled"
        }
        mobileActions={
          <IconButton tone="solid" aria-label="Record payment" onClick={() => openForm()}>
            <Plus />
          </IconButton>
        }
      >
        <Button onClick={() => openForm()}>
          <Plus /> Record payment
        </Button>
      </PageHeader>

      {ledger.members.length > 0 && (
        <div className="mb-4 hidden sm:max-w-xs md:block">
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
      <div className="space-y-4 md:hidden">
        <UnderlineTabs
          label="Payment views"
          tabs={[
            { id: "unpaid", label: "To collect", count: outstanding.length },
            { id: "history", label: "History", count: history.length },
          ]}
          value={mobileTab}
          onChange={setMobileTab}
        />

        {ledger.members.length > 0 && (
          <ChipRow
            label="Filter by person"
            options={memberChips}
            value={memberFilter}
            onChange={(val) => {
              setMemberFilter(val);
              setPage(1);
            }}
          />
        )}

        {/* Mobile Tab 1: Unpaid Shares */}
        {mobileTab === "unpaid" && (
          <ListGroup>
            {outstanding.length === 0 ? (
              <MobileEmpty icon={CheckCheck} title="All caught up" description="No unpaid expense shares right now." />
            ) : (
              outstanding.map((s) => (
                <div key={s.id} className="flex items-center gap-3 px-4 py-3">
                  <button
                    type="button"
                    onClick={() => setShareMenu(s)}
                    className="tap -my-3 -ml-4 flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                  >
                    <Avatar name={s.memberName} id={s.memberId} />
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-[14.5px] font-medium text-ink">{s.memberName}</p>
                      <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                        {s.expenseDescription} · {shortDate(s.expenseDate)}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(s.remainingCents)}</p>
                      <p className="tabular text-[11px] text-slate-400">
                        {s.paidCents > 0 ? `of ${formatPHP(s.owedCents)}` : "unpaid"}
                      </p>
                    </div>
                  </button>
                  <button
                    type="button"
                    onClick={() => setToSettle(s)}
                    aria-label={`Settle ${s.memberName}'s ${s.expenseDescription}`}
                    className="press shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white"
                  >
                    Settle
                  </button>
                </div>
              ))
            )}
          </ListGroup>
        )}

        {/* Mobile Tab 2: Payment History */}
        {mobileTab === "history" && (
          <div className="space-y-4">
            {ledger.payments.length > 0 && (
              <SearchField
                value={query}
                onChange={(e) => {
                  setQuery(e.target.value);
                  setPage(1);
                }}
                placeholder="Search payments…"
                aria-label="Search payments"
              />
            )}

            {ledger.payments.length === 0 ? (
              <ListGroup>
                <MobileEmpty icon={Wallet} title="No payments yet" description="Payments will appear here once someone pays you back." />
              </ListGroup>
            ) : history.length === 0 ? (
              <ListGroup>
                <MobileEmpty icon={Search} title="No matching payments" description="Try another person or search term." />
              </ListGroup>
            ) : (
              <div className="space-y-5">
                {groupedHistory.map(([date, items]) => (
                  <section key={date} aria-label={dayLabel(date)}>
                    <SectionLabel
                      action={<span className="tabular text-[12px] font-medium text-slate-400">+{formatPHP(sumCents(items.map((i) => i.amountCents)))}</span>}
                    >
                      {dayLabel(date)}
                    </SectionLabel>
                    <ListGroup>
                      {items.map((p) => (
                        <ListRow
                          key={p.id}
                          as="button"
                          type="button"
                          onClick={() => setPaymentMenu(p)}
                          className="tap"
                          leading={<Avatar name={p.memberName} id={p.memberId} />}
                          title={p.memberName}
                          subtitle={`${p.expenseDescription}${p.notes ? ` · “${p.notes}”` : ""}`}
                          trailing={<span className="tabular shrink-0 text-[14.5px] font-semibold text-mint-deep">+{formatPHP(p.amountCents)}</span>}
                        />
                      ))}
                    </ListGroup>
                  </section>
                ))}
                <ListGroup>
                  <Pagination page={safePage} pageSize={PAGE_SIZE} total={history.length} onPageChange={setPage} />
                </ListGroup>
              </div>
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

      <ActionSheet
        open={Boolean(shareMenu)}
        onOpenChange={(o) => !o && setShareMenu(null)}
        title={shareMenu ? `${shareMenu.memberName} · ${shareMenu.expenseDescription}` : ""}
        description={shareMenu ? `${formatPHP(shareMenu.remainingCents)} remaining of ${formatPHP(shareMenu.owedCents)}` : ""}
        actions={[
          shareMenu && {
            label: `Settle ${formatPHP(shareMenu.remainingCents)}`,
            description: "Mark this share as paid in full today",
            icon: CheckCheck,
            primary: true,
            onSelect: () => setToSettle(shareMenu),
          },
          shareMenu && {
            label: "Record partial payment",
            description: "Enter a custom amount or date",
            icon: HandCoins,
            onSelect: () => openForm({ shareId: shareMenu.id }),
          },
        ]}
      />

      <ActionSheet
        open={Boolean(paymentMenu)}
        onOpenChange={(o) => !o && setPaymentMenu(null)}
        title={paymentMenu ? `${formatPHP(paymentMenu.amountCents)} from ${paymentMenu.memberName}` : ""}
        description={paymentMenu ? `${paymentMenu.expenseDescription} · ${formatDate(paymentMenu.date)}` : ""}
        actions={[
          paymentMenu && {
            label: "Edit payment",
            icon: Pencil,
            onSelect: () => openForm({ payment: paymentMenu }),
          },
          paymentMenu && {
            label: "Delete payment",
            icon: Trash2,
            destructive: true,
            onSelect: () => setToDelete(paymentMenu),
          },
        ]}
      />

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
