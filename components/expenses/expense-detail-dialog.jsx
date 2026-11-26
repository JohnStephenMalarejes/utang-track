"use client";

import { useState } from "react";
import { Copy, ImageIcon, Pencil, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ReceiptViewerDialog } from "@/components/ui/receipt-viewer-dialog";
import { receiptUrl } from "@/components/ui/receipt-upload";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { Avatar } from "@/components/layout/avatar";
import { CategoryGlyph, StatusText } from "@/components/layout/mobile";
import { buildExpenseDetailPdf, formatDateLong, formatPHP } from "@/lib/utils";

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ExpenseDetailDialog({ expense, onOpenChange, onEdit, onDuplicate, onDelete }) {
  const [viewerOpen, setViewerOpen] = useState(false);

  return (
    <>
      <Dialog open={Boolean(expense)} onOpenChange={onOpenChange}>
        <DialogContent size="lg">
          {expense && (
            <>
              <DialogHeader>
                <DialogTitle>{expense.description}</DialogTitle>
                <DialogDescription>{formatDateLong(expense.date)}</DialogDescription>
              </DialogHeader>
              <DialogBody className="space-y-5">
                {/* ---------- Phones: receipt-style summary ---------- */}
                <div className="space-y-5 sm:hidden">
                  <div className="flex items-center gap-3 rounded-2xl bg-canvas p-4">
                    <CategoryGlyph category={expense.category} className="bg-white" />
                    <div className="min-w-0 flex-1">
                      <p className="text-[12px] text-slate-500">
                        {expense.category} · Paid by {expense.paidByName ?? "You"}
                      </p>
                      <p className="tabular mt-0.5 text-[26px] font-semibold leading-none tracking-[-0.03em] text-ink">{formatPHP(expense.totalCents)}</p>
                    </div>
                    <StatusText status={expense.status} />
                  </div>

                  {expense.notes && (
                    <div>
                      <p className="text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Notes</p>
                      <p className="mt-1 whitespace-pre-wrap text-[14px] text-slate-700">{expense.notes}</p>
                    </div>
                  )}

                  {expense.receiptPath && (
                    <div>
                      <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Receipt photo</p>
                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        className="flex w-full items-center gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-2.5 text-left transition-colors hover:bg-slate-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptUrl(expense.receiptPath)} alt="Expense receipt" className="h-14 w-14 rounded-lg object-cover" />
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-ink">View receipt photo</p>
                          <p className="text-xs text-slate-500">Tap to enlarge</p>
                        </div>
                      </button>
                    </div>
                  )}

                  <div>
                    <p className="mb-2 text-[12px] font-semibold uppercase tracking-[0.08em] text-slate-500">Split</p>
                    <ul className="divide-y divide-slate-100 rounded-2xl border border-slate-100">
                      {expense.userShareCents > 0 && (
                        <li className="flex items-center gap-3 px-3.5 py-3">
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-ink text-[11px] font-semibold text-white">You</span>
                          <div className="min-w-0 flex-1">
                            <p className="text-[14px] font-medium text-ink">You</p>
                            <p className="text-[12px] text-slate-500">Your own share</p>
                          </div>
                          <p className="tabular text-[14px] font-semibold text-slate-500">{formatPHP(expense.userShareCents)}</p>
                        </li>
                      )}
                      {expense.shares.map((s) => (
                        <li key={s.id} className="flex items-center gap-3 px-3.5 py-3">
                          <Avatar name={s.memberName} id={s.memberId} />
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-[14px] font-medium text-ink">{s.memberName}</p>
                            <p className="tabular text-[12px] text-slate-500">
                              {s.isPayer ? "Paid the bill" : `Share ${formatPHP(s.amountCents)} · paid ${formatPHP(s.paidCents)}`}
                            </p>
                          </div>
                          <div className="text-right">
                            <p className="tabular text-[14px] font-semibold text-ink">{formatPHP(Math.max(s.remainingCents, 0))}</p>
                            <StatusText status={s.status} className="justify-end" />
                          </div>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* ---------- sm+: original layout ---------- */}
                <div className="hidden space-y-5 sm:block">
                  <dl className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                    <Row label="Total">{formatPHP(expense.totalCents)}</Row>
                    <Row label="Category">
                      <Badge variant="outline">{expense.category}</Badge>
                    </Row>
                    <Row label="Paid the bill">{expense.paidByName ?? "You"}</Row>
                    <Row label="Status">
                      <StatusBadge status={expense.status} />
                    </Row>
                  </dl>
                  {expense.notes && (
                    <div>
                      <p className="text-xs text-muted-foreground">Notes</p>
                      <p className="mt-0.5 whitespace-pre-wrap text-sm">{expense.notes}</p>
                    </div>
                  )}
                  {expense.receiptPath && (
                    <div>
                      <p className="mb-1.5 text-xs text-muted-foreground">Receipt photo</p>
                      <button
                        type="button"
                        onClick={() => setViewerOpen(true)}
                        className="inline-flex items-center gap-3 rounded-lg border border-slate-200 bg-slate-50/70 p-2 pr-3.5 text-left transition-colors hover:bg-slate-100"
                      >
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={receiptUrl(expense.receiptPath)} alt="Expense receipt" className="h-12 w-12 rounded object-cover" />
                        <div>
                          <p className="flex items-center gap-1.5 text-xs font-medium text-slate-800">
                            <ImageIcon className="h-3.5 w-3.5" /> View receipt
                          </p>
                          <p className="text-[11px] text-slate-500">Click to zoom</p>
                        </div>
                      </button>
                    </div>
                  )}
                  <div className="rounded-lg border">
                    <Table>
                      <TableHeader>
                        <TableRow className="hover:bg-transparent">
                          <TableHead>Participant</TableHead>
                          <TableHead className="text-right">Share</TableHead>
                          <TableHead className="text-right">Paid</TableHead>
                          <TableHead className="text-right">Remaining</TableHead>
                          <TableHead className="hidden sm:table-cell">Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {expense.userShareCents > 0 && (
                          <TableRow>
                            <TableCell>
                              <span className="font-medium">You</span>
                              <span className="block text-xs text-muted-foreground">Your share</span>
                            </TableCell>
                            <TableCell className="text-right tabular">{formatPHP(expense.userShareCents)}</TableCell>
                            <TableCell className="text-right tabular">—</TableCell>
                            <TableCell className="text-right font-semibold tabular">{formatPHP(0)}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <StatusBadge status="settled" />
                            </TableCell>
                          </TableRow>
                        )}
                        {expense.shares.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell>
                              <span className="font-medium">{s.memberName}</span>
                              {s.isPayer && <span className="block text-xs text-muted-foreground">Paid the bill</span>}
                            </TableCell>
                            <TableCell className="text-right tabular">{formatPHP(s.amountCents)}</TableCell>
                            <TableCell className="text-right tabular">{formatPHP(s.paidCents)}</TableCell>
                            <TableCell className="text-right font-semibold tabular">{formatPHP(Math.max(s.remainingCents, 0))}</TableCell>
                            <TableCell className="hidden sm:table-cell">
                              <StatusBadge status={s.status} />
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                </div>
              </DialogBody>
              <DialogFooter>
                {onDelete && (
                  <Button type="button" variant="ghost" className="text-red-600 hover:bg-red-50 hover:text-red-700 sm:mr-auto" onClick={() => onDelete(expense)}>
                    <Trash2 /> Delete
                  </Button>
                )}
                {onDuplicate && (
                  <Button type="button" variant="outline" onClick={() => onDuplicate(expense)}>
                    <Copy /> Duplicate
                  </Button>
                )}
                <PdfExportButton
                  filename={`expense-${expense.description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "receipt"}-${expense.date}.pdf`}
                  shareTitle={`Expense: ${expense.description}`}
                  getPdfBytes={() => buildExpenseDetailPdf(expense)}
                />
                {onEdit && (
                  <Button type="button" onClick={() => onEdit(expense)}>
                    <Pencil /> Edit expense
                  </Button>
                )}
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      <ReceiptViewerDialog
        open={viewerOpen}
        onOpenChange={setViewerOpen}
        path={expense?.receiptPath}
        title={expense ? `Receipt · ${expense.description}` : "Receipt"}
        description={expense ? `${formatDateLong(expense.date)} · ${formatPHP(expense.totalCents)}` : ""}
      />
    </>
  );
}
