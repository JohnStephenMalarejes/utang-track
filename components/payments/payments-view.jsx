"use client";

import { Fragment, useDeferredValue, useMemo, useState } from "react";
import { CheckCheck, ChevronDown, ChevronRight, Copy, Filter, HandCoins, ImageIcon, Layers, Pencil, Plus, Search, Trash2, Wallet } from "lucide-react";
import { toast } from "sonner";
import { deletePayment, deletePaymentBatch, settleMember, settleShare } from "@/app/actions/payments";
import { groupPaymentsByBatch } from "@/lib/calculations/ledger";
import { useServerAction } from "@/hooks/use-server-action";
import { useViewport } from "@/hooks/use-viewport";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/dialog";
import { ReceiptViewerDialog } from "@/components/ui/receipt-viewer-dialog";
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
import { PAGE_SIZE, PAYMENT_METHODS } from "@/lib/constants";
import { buildSingilMessage, formatDate, formatPHP, sumCents, todayISO } from "@/lib/utils";

export function PaymentsView({ ledger, initialOpen = false }) {
  const viewport = useViewport(768);
  const showMobile = viewport !== "desktop";
  const showDesktop = viewport !== "mobile";
  const [memberFilter, setMemberFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query);
  const [page, setPage] = useState(1);
  const [mobileTab, setMobileTab] = useState("unpaid");
  const [formOpen, setFormOpen] = useState(initialOpen);
  const [editing, setEditing] = useState(null);
  const [preset, setPreset] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [toDeleteBatch, setToDeleteBatch] = useState(null);
  const [toSettle, setToSettle] = useState(null);
  const [toSettleMember, setToSettleMember] = useState(null);
  const [shareMenu, setShareMenu] = useState(null);
  const [memberMenu, setMemberMenu] = useState(null);
  const [paymentMenu, setPaymentMenu] = useState(null);
  const [expandedBatches, setExpandedBatches] = useState(() => new Set());
  const [receiptPreview, setReceiptPreview] = useState(null);
  const { pending, run } = useServerAction();

  const memberById = useMemo(() => new Map(ledger.members.map((m) => [m.id, m])), [ledger.members]);

  const allUnpaid = useMemo(
    () =>
      ledger.shares
        .filter((s) => !s.isPayer && s.remainingCents > 0)
        .sort((a, b) => (a.expenseDate < b.expenseDate ? -1 : 1)),
    [ledger.shares]
  );

  const outstanding = useMemo(
    () => (memberFilter ? allUnpaid.filter((s) => s.memberId === memberFilter) : allUnpaid),
    [allUnpaid, memberFilter]
  );

  const outstandingByMember = useMemo(() => {
    const map = new Map();
    for (const s of allUnpaid) {
      const prev = map.get(s.memberId) ?? {
        memberId: s.memberId,
        memberName: s.memberName,
        shareCount: 0,
        totalRemainingCents: 0,
        shares: [],
      };
      prev.shareCount += 1;
      prev.totalRemainingCents += s.remainingCents;
      prev.shares.push(s);
      map.set(s.memberId, prev);
    }
    return [...map.values()].sort(
      (a, b) => b.totalRemainingCents - a.totalRemainingCents || a.memberName.localeCompare(b.memberName)
    );
  }, [allUnpaid]);

  const outstandingByMemberMap = useMemo(
    () => new Map(outstandingByMember.map((m) => [m.memberId, m])),
    [outstandingByMember]
  );

  const selectedMemberSummary = memberFilter ? outstandingByMemberMap.get(memberFilter) ?? null : null;

  const history = useMemo(() => {
    const q = deferredQuery.trim().toLowerCase();
    return ledger.payments.filter(
      (p) =>
        (!memberFilter || p.memberId === memberFilter) &&
        (!methodFilter || p.paymentMethod === methodFilter) &&
        (!q || `${p.memberName} ${p.expenseDescription} ${p.paymentMethod} ${p.notes}`.toLowerCase().includes(q))
    );
  }, [ledger.payments, memberFilter, methodFilter, deferredQuery]);

  const groupedEntries = useMemo(() => groupPaymentsByBatch(history), [history]);
  const pageCount = Math.max(1, Math.ceil(groupedEntries.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = groupedEntries.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const groupedHistory = useMemo(() => groupByDate(rows, (p) => p.date), [rows]);
  const outstandingTotal = useMemo(() => sumCents(outstanding.map((s) => s.remainingCents)), [outstanding]);
  const memberChips = useMemo(
    () => [{ value: "", label: "All people" }, ...ledger.members.map((m) => ({ value: m.id, label: m.name }))],
    [ledger.members]
  );

  const shareMenuMemberSummary = shareMenu ? outstandingByMemberMap.get(shareMenu.memberId) ?? null : null;

  function openForm({ payment = null, shareId = null, memberId = null, payAll = undefined } = {}) {
    setEditing(payment);
    setPreset(shareId || memberId || payAll !== undefined ? { shareId, memberId, payAll } : null);
    setFormOpen(true);
  }

  function toggleBatch(batchId) {
    setExpandedBatches((prev) => {
      const next = new Set(prev);
      if (next.has(batchId)) next.delete(batchId);
      else next.add(batchId);
      return next;
    });
  }

  async function copySingilFor(summary) {
    const member = memberById.get(summary.memberId);
    const shareUrl = member?.shareToken && typeof window !== "undefined" ? `${window.location.origin}/s/${member.shareToken}` : "";
    const text = buildSingilMessage({
      memberName: summary.memberName,
      unpaidShares: summary.shares,
      paymentDetails: ledger.paymentDetails,
      shareUrl,
    });
    try {
      await navigator.clipboard.writeText(text);
      toast.success(`Singil message copied for ${summary.memberName}`);
    } catch {
      toast.error("Could not copy reminder message");
    }
  }

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Payments"
        description="Record what people have paid back. Pay all utang of a person at once or one expense at a time."
        mobileSubtitle={
          outstanding.length > 0
            ? `${outstanding.length} unpaid ${outstanding.length === 1 ? "share" : "shares"} · ${formatPHP(outstandingTotal)}`
            : "All shares settled"
        }
        mobileActions={
          <IconButton tone="solid" aria-label="Record payment" onClick={() => openForm({ memberId: memberFilter || null })}>
            <Plus />
          </IconButton>
        }
      >
        <Button onClick={() => openForm({ memberId: memberFilter || null })}>
          <Plus /> Record payment
        </Button>
      </PageHeader>

      {ledger.members.length > 0 && (
        <div className="mb-4 hidden flex-wrap gap-3 md:flex">
          <div className="w-60">
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
          {ledger.payments.length > 0 && (
            <div className="w-48">
              <Select
                aria-label="Filter by payment method"
                value={methodFilter}
                onChange={(e) => {
                  setMethodFilter(e.target.value);
                  setPage(1);
                }}
                className="bg-white"
              >
                <option value="">All methods</option>
                {PAYMENT_METHODS.map((pm) => (
                  <option key={pm} value={pm}>
                    {pm}
                  </option>
                ))}
              </Select>
            </div>
          )}
        </div>
      )}

      {/* ==================== MOBILE SCREEN (< md) ==================== */}
      {showMobile && (
      <div className="space-y-4 md:hidden">
        <UnderlineTabs
          label="Payment views"
          tabs={[
            { id: "unpaid", label: "To collect", count: outstanding.length },
            { id: "history", label: "History", count: groupedEntries.length },
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
          <div className="space-y-5">
            {outstanding.length === 0 ? (
              <ListGroup>
                <MobileEmpty icon={CheckCheck} title="All caught up" description="No unpaid expense shares right now." />
              </ListGroup>
            ) : (
              <>
                {selectedMemberSummary ? (
                  <div className="rounded-2xl bg-white p-4 shadow-hairline">
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-[14.5px] font-semibold text-ink">{selectedMemberSummary.memberName}</p>
                        <p className="mt-0.5 text-[12.5px] text-slate-500">
                          {selectedMemberSummary.shareCount} unpaid {selectedMemberSummary.shareCount === 1 ? "expense" : "expenses"}
                        </p>
                      </div>
                      <p className="tabular shrink-0 text-[18px] font-semibold text-ink">
                        {formatPHP(selectedMemberSummary.totalRemainingCents)}
                      </p>
                    </div>
                    <div className="mt-3 grid grid-cols-2 gap-2.5">
                      <button
                        type="button"
                        onClick={() => setToSettleMember(selectedMemberSummary)}
                        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-ink px-3 text-[13.5px] font-semibold text-white"
                      >
                        <CheckCheck className="h-4 w-4 text-mint" strokeWidth={2.2} />
                        Settle all
                      </button>
                      <button
                        type="button"
                        onClick={() => openForm({ memberId: selectedMemberSummary.memberId, payAll: true })}
                        className="press flex h-10 items-center justify-center gap-1.5 rounded-xl bg-slate-100 px-3 text-[13.5px] font-semibold text-ink"
                      >
                        <HandCoins className="h-4 w-4 text-ink-muted" strokeWidth={1.9} />
                        Pay all…
                      </button>
                    </div>
                    <button
                      type="button"
                      onClick={() => copySingilFor(selectedMemberSummary)}
                      className="press mt-2 flex h-9 w-full items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-[13px] font-medium text-ink"
                    >
                      <Copy className="h-3.5 w-3.5 text-ink-muted" />
                      Copy singil message
                    </button>
                  </div>
                ) : (
                  <section aria-label="Pay all by person">
                    <SectionLabel>Pay all by person</SectionLabel>
                    <ListGroup>
                      {outstandingByMember.map((m) => (
                        <div key={m.memberId} className="flex items-center gap-3 px-4 py-3">
                          <button
                            type="button"
                            onClick={() => setMemberMenu(m)}
                            className="tap -my-3 -ml-4 flex min-w-0 flex-1 items-center gap-3 py-3 pl-4 text-left"
                          >
                            <Avatar name={m.memberName} id={m.memberId} />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-[14.5px] font-medium text-ink">{m.memberName}</p>
                              <p className="mt-0.5 truncate text-[12.5px] text-slate-500">
                                {m.shareCount} unpaid {m.shareCount === 1 ? "expense" : "expenses"}
                              </p>
                            </div>
                            <p className="tabular shrink-0 text-[14.5px] font-semibold text-ink">
                              {formatPHP(m.totalRemainingCents)}
                            </p>
                          </button>
                          <button
                            type="button"
                            onClick={() => setToSettleMember(m)}
                            aria-label={`Settle all utang for ${m.memberName}`}
                            className="press shrink-0 rounded-full bg-ink px-3 py-1.5 text-[12px] font-semibold text-white"
                          >
                            Settle all
                          </button>
                        </div>
                      ))}
                    </ListGroup>
                  </section>
                )}

                <section aria-label="Unpaid by expense">
                  {!selectedMemberSummary && <SectionLabel>By expense</SectionLabel>}
                  <ListGroup>
                    {outstanding.map((s) => (
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
                          className="press shrink-0 rounded-full bg-slate-100 px-3 py-1.5 text-[12px] font-semibold text-ink"
                        >
                          Settle
                        </button>
                      </div>
                    ))}
                  </ListGroup>
                </section>
              </>
            )}
          </div>
        )}

        {/* Mobile Tab 2: Payment History */}
        {mobileTab === "history" && (
          <div className="space-y-4">
            {ledger.payments.length > 0 && (
              <div className="space-y-2.5">
                <SearchField
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search payments…"
                  aria-label="Search payments"
                />
                <ChipRow
                  label="Filter by payment method"
                  options={[{ value: "", label: "All methods" }, ...PAYMENT_METHODS.map((pm) => ({ value: pm, label: pm }))]}
                  value={methodFilter}
                  onChange={(val) => {
                    setMethodFilter(val);
                    setPage(1);
                  }}
                />
              </div>
            )}

            {ledger.payments.length === 0 ? (
              <ListGroup>
                <MobileEmpty icon={Wallet} title="No payments yet" description="Payments will appear here once someone pays you back." />
              </ListGroup>
            ) : groupedEntries.length === 0 ? (
              <ListGroup>
                <MobileEmpty icon={Search} title="No matching payments" description="Try another person, method, or search term." />
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
                      {items.map((entry) => (
                        <ListRow
                          key={entry.id}
                          as="button"
                          type="button"
                          onClick={() => setPaymentMenu(entry)}
                          className="tap"
                          leading={<Avatar name={entry.memberName} id={entry.memberId} />}
                          title={entry.isBatch ? `${entry.memberName} · Bulk (${entry.items.length})` : entry.memberName}
                          subtitle={`${entry.isBatch ? entry.items.map((i) => i.expenseDescription).join(", ") : entry.expenseDescription} · ${entry.paymentMethod}${
                            entry.notes ? ` · “${entry.notes}”` : ""
                          }`}
                          trailing={
                            <div className="shrink-0 text-right">
                              <span className="tabular block text-[14.5px] font-semibold text-mint-deep">+{formatPHP(entry.amountCents)}</span>
                              {entry.receiptPath && <span className="text-[11px] text-slate-400">Proof attached</span>}
                            </div>
                          }
                        />
                      ))}
                    </ListGroup>
                  </section>
                ))}
                <ListGroup>
                  <Pagination page={safePage} pageSize={PAGE_SIZE} total={groupedEntries.length} onPageChange={setPage} />
                </ListGroup>
              </div>
            )}
          </div>
        )}
      </div>
      )}

      {/* ==================== DESKTOP VIEW (md+) ==================== */}
      {showDesktop && (
      <div className="hidden md:block">
        {!memberFilter && outstandingByMember.length > 0 && (
          <Card className="mb-6">
            <CardHeader>
              <CardTitle>Pay all by person</CardTitle>
              <CardDescription>Pay or settle all unpaid utang of a person at once instead of one by one</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Member</TableHead>
                    <TableHead className="text-right">Unpaid expenses</TableHead>
                    <TableHead className="text-right">Total remaining</TableHead>
                    <TableHead>
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {outstandingByMember.map((m) => (
                    <TableRow key={m.memberId}>
                      <TableCell>
                        <button
                          type="button"
                          onClick={() => {
                            setMemberFilter(m.memberId);
                            setPage(1);
                          }}
                          className="group flex items-center gap-3 text-left"
                        >
                          <Avatar name={m.memberName} id={m.memberId} />
                          <span className="font-medium group-hover:underline group-hover:underline-offset-4">{m.memberName}</span>
                        </button>
                      </TableCell>
                      <TableCell className="text-right tabular text-muted-foreground">
                        {m.shareCount} {m.shareCount === 1 ? "expense" : "expenses"}
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatPHP(m.totalRemainingCents)}</TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1.5">
                          <Button size="sm" variant="ghost" onClick={() => copySingilFor(m)} aria-label={`Copy singil for ${m.memberName}`}>
                            <Copy /> <span className="hidden lg:inline">Singil</span>
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => openForm({ memberId: m.memberId, payAll: true })}>
                            Pay all
                          </Button>
                          <Button size="sm" onClick={() => setToSettleMember(m)} aria-label={`Settle all utang for ${m.memberName}`}>
                            <CheckCheck /> Settle all
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

        {outstanding.length > 0 && (
          <Card className="mb-6">
            <CardHeader className="gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-1">
                <CardTitle>Outstanding debts</CardTitle>
                <CardDescription>
                  {outstanding.length} unpaid {outstanding.length === 1 ? "share" : "shares"} · {formatPHP(outstandingTotal)}, oldest first
                </CardDescription>
              </div>
              {selectedMemberSummary && (
                <div className="flex flex-wrap items-center gap-2">
                  <Button size="sm" variant="ghost" onClick={() => copySingilFor(selectedMemberSummary)}>
                    <Copy /> Copy singil
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => openForm({ memberId: selectedMemberSummary.memberId, payAll: true })}
                  >
                    <HandCoins /> Pay all
                  </Button>
                  <Button size="sm" onClick={() => setToSettleMember(selectedMemberSummary)}>
                    <CheckCheck /> Settle all ({formatPHP(selectedMemberSummary.totalRemainingCents)})
                  </Button>
                </div>
              )}
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
            ) : groupedEntries.length === 0 ? (
              <EmptyState icon={Search} title="No matching payments" description="Try a different member, method, or search term." />
            ) : (
              <>
                <Table>
                  <TableHeader>
                    <TableRow className="hover:bg-transparent">
                      <TableHead>Date</TableHead>
                      <TableHead>Member</TableHead>
                      <TableHead className="hidden sm:table-cell">Expense</TableHead>
                      <TableHead className="hidden md:table-cell">Method</TableHead>
                      <TableHead className="hidden lg:table-cell">Notes</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="w-28">
                        <span className="sr-only">Actions</span>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {rows.map((entry) => {
                      const isExpanded = entry.isBatch && expandedBatches.has(entry.batchId);
                      return (
                        <Fragment key={entry.id}>
                          <TableRow>
                            <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(entry.date)}</TableCell>
                            <TableCell className="font-medium">{entry.memberName}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              {entry.isBatch ? (
                                <button
                                  type="button"
                                  onClick={() => toggleBatch(entry.batchId)}
                                  className="inline-flex items-center gap-1.5 font-medium text-slate-800 hover:underline"
                                >
                                  {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                                  <Layers className="h-3.5 w-3.5 text-teal-600" />
                                  Bulk payment ({entry.items.length} expenses)
                                </button>
                              ) : (
                                entry.expenseDescription
                              )}
                            </TableCell>
                            <TableCell className="hidden md:table-cell">
                              <Badge variant="outline">{entry.paymentMethod}</Badge>
                            </TableCell>
                            <TableCell className="hidden max-w-[14rem] truncate text-muted-foreground lg:table-cell">{entry.notes || "—"}</TableCell>
                            <TableCell className="text-right font-semibold tabular">{formatPHP(entry.amountCents)}</TableCell>
                            <TableCell>
                              <div className="flex justify-end gap-1">
                                {entry.receiptPath && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label="View proof of payment"
                                    onClick={() =>
                                      setReceiptPreview({
                                        path: entry.receiptPath,
                                        title: `Payment proof · ${entry.memberName}`,
                                        description: `${formatDate(entry.date)} · ${entry.paymentMethod} · ${formatPHP(entry.amountCents)}`,
                                      })
                                    }
                                  >
                                    <ImageIcon />
                                  </Button>
                                )}
                                {entry.isBatch ? (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    aria-label={`Undo bulk payment for ${entry.memberName}`}
                                    onClick={() => setToDeleteBatch(entry)}
                                  >
                                    <Trash2 />
                                  </Button>
                                ) : (
                                  <>
                                    <Button variant="ghost" size="icon" aria-label="Edit payment" onClick={() => openForm({ payment: entry })}>
                                      <Pencil />
                                    </Button>
                                    <Button variant="ghost" size="icon" aria-label="Delete payment" onClick={() => setToDelete(entry)}>
                                      <Trash2 />
                                    </Button>
                                  </>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                          {isExpanded &&
                            entry.items.map((item) => (
                              <TableRow key={item.id} className="bg-slate-50/70">
                                <TableCell className="text-xs text-muted-foreground" />
                                <TableCell className="text-xs text-muted-foreground">↳ Included</TableCell>
                                <TableCell className="hidden text-xs sm:table-cell">
                                  {item.expenseDescription}
                                  {item.expenseDate ? ` (${formatDate(item.expenseDate)})` : ""}
                                </TableCell>
                                <TableCell className="hidden text-xs text-muted-foreground md:table-cell">{item.paymentMethod}</TableCell>
                                <TableCell className="hidden text-xs text-muted-foreground lg:table-cell">{item.notes || "—"}</TableCell>
                                <TableCell className="text-right text-xs font-medium tabular">{formatPHP(item.amountCents)}</TableCell>
                                <TableCell>
                                  <div className="flex justify-end gap-1">
                                    <Button variant="ghost" size="icon" aria-label="Edit included payment" onClick={() => openForm({ payment: item })}>
                                      <Pencil />
                                    </Button>
                                    <Button variant="ghost" size="icon" aria-label="Delete included payment" onClick={() => setToDelete(item)}>
                                      <Trash2 />
                                    </Button>
                                  </div>
                                </TableCell>
                              </TableRow>
                            ))}
                        </Fragment>
                      );
                    })}
                  </TableBody>
                </Table>
                <Pagination page={safePage} pageSize={PAGE_SIZE} total={groupedEntries.length} onPageChange={setPage} />
              </>
            )}
          </CardContent>
        </Card>
      </div>
      )}

      <PaymentFormDialog open={formOpen} onOpenChange={setFormOpen} ledger={ledger} payment={editing} preset={preset} />

      <ReceiptViewerDialog
        open={Boolean(receiptPreview)}
        onOpenChange={(o) => !o && setReceiptPreview(null)}
        path={receiptPreview?.path}
        title={receiptPreview?.title}
        description={receiptPreview?.description}
      />

      <ActionSheet
        open={Boolean(memberMenu)}
        onOpenChange={(o) => !o && setMemberMenu(null)}
        title={memberMenu ? memberMenu.memberName : ""}
        description={
          memberMenu
            ? `${formatPHP(memberMenu.totalRemainingCents)} across ${memberMenu.shareCount} unpaid ${memberMenu.shareCount === 1 ? "expense" : "expenses"}`
            : ""
        }
        actions={[
          memberMenu && {
            label: `Settle all (${formatPHP(memberMenu.totalRemainingCents)})`,
            description: "Mark all unpaid expenses as paid in full today",
            icon: CheckCheck,
            primary: true,
            onSelect: () => setToSettleMember(memberMenu),
          },
          memberMenu && {
            label: "Pay all with method, date, or proof",
            description: "Choose GCash/Cash, partial amount, or screenshot",
            icon: HandCoins,
            onSelect: () => openForm({ memberId: memberMenu.memberId, payAll: true }),
          },
          memberMenu && {
            label: "Copy singil message",
            description: "Ready-to-paste breakdown for Messenger or SMS",
            icon: Copy,
            onSelect: () => copySingilFor(memberMenu),
          },
          memberMenu && {
            label: `View ${memberMenu.memberName}'s unpaid bills`,
            icon: Filter,
            onSelect: () => {
              setMemberFilter(memberMenu.memberId);
              setPage(1);
            },
          },
        ]}
      />

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
            description: "Enter a custom amount, method, or proof",
            icon: HandCoins,
            onSelect: () => openForm({ shareId: shareMenu.id }),
          },
          shareMenu &&
            shareMenuMemberSummary &&
            shareMenuMemberSummary.shareCount > 1 && {
              label: `Settle all for ${shareMenu.memberName} (${formatPHP(shareMenuMemberSummary.totalRemainingCents)})`,
              description: `Pay all ${shareMenuMemberSummary.shareCount} unpaid expenses at once`,
              icon: CheckCheck,
              onSelect: () => setToSettleMember(shareMenuMemberSummary),
            },
        ]}
      />

      <ActionSheet
        open={Boolean(paymentMenu)}
        onOpenChange={(o) => !o && setPaymentMenu(null)}
        title={paymentMenu ? `${formatPHP(paymentMenu.amountCents)} from ${paymentMenu.memberName}` : ""}
        description={
          paymentMenu
            ? `${paymentMenu.isBatch ? `Bulk (${paymentMenu.items.length} expenses)` : paymentMenu.expenseDescription} · ${paymentMenu.paymentMethod} · ${formatDate(paymentMenu.date)}`
            : ""
        }
        actions={[
          paymentMenu?.receiptPath && {
            label: "View proof of payment",
            icon: ImageIcon,
            onSelect: () =>
              setReceiptPreview({
                path: paymentMenu.receiptPath,
                title: `Payment proof · ${paymentMenu.memberName}`,
                description: `${formatDate(paymentMenu.date)} · ${paymentMenu.paymentMethod} · ${formatPHP(paymentMenu.amountCents)}`,
              }),
          },
          paymentMenu &&
            !paymentMenu.isBatch && {
              label: "Edit payment",
              icon: Pencil,
              onSelect: () => openForm({ payment: paymentMenu }),
            },
          paymentMenu &&
            !paymentMenu.isBatch && {
              label: "Delete payment",
              icon: Trash2,
              destructive: true,
              onSelect: () => setToDelete(paymentMenu),
            },
          paymentMenu?.isBatch && {
            label: `Undo bulk payment (${paymentMenu.items.length} expenses)`,
            description: "Removes all payments in this batch and restores balances",
            icon: Trash2,
            destructive: true,
            onSelect: () => setToDeleteBatch(paymentMenu),
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
        open={Boolean(toDeleteBatch)}
        onOpenChange={(o) => !o && setToDeleteBatch(null)}
        title={`Undo bulk payment (${toDeleteBatch?.items?.length ?? 0} expenses)?`}
        description={
          toDeleteBatch
            ? `This removes all ${toDeleteBatch.items.length} payments totalling ${formatPHP(toDeleteBatch.amountCents)} from ${toDeleteBatch.memberName} on ${formatDate(toDeleteBatch.date)} and restores their unpaid balances.`
            : ""
        }
        confirmLabel="Undo bulk payment"
        destructive
        loading={pending}
        onConfirm={() =>
          run(() => deletePaymentBatch(toDeleteBatch.batchId), {
            success: "Bulk payment undone",
            onSuccess: () => setToDeleteBatch(null),
          })
        }
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

      <ConfirmDialog
        open={Boolean(toSettleMember)}
        onOpenChange={(o) => !o && setToSettleMember(null)}
        title={toSettleMember ? `Settle all utang for ${toSettleMember.memberName}?` : ""}
        description={
          toSettleMember
            ? `This records payments totalling ${formatPHP(toSettleMember.totalRemainingCents)} across ${toSettleMember.shareCount} unpaid ${
                toSettleMember.shareCount === 1 ? "expense" : "expenses"
              }, dated today.`
            : ""
        }
        confirmLabel="Settle all"
        loading={pending}
        onConfirm={() =>
          run(() => settleMember(toSettleMember.memberId, todayISO()), {
            success: `All utang settled for ${toSettleMember.memberName}`,
            onSuccess: () => setToSettleMember(null),
          })
        }
      />
    </>
  );
}
