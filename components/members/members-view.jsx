"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Pencil, Plus, Search, Trash2, Users } from "lucide-react";
import { toast } from "sonner";
import { deleteMember } from "@/app/actions/members";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { PageHeader } from "@/components/layout/page-header";
import { EmptyState } from "@/components/layout/empty-state";
import { StatusBadge } from "@/components/layout/status-badge";
import { Pagination } from "@/components/layout/pagination";
import { PdfExportButton } from "@/components/layout/pdf-export-button";
import { MemberFormDialog } from "./member-form-dialog";
import { PAGE_SIZE } from "@/lib/constants";
import { buildLedgerPdf, formatDate, formatPHP, todayISO } from "@/lib/utils";

export function MembersView({ ledger, initialOpen = false }) {
  const { members } = ledger;
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [formOpen, setFormOpen] = useState(initialOpen);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const { pending, run } = useServerAction();

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? members.filter((m) => `${m.name} ${m.contact} ${m.notes}`.toLowerCase().includes(q)) : members;
  }, [members, query]);

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(page, pageCount);
  const rows = filtered.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  function openForm(member = null) {
    setEditing(member);
    setFormOpen(true);
  }

  function askDelete(member) {
    if (member.expenseCount > 0 || member.paymentCount > 0) {
      toast.error(
        `${member.name} has ${member.expenseCount} expense ${member.expenseCount === 1 ? "share" : "shares"} and ${member.paymentCount} ${
          member.paymentCount === 1 ? "payment" : "payments"
        } on record. Remove those first.`
      );
      return;
    }
    setToDelete(member);
  }

  return (
    <>
      <PageHeader title="Members" description="The people you share expenses with.">
        {filtered.length > 0 && (
          <PdfExportButton
            filename={`utang-tracker-members-${todayISO()}.pdf`}
            shareTitle="Utang Tracker Member Balances"
            getPdfBytes={() =>
              buildLedgerPdf({
                title: "Member Balances",
                members: filtered,
                expenses: ledger.expenses,
                payments: ledger.payments,
                includeExpenses: false,
                includePayments: false,
              })
            }
          />
        )}
        <Button onClick={() => openForm()}>
          <Plus /> Add member
        </Button>
      </PageHeader>

      <Card>
        {members.length === 0 ? (
          <EmptyState icon={Users} title="No members yet" description="Add the friends you split bills with. Everyone you add here can be chosen as a participant in an expense.">
            <Button onClick={() => openForm()}>
              <Plus /> Add First Member
            </Button>
          </EmptyState>
        ) : (
          <>
            <div className="border-b p-4">
              <div className="relative max-w-sm">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={query}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    setPage(1);
                  }}
                  placeholder="Search members"
                  aria-label="Search members"
                  className="pl-9"
                />
              </div>
            </div>
            {filtered.length === 0 ? (
              <EmptyState icon={Search} title="No matching members" description="Try a different name or clear the search." />
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent">
                    <TableHead>Name</TableHead>
                    <TableHead className="hidden lg:table-cell">Added</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Assigned</TableHead>
                    <TableHead className="hidden sm:table-cell text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="hidden md:table-cell">Status</TableHead>
                    <TableHead className="w-24 text-right">
                      <span className="sr-only">Actions</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((m) => (
                    <TableRow key={m.id}>
                      <TableCell>
                        <Link href={`/members/${m.id}`} className="font-medium hover:text-accent-strong hover:underline">
                          {m.name}
                        </Link>
                        {m.contact && <p className="text-xs text-muted-foreground">{m.contact}</p>}
                      </TableCell>
                      <TableCell className="hidden text-muted-foreground lg:table-cell">{formatDate(m.createdAt?.slice(0, 10))}</TableCell>
                      <TableCell className="hidden text-right tabular sm:table-cell">{formatPHP(m.assignedCents)}</TableCell>
                      <TableCell className="hidden text-right tabular sm:table-cell">{formatPHP(m.paidCents)}</TableCell>
                      <TableCell className="text-right font-semibold tabular">{formatPHP(m.balanceCents)}</TableCell>
                      <TableCell className="hidden md:table-cell">
                        <StatusBadge status={m.status} />
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          <Button variant="ghost" size="icon" aria-label={`Edit ${m.name}`} onClick={() => openForm(m)}>
                            <Pencil />
                          </Button>
                          <Button variant="ghost" size="icon" aria-label={`Delete ${m.name}`} onClick={() => askDelete(m)}>
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
          </>
        )}
      </Card>

      <MemberFormDialog open={formOpen} onOpenChange={setFormOpen} member={editing} />

      <ConfirmDialog
        open={Boolean(toDelete)}
        onOpenChange={(o) => !o && setToDelete(null)}
        title={`Delete ${toDelete?.name}?`}
        description="This permanently removes the member. This can't be undone."
        confirmLabel="Delete member"
        destructive
        loading={pending}
        onConfirm={() => run(() => deleteMember(toDelete.id), { success: "Member deleted", onSuccess: () => setToDelete(null) })}
      />
    </>
  );
}
