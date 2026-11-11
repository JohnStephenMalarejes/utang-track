"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { buildLedgerPdf, centsToDecimal, todayISO } from "@/lib/utils";

/** Downloads a plain JSON backup of everything, generated in the browser from the data already on the page. */
export function ExportButton({ ledger }) {
  function download() {
    const backup = {
      exportedAt: new Date().toISOString(),
      currency: "PHP",
      members: ledger.members.map(({ id, name, contact, notes, createdAt }) => ({ id, name, contact, notes, createdAt })),
      expenses: ledger.expenses.map((e) => ({
        id: e.id,
        date: e.date,
        description: e.description,
        category: e.category,
        total: centsToDecimal(e.totalCents),
        paidBy: e.paidByName,
        notes: e.notes,
        shares: e.shares.map((s) => ({ member: s.memberName, share: centsToDecimal(s.amountCents), paid: centsToDecimal(s.paidCents) })),
      })),
      payments: ledger.payments.map((p) => ({
        id: p.id,
        date: p.date,
        member: p.memberName,
        expense: p.expenseDescription,
        amount: centsToDecimal(p.amountCents),
        notes: p.notes,
      })),
    };
    const url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = `utang-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <PdfExportButton
        label="Export PDF report"
        filename={`utang-tracker-report-${todayISO()}.pdf`}
        shareTitle="Utang Tracker Full Report"
        getPdfBytes={() =>
          buildLedgerPdf({
            title: "Utang Tracker Full Ledger",
            members: ledger.members,
            expenses: ledger.expenses,
            payments: ledger.payments,
          })
        }
      />
      <Button variant="outline" onClick={download}>
        <Download /> Download JSON backup
      </Button>
    </div>
  );
}
