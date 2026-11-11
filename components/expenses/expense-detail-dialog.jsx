"use client";

import { Badge } from "@/components/ui/badge";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { StatusBadge } from "@/components/layout/status-badge";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { buildExpenseDetailPdf, formatDateLong, formatPHP } from "@/lib/utils";

function Row({ label, children }) {
  return (
    <div>
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="mt-0.5 text-sm font-medium">{children}</dd>
    </div>
  );
}

export function ExpenseDetailDialog({ expense, onOpenChange }) {
  return (
    <Dialog open={Boolean(expense)} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        {expense && (
          <>
            <DialogHeader>
              <DialogTitle>{expense.description}</DialogTitle>
              <DialogDescription>{formatDateLong(expense.date)}</DialogDescription>
            </DialogHeader>
            <DialogBody className="space-y-5">
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
            </DialogBody>
            <DialogFooter>
              <PdfExportButton
                filename={`expense-${expense.description.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "receipt"}-${expense.date}.pdf`}
                shareTitle={`Expense: ${expense.description}`}
                getPdfBytes={() => buildExpenseDetailPdf(expense)}
              />
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
