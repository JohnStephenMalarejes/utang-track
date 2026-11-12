"use client";

import { useMemo, useState } from "react";
import { Eye, Pencil, Plus, Receipt, Search, SlidersHorizontal, Trash2, X } from "lucide-react";
import { deleteExpense } from "@/app/actions/expenses";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { Pagination } from "@/components/layout/pagination";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import {
  CategoryGlyph,
  IconButton,
  ListGroup,
  ListRow,
  MobileEmpty,
  SearchField,
  SectionLabel,
  StatusText,
  UnderlineTabs,
  dayLabel,
  groupByDate,
} from "@/components/layout/mobile";
import { ExpenseFormDialog } from "./expense-form-dialog";
import { ExpenseDetailDialog } from "./expense-detail-dialog";
import { CATEGORIES, PAGE_SIZE, STATUS_LABELS } from "@/lib/constants";
import { buildLedgerPdf, formatDate, formatPHP, sumCents, todayISO } from "@/lib/utils";

const NO_FILTERS = { query: "", from: "", to: "", category: "", member: "", status: "" };

export function ExpensesView({ ledger, initialOpen = false }) {
  const { expenses, members } = ledger;
  const [filters, setFilters] = useState(NO_FILTERS);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(initialOpen);
  const [editing, setEditing] = useState(null);
  const [viewing, setViewing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { pending, run } = useServerAction();

  const setFilter = (key) => (e) => {
    setFilters((f) => ({ ...f, [key]: e.target.value }));
    setPage(1);
  };
  const filtersActive = JSON.stringify(filters) !== JSON.stringify(NO_FILTERS);
  const extraFilterCount = [filters.category, filters.member, filters.from, filters.to].filter(Boolean).length;

  const filtered = useMemo(() => {
    const q = filters.query.trim().toLowerCase();
    return expenses.filter((e) => {
      if (filters.from && e.date < filters.from) return false;
      if (filters.to && e.date > filters.to) return false;
      if (filters.category && e.category !== filters.category) return false;
      if (filters.status && e.status !== filters.status) return false;
      if (filters.member && !e.shares.some((s) => s.memberId === filters.member)) return false;
      if (q) {
        const haystack = `${e.description} ${e.notes} ${e.category} ${e.paidByName ?? ""} ${e.shares.map((s) => s.memberName).join(" ")}`.toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [expenses, filters]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);
  const groupedRows = useMemo(() => groupByDate(rows, (e) => e.date), [rows]);
  const filteredTotal = useMemo(() => sumCents(filtered.map((e) => e.totalCents)), [filtered]);

  const statusTabs = useMemo(
    () => [
      { id: "", label: "All", count: expenses.length },
      { id: "unsettled", label: "Unpaid", count: expenses.filter((e) => e.status === "unsettled").length },
      { id: "partial", label: "Partial", count: expenses.filter((e) => e.status === "partial").length },
      { id: "settled", label: "Settled", count: expenses.filter((e) => e.status === "settled").length },
    ],
    [expenses]
  );

  // The live copy of the expense being viewed, so details refresh after edits
  const viewingLive = viewing ? expenses.find((e) => e.id === viewing.id) ?? null : null;

  function openForm(expense = null) {
    setEditing(expense);
    setFormOpen(true);
  }

  const paymentCount = toDelete ? ledger.payments.filter((p) => p.expenseId === toDelete.id).length : 0;

  return (
    <>
      <PageHeader
        eyebrow="Ledger"
        title="Expenses"
        description="Every shared bill and how it was split."
        mobileSubtitle={expenses.length > 0 ? `${filtered.length} ${filtered.length === 1 ? "bill" : "bills"} · ${formatPHP(filteredTotal)}` : "Shared bills and splits"}
        mobileActions={
          <>
            {filtered.length > 0 && (
              <PdfExportButton
                compact
                label="Export expenses"
                filename={`utang-tracker-expenses-${todayISO()}.pdf`}
                shareTitle="Utang Tracker Expenses"
                getPdfBytes={() =>
                  buildLedgerPdf({
                    members,
                    expenses: filtered,
                    allExpenses: expenses,
                  })
                }
              />
            )}
            <IconButton tone="solid" aria-label="Add expense" onClick={() => openForm()}>
              <Plus />
            </IconButton>
          </>
        }
      >
        {filtered.length > 0 && (
          <PdfExportButton
            filename={`utang-tracker-expenses-${todayISO()}.pdf`}
            shareTitle="Utang Tracker Expenses"
            getPdfBytes={() =>
              buildLedgerPdf({
                members,
                expenses: filtered,
                allExpenses: expenses,
              })
            }
          />
        )}
        <Button onClick={() => openForm()}>
          <Plus /> Add expense
        </Button>
      </PageHeader>

      {expenses.length === 0 ? (
        <Card>
          <EmptyState icon={Receipt} title="No expenses yet" description="Add a bill, choose who shared it and how to split it, and it will show up here.">
            <Button onClick={() => openForm()}>
              <Plus /> Add First Expense
            </Button>
          </EmptyState>
        </Card>
      ) : (
        <>
          {/* ==================== MOBILE SCREEN (< md) ==================== */}
          <div className="space-y-4 md:hidden">
            <UnderlineTabs
              label="Filter by status"
              tabs={statusTabs}
              value={filters.status}
              onChange={(status) => {
                setFilters((f) => ({ ...f, status }));
                setPage(1);
              }}
            />

            {/* Search + Filter Toggle */}
            <div className="flex items-center gap-2">
              <SearchField value={filters.query} onChange={setFilter("query")} placeholder="Search bills, notes, people…" aria-label="Search expenses" />
              <button
                type="button"
                onClick={() => setShowMobileFilters((v) => !v)}
                aria-expanded={showMobileFilters}
                aria-label="More filters"
                className={`press relative inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  showMobileFilters || extraFilterCount > 0 ? "bg-ink text-white" : "bg-white text-ink shadow-hairline"
                }`}
              >
                <SlidersHorizontal className="h-[18px] w-[18px]" />
                {extraFilterCount > 0 && (
                  <span className="tabular absolute -right-1 -top-1 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-mint px-1 text-[11px] font-bold text-ink">
                    {extraFilterCount}
                  </span>
                )}
              </button>
            </div>

            {/* Collapsible Extra Filters Panel */}
            {showMobileFilters && (
              <div className="space-y-3 rounded-2xl bg-white p-4 shadow-hairline">
                <div className="grid grid-cols-2 gap-2.5">
                  <Select aria-label="Filter by category" value={filters.category} onChange={setFilter("category")}>
                    <option value="">All categories</option>
                    {CATEGORIES.map((c) => (
                      <option key={c}>{c}</option>
                    ))}
                  </Select>
                  <Select aria-label="Filter by member" value={filters.member} onChange={setFilter("member")}>
                    <option value="">All people</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="space-y-1 text-[11.5px] font-medium text-slate-500">
                    <span>From</span>
                    <Input type="date" value={filters.from} onChange={setFilter("from")} aria-label="From date" />
                  </label>
                  <label className="space-y-1 text-[11.5px] font-medium text-slate-500">
                    <span>To</span>
                    <Input type="date" value={filters.to} onChange={setFilter("to")} aria-label="To date" />
                  </label>
                </div>
                {filtersActive && (
                  <button
                    type="button"
                    onClick={() => {
                      setFilters(NO_FILTERS);
                      setPage(1);
                    }}
                    className="inline-flex items-center gap-1 text-[12.5px] font-medium text-ink"
                  >
                    <X className="h-3.5 w-3.5" /> Reset all filters
                  </button>
                )}
              </div>
            )}

            {/* Date-grouped feed */}
            {filtered.length === 0 ? (
              <ListGroup>
                <MobileEmpty icon={Search} title="No matching bills" description="Try widening the date range or clearing a filter.">
                  <Button variant="outline" size="sm" onClick={() => (setFilters(NO_FILTERS), setPage(1))}>
                    Clear filters
                  </Button>
                </MobileEmpty>
              </ListGroup>
            ) : (
              <div className="space-y-5">
                {groupedRows.map(([date, items]) => (
                  <section key={date} aria-label={dayLabel(date)}>
                    <SectionLabel
                      action={<span className="tabular text-[12px] font-medium text-slate-400">{formatPHP(sumCents(items.map((i) => i.totalCents)))}</span>}
                    >
                      {dayLabel(date)}
                    </SectionLabel>
                    <ListGroup>
                      {items.map((e) => {
                        const people = [...(e.userShareCents > 0 ? ["You"] : []), ...e.shares.map((s) => s.memberName)];
                        return (
                          <ListRow
                            key={e.id}
                            as="button"
                            type="button"
                            onClick={() => setViewing(e)}
                            className="tap"
                            leading={<CategoryGlyph category={e.category} />}
                            title={e.description}
                            subtitle={`Paid by ${e.paidByName ?? "You"} · ${people.join(", ")}`}
                            trailing={
                              <div className="shrink-0 text-right">
                                <div className="tabular text-[14.5px] font-semibold text-ink">{formatPHP(e.totalCents)}</div>
                                <StatusText status={e.status} className="mt-0.5 justify-end" />
                              </div>
                            }
                          />
                        );
                      })}
                    </ListGroup>
                  </section>
                ))}
                <ListGroup>
                  <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
                </ListGroup>
              </div>
            )}
          </div>

          {/* ==================== DESKTOP TABLE VIEW (md+) ==================== */}
          <Card className="hidden md:block">
            <div className="grid gap-3 border-b p-4 sm:grid-cols-2 lg:grid-cols-6">
              <div className="relative sm:col-span-2 lg:col-span-2">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input value={filters.query} onChange={setFilter("query")} placeholder="Search expenses" aria-label="Search expenses" className="pl-9" />
              </div>
              <Select aria-label="Filter by category" value={filters.category} onChange={setFilter("category")}>
                <option value="">All categories</option>
                {CATEGORIES.map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </Select>
              <Select aria-label="Filter by member" value={filters.member} onChange={setFilter("member")}>
                <option value="">All members</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </Select>
              <Select aria-label="Filter by status" value={filters.status} onChange={setFilter("status")} className="lg:col-span-1">
                <option value="">All statuses</option>
                {["unsettled", "partial", "settled"].map((s) => (
                  <option key={s} value={s}>
                    {STATUS_LABELS[s]}
                  </option>
                ))}
              </Select>
              <div className="flex gap-2 sm:col-span-2 lg:col-span-6">
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  From
                  <Input type="date" value={filters.from} onChange={setFilter("from")} aria-label="From date" className="h-8 w-auto" />
                </label>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  To
                  <Input type="date" value={filters.to} onChange={setFilter("to")} aria-label="To date" className="h-8 w-auto" />
                </label>
                {filtersActive && (
                  <Button variant="ghost" size="sm" onClick={() => (setFilters(NO_FILTERS), setPage(1))}>
                    <X /> Clear filters
                  </Button>
                )}
              </div>
            </div>

            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No expenses match these filters" description="Try widening the date range or clearing a filter.">
                <Button variant="outline" onClick={() => (setFilters(NO_FILTERS), setPage(1))}>
                  Clear filters
                </Button>
              </EmptyState>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Date</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead className="hidden xl:table-cell">Paid by</TableHead>
                    <TableHead className="hidden lg:table-cell">Participants</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="hidden sm:table-cell">Status</TableHead>
                    <TableHead className="w-32">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="whitespace-nowrap text-muted-foreground">{formatDate(e.date)}</TableCell>
                      <TableCell>
                        <button type="button" onClick={() => setViewing(e)} className="text-left font-medium hover:underline hover:underline-offset-4 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          {e.description}
                        </button>
                        <div className="mt-0.5 text-[12px] text-muted-foreground">{e.category}</div>
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground xl:table-cell">{e.paidByName ?? "You"}</TableCell>
                      <TableCell className="hidden max-w-[14rem] text-muted-foreground lg:table-cell">
                        <span className="line-clamp-2">
                          {[...(e.userShareCents > 0 ? ["You"] : []), ...e.shares.map((s) => s.memberName)].join(", ")}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatPHP(e.totalCents)}</TableCell>
                      <TableCell className="hidden sm:table-cell">
                        <StatusBadge status={e.status} />
                      </TableCell>
                      <TableCell>
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`View ${e.description}`} onClick={() => setViewing(e)}>
                            <Eye />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Edit ${e.description}`} onClick={() => openForm(e)}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${e.description}`} onClick={() => setToDelete(e)}>
                            <Trash2 />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
            <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
          </Card>
        </>
      )}

      <ExpenseFormDialog open={formOpen} onOpenChange={setFormOpen} ledger={ledger} expense={editing} />
      <ExpenseDetailDialog
        expense={viewingLive}
        onOpenChange={(o) => !o && setViewing(null)}
        onEdit={(exp) => {
          setViewing(null);
          openForm(exp);
        }}
        onDelete={(exp) => {
          setViewing(null);
          setToDelete(exp);
        }}
      />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete “${toDelete?.description}”?`}
        description={`This removes the expense and everyone's share of it${
          paymentCount > 0 ? `, including ${paymentCount} recorded ${paymentCount === 1 ? "payment" : "payments"}` : ""
        }. Balances will be recalculated. This can't be undone.`}
        confirmLabel="Delete expense"
        destructive
        loading={pending}
        onConfirm={() => run(() => deleteExpense(toDelete.id), { success: "Expense deleted", onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
