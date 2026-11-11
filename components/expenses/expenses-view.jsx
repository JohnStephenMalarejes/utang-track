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
import { ExpenseFormDialog } from "./expense-form-dialog";
import { ExpenseDetailDialog } from "./expense-detail-dialog";
import { CATEGORIES, PAGE_SIZE, STATUS_LABELS } from "@/lib/constants";
import { buildLedgerPdf, formatDate, formatPHP, todayISO } from "@/lib/utils";

const NO_FILTERS = { query: "", from: "", to: "", category: "", member: "", status: "" };

const STATUS_PILLS = [
  { value: "", label: "All" },
  { value: "unsettled", label: "Unsettled" },
  { value: "partial", label: "Partial" },
  { value: "settled", label: "Settled" },
];

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

  // The live copy of the expense being viewed, so details refresh after edits
  const viewingLive = viewing ? expenses.find((e) => e.id === viewing.id) ?? null : null;

  function openForm(expense = null) {
    setEditing(expense);
    setFormOpen(true);
  }

  const paymentCount = toDelete ? ledger.payments.filter((p) => p.expenseId === toDelete.id).length : 0;

  return (
    <>
      <PageHeader eyebrow="Ledger" title="Expenses" description="Every shared bill and how it was split.">
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
          <div className="space-y-3 md:hidden">
            {/* Search + Filter Toggle */}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  value={filters.query}
                  onChange={setFilter("query")}
                  placeholder="Search bills, notes, members..."
                  aria-label="Search expenses"
                  className="h-10 rounded-xl bg-white pl-9"
                />
              </div>
              <Button
                type="button"
                variant={showMobileFilters || extraFilterCount > 0 ? "default" : "outline"}
                size="sm"
                onClick={() => setShowMobileFilters((v) => !v)}
                className="h-10 shrink-0 rounded-xl px-3"
                aria-expanded={showMobileFilters}
              >
                <SlidersHorizontal className="h-4 w-4" />
                {extraFilterCount > 0 && (
                  <span className="ml-1 inline-flex h-4 w-4 items-center justify-center rounded-full bg-teal-500 text-[10px] font-bold text-slate-950">
                    {extraFilterCount}
                  </span>
                )}
              </Button>
            </div>

            {/* Quick Status Filter Pills */}
            <div className="flex items-center gap-1.5 overflow-x-auto pb-0.5">
              {STATUS_PILLS.map((pill) => {
                const active = filters.status === pill.value;
                return (
                  <button
                    key={pill.value}
                    type="button"
                    onClick={() => {
                      setFilters((f) => ({ ...f, status: pill.value }));
                      setPage(1);
                    }}
                    className={`shrink-0 rounded-full px-3.5 py-1.5 text-[12px] font-semibold transition-colors ${
                      active
                        ? "bg-slate-900 text-white shadow-xs"
                        : "border border-slate-200 bg-white text-slate-600 hover:bg-slate-100"
                    }`}
                  >
                    {pill.label}
                  </button>
                );
              })}
              {filtersActive && (
                <button
                  type="button"
                  onClick={() => {
                    setFilters(NO_FILTERS);
                    setPage(1);
                  }}
                  className="ml-auto inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11.5px] font-medium text-teal-700"
                >
                  <X className="h-3 w-3" /> Reset
                </button>
              )}
            </div>

            {/* Collapsible Extra Filters Panel */}
            {showMobileFilters && (
              <Card className="space-y-3 p-3.5">
                <div className="grid grid-cols-2 gap-2.5">
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
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  <label className="space-y-1 text-[11px] font-medium text-slate-600">
                    <span>From date</span>
                    <Input type="date" value={filters.from} onChange={setFilter("from")} aria-label="From date" className="h-9" />
                  </label>
                  <label className="space-y-1 text-[11px] font-medium text-slate-600">
                    <span>To date</span>
                    <Input type="date" value={filters.to} onChange={setFilter("to")} aria-label="To date" className="h-9" />
                  </label>
                </div>
              </Card>
            )}

            {/* Mobile Expense Cards */}
            {filtered.length === 0 ? (
              <Card>
                <EmptyState icon={Search} title="No matching expenses" description="Try widening the date range or clearing a filter.">
                  <Button variant="outline" onClick={() => (setFilters(NO_FILTERS), setPage(1))}>
                    Clear filters
                  </Button>
                </EmptyState>
              </Card>
            ) : (
              <div className="space-y-2.5">
                {rows.map((e) => {
                  const people = [...(e.userShareCents > 0 ? ["You"] : []), ...e.shares.map((s) => s.memberName)];
                  return (
                    <div
                      key={e.id}
                      className="rounded-xl border border-slate-200 bg-white p-3.5 shadow-xs transition-colors active:bg-slate-50/70"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <button
                          type="button"
                          onClick={() => setViewing(e)}
                          className="min-w-0 flex-1 text-left focus-visible:outline-none"
                        >
                          <p className="truncate text-[14.5px] font-semibold text-slate-900">{e.description}</p>
                          <p className="mt-0.5 text-[12px] text-slate-500">
                            {formatDate(e.date)} · <span className="font-medium text-slate-700">{e.category}</span> · Paid by {e.paidByName ?? "You"}
                          </p>
                        </button>
                        <p className="tabular shrink-0 text-[15px] font-bold text-slate-900">{formatPHP(e.totalCents)}</p>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-2 border-t border-slate-100 pt-2.5">
                        <div className="flex min-w-0 items-center gap-2">
                          <StatusBadge status={e.status} />
                          <span className="truncate text-[11.5px] text-slate-500">{people.join(", ")}</span>
                        </div>
                        <div className="flex shrink-0 items-center gap-0.5">
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`View ${e.description}`} onClick={() => setViewing(e)}>
                            <Eye className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7" aria-label={`Edit ${e.description}`} onClick={() => openForm(e)}>
                            <Pencil className="h-3.5 w-3.5" />
                          </Button>
                          <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600 hover:text-red-700" aria-label={`Delete ${e.description}`} onClick={() => setToDelete(e)}>
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
                <Card className="overflow-hidden">
                  <Pagination page={safePage} pageSize={PAGE_SIZE} total={filtered.length} onPageChange={setPage} />
                </Card>
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
      <ExpenseDetailDialog expense={viewingLive} onOpenChange={(o) => !o && setViewing(null)} />

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
