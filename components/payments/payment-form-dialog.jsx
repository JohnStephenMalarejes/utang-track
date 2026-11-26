"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, CheckCheck, Loader2 } from "lucide-react";
import { payAllMemberUtang, savePayment } from "@/app/actions/payments";
import { allocateMemberPayment } from "@/lib/calculations/ledger";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, MoneyInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field, Label } from "@/components/ui/label";
import { ReceiptUpload } from "@/components/ui/receipt-upload";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { PAYMENT_METHODS } from "@/lib/constants";
import { centsToDecimal, cn, formatDate, formatPHP, parseAmount, sumCents, todayISO } from "@/lib/utils";

/**
 * Record or edit a payment.
 *  - payment: existing payment (edit mode)
 *  - preset : { memberId, shareId, payAll } to pre-select a member / expense / pay-all mode
 */
export function PaymentFormDialog({ open, onOpenChange, ledger, payment, preset }) {
  const editing = Boolean(payment);
  const [mode, setMode] = useState("all"); // "all" = pay all utang for member, "single" = one expense
  const [memberId, setMemberId] = useState("");
  const [shareId, setShareId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [method, setMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [receiptPath, setReceiptPath] = useState(null);
  const [confirmOver, setConfirmOver] = useState(false);
  const [error, setError] = useState("");
  const { pending, run } = useServerAction();

  // Money available to pay on a share. When editing, the payment being edited doesn't count against itself.
  const availableFor = (share) => share.remainingCents + (editing && share.id === payment.shareId ? payment.amountCents : 0);
  const payable = (share) => !share.isPayer && (availableFor(share) > 0 || (editing && share.id === payment.shareId));

  const memberUnpaidSummary = useMemo(() => {
    const map = new Map();
    if (!open) return map;
    for (const s of ledger.shares) {
      if (!payable(s)) continue;
      const prev = map.get(s.memberId) ?? { count: 0, totalCents: 0 };
      prev.count += 1;
      prev.totalCents += Math.max(availableFor(s), 0);
      map.set(s.memberId, prev);
    }
    return map;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, ledger, payment]);

  const memberOptions = useMemo(
    () => (open ? ledger.members.filter((m) => memberUnpaidSummary.has(m.id)) : []),
    [open, ledger.members, memberUnpaidSummary]
  );

  const shareOptions = useMemo(
    () =>
      open && memberId
        ? ledger.shares
            .filter((s) => s.memberId === memberId && payable(s))
            .sort((a, b) => {
              const dateCmp = String(a.expenseDate ?? "").localeCompare(String(b.expenseDate ?? ""));
              return dateCmp !== 0 ? dateCmp : String(a.id ?? "").localeCompare(String(b.id ?? ""));
            })
        : [],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [open, ledger, memberId, payment]
  );

  const isPayAll = !editing && mode === "all";
  const share = shareOptions.find((s) => s.id === shareId);
  const available = share ? availableFor(share) : 0;
  const totalMemberRemaining = useMemo(() => sumCents(shareOptions.map((s) => Math.max(s.remainingCents, 0))), [shareOptions]);
  const amountCents = parseAmount(amount);
  const overpaysSingle = !isPayAll && share && amountCents !== null && amountCents > available;
  const exceedsAllTotal = isPayAll && memberId && totalMemberRemaining > 0 && amountCents !== null && amountCents > totalMemberRemaining;

  const allocation = useMemo(() => {
    if (!isPayAll || !memberId) return { unpaid: [], allocations: [], allocatedCents: 0, totalRemainingCents: 0, excessCents: 0 };
    return allocateMemberPayment(shareOptions, amountCents ?? 0);
  }, [isPayAll, memberId, shareOptions, amountCents]);

  const allocationByShareId = useMemo(
    () => new Map(allocation.allocations.map((a) => [a.share.id, a])),
    [allocation.allocations]
  );

  useEffect(() => {
    if (!open) return;
    setError("");
    setConfirmOver(false);
    if (payment) {
      setMode("single");
      setMemberId(payment.memberId);
      setShareId(payment.shareId);
      setAmount(centsToDecimal(payment.amountCents));
      setDate(payment.date);
      setMethod(payment.paymentMethod || "Cash");
      setNotes(payment.notes);
      setReceiptPath(payment.receiptPath ?? null);
      return;
    }

    const presetShare = preset?.shareId ? ledger.shares.find((s) => s.id === preset.shareId) : null;
    const nextMode = presetShare ? "single" : preset?.payAll === false ? "single" : "all";
    const m = presetShare?.memberId ?? preset?.memberId ?? "";

    setMode(nextMode);
    setMemberId(m);
    setShareId(presetShare?.id ?? "");
    if (presetShare) {
      setAmount(presetShare.remainingCents > 0 ? centsToDecimal(presetShare.remainingCents) : "");
    } else if (m && nextMode === "all") {
      const mTotal = sumCents(ledger.shares.filter((s) => s.memberId === m && !s.isPayer && s.remainingCents > 0).map((s) => s.remainingCents));
      setAmount(mTotal > 0 ? centsToDecimal(mTotal) : "");
    } else {
      setAmount("");
    }
    setDate(todayISO());
    setMethod("Cash");
    setNotes("");
    setReceiptPath(null);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment?.id, preset?.memberId, preset?.shareId, preset?.payAll]);

  function pickMember(id) {
    setMemberId(id);
    setShareId("");
    setConfirmOver(false);
    setError("");
    if (isPayAll && id) {
      const summary = memberUnpaidSummary.get(id);
      setAmount(summary && summary.totalCents > 0 ? centsToDecimal(summary.totalCents) : "");
    } else {
      setAmount("");
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setConfirmOver(false);
    setError("");
    if (nextMode === "all") {
      setShareId("");
      setAmount(memberId && totalMemberRemaining > 0 ? centsToDecimal(totalMemberRemaining) : "");
    } else {
      setShareId("");
      setAmount("");
    }
  }

  function pickShare(id) {
    setShareId(id);
    setConfirmOver(false);
    setError("");
    const s = ledger.shares.find((x) => x.id === id);
    if (s) {
      const avail = availableFor(s);
      setAmount(avail > 0 ? centsToDecimal(avail) : "");
    } else {
      setAmount("");
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!memberId) return setError("Select who is paying");
    if (amountCents === null || amountCents <= 0) return setError("Enter an amount above ₱0.00 with at most 2 decimals");
    if (!date) return setError("Select the payment date");

    if (isPayAll) {
      if (shareOptions.length === 0) return setError("This member has no unpaid utang left.");
      if (amountCents > totalMemberRemaining) {
        return setError(
          `This exceeds the total unpaid balance of ${formatPHP(totalMemberRemaining)}. Enter up to ${formatPHP(totalMemberRemaining)} or switch to "One expense" to record an overpayment.`
        );
      }
      setError("");
      const selectedMember = memberOptions.find((m) => m.id === memberId);
      const affectedCount = allocation.allocations.length;
      const successMsg =
        amountCents === totalMemberRemaining
          ? `Paid all utang for ${selectedMember?.name ?? "member"} (${shareOptions.length} ${shareOptions.length === 1 ? "expense" : "expenses"})`
          : `Payment applied across ${affectedCount} ${affectedCount === 1 ? "expense" : "expenses"}`;

      run(
        () =>
          payAllMemberUtang({
            member_id: memberId,
            amount,
            payment_date: date,
            payment_method: method,
            notes,
            receipt_path: receiptPath,
          }),
        {
          success: successMsg,
          onSuccess: () => onOpenChange(false),
          silentError: true,
          onError: (r) => setError(r.error),
        }
      );
      return;
    }

    if (!shareId) return setError("Select which expense is being paid");
    if (overpaysSingle && !confirmOver) return setError("This is more than the remaining balance. Tick the confirmation box to continue.");
    setError("");
    run(
      () =>
        savePayment({
          id: payment?.id,
          member_id: memberId,
          expense_share_id: shareId,
          amount,
          payment_date: date,
          payment_method: method,
          notes,
          receipt_path: receiptPath,
          confirmOverpay: Boolean(overpaysSingle && confirmOver),
        }),
      {
        success: editing ? "Payment updated" : "Payment recorded",
        onSuccess: () => onOpenChange(false),
        silentError: true,
        onError: (r) => setError(r.error),
      }
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit payment" : "Record payment"}</DialogTitle>
            <DialogDescription>
              {editing
                ? "Partial payments are fine. The balance updates right away."
                : "Pay all unpaid utang of a person at once, or pick a single expense."}
            </DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {memberOptions.length === 0 && !editing ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Nobody owes anything right now, so there's nothing to pay.</p>
            ) : (
              <>
                <Field label="Member" htmlFor="pay-member">
                  <Select id="pay-member" value={memberId} onChange={(e) => pickMember(e.target.value)} disabled={editing}>
                    <option value="">Select a member</option>
                    {memberOptions.map((m) => {
                      const info = memberUnpaidSummary.get(m.id);
                      return (
                        <option key={m.id} value={m.id}>
                          {m.name} — {formatPHP(info?.totalCents ?? Math.max(m.balanceCents, 0))}
                          {!editing && info ? ` (${info.count} unpaid)` : ""}
                        </option>
                      );
                    })}
                  </Select>
                </Field>

                {!editing && (
                  <Field label="Payment option">
                    <div role="radiogroup" aria-label="Payment option" className="grid grid-cols-2 gap-1 rounded-lg bg-slate-100 p-1">
                      <button
                        type="button"
                        role="radio"
                        aria-checked={mode === "all"}
                        onClick={() => switchMode("all")}
                        className={cn(
                          "flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                          mode === "all" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        <CheckCheck className="h-3.5 w-3.5" />
                        Pay all utang
                      </button>
                      <button
                        type="button"
                        role="radio"
                        aria-checked={mode === "single"}
                        onClick={() => switchMode("single")}
                        className={cn(
                          "rounded-md px-3 py-2 text-[13px] font-medium transition-colors",
                          mode === "single" ? "bg-white text-slate-900 shadow-sm" : "text-slate-600 hover:text-slate-900"
                        )}
                      >
                        One expense
                      </button>
                    </div>
                  </Field>
                )}

                {isPayAll ? (
                  memberId && shareOptions.length > 0 ? (
                    <div className="rounded-lg border border-slate-200 bg-slate-50/70">
                      <div className="flex items-center justify-between border-b border-slate-200/80 px-3 py-2 text-xs">
                        <span className="font-medium text-slate-700">
                          {shareOptions.length} unpaid {shareOptions.length === 1 ? "expense" : "expenses"} (oldest first)
                        </span>
                        <span className="tabular font-semibold text-slate-900">Total {formatPHP(totalMemberRemaining)}</span>
                      </div>
                      <ul className="max-h-36 divide-y divide-slate-200/70 overflow-y-auto">
                        {shareOptions.map((s) => {
                          const alloc = allocationByShareId.get(s.id);
                          return (
                            <li key={s.id} className="flex items-center justify-between gap-3 px-3 py-2 text-xs">
                              <div className="min-w-0">
                                <p className="truncate font-medium text-slate-800">{s.expenseDescription}</p>
                                <p className="text-[11px] text-slate-500">
                                  {formatDate(s.expenseDate)} · {formatPHP(s.remainingCents)} left
                                </p>
                              </div>
                              <div className="shrink-0 text-right tabular">
                                {alloc ? (
                                  alloc.settlesShare ? (
                                    <span className="font-medium text-emerald-700">Settled ({formatPHP(alloc.amountCents)})</span>
                                  ) : (
                                    <span className="font-medium text-amber-700">Pays {formatPHP(alloc.amountCents)}</span>
                                  )
                                ) : (
                                  <span className="text-slate-400">Unpaid</span>
                                )}
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : (
                    <p className="rounded-md bg-slate-50 px-3 py-2 text-xs text-slate-500">
                      Select a member above to see all of their unpaid expenses and pay them in one go.
                    </p>
                  )
                ) : (
                  <Field label="Expense" htmlFor="pay-share">
                    <Select id="pay-share" value={shareId} onChange={(e) => pickShare(e.target.value)} disabled={!memberId || editing}>
                      <option value="">{memberId ? "Select an expense" : "Select a member first"}</option>
                      {shareOptions.map((s) => (
                        <option key={s.id} value={s.id}>
                          {formatDate(s.expenseDate)} · {s.expenseDescription} — {formatPHP(Math.max(availableFor(s), 0))} left
                        </option>
                      ))}
                    </Select>
                  </Field>
                )}

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    label="Amount"
                    htmlFor="pay-amount"
                    hint={
                      isPayAll
                        ? memberId && totalMemberRemaining > 0
                          ? `Total remaining: ${formatPHP(totalMemberRemaining)}`
                          : undefined
                        : share
                          ? `Remaining: ${formatPHP(Math.max(available, 0))}`
                          : undefined
                    }
                  >
                    <MoneyInput id="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </Field>
                  <Field label="Payment date" htmlFor="pay-date">
                    <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                </div>

                <Field label="Payment method" htmlFor="pay-method">
                  <Select id="pay-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                    {PAYMENT_METHODS.map((pm) => (
                      <option key={pm} value={pm}>
                        {pm}
                      </option>
                    ))}
                  </Select>
                </Field>

                {isPayAll && memberId && totalMemberRemaining > 0 && amountCents !== totalMemberRemaining && (
                  <Button type="button" variant="ghost" size="sm" className="-mt-2 h-7 px-2" onClick={() => setAmount(centsToDecimal(totalMemberRemaining))}>
                    Pay full total ({formatPHP(totalMemberRemaining)})
                  </Button>
                )}

                {!isPayAll && share && available > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="-mt-2 h-7 px-2" onClick={() => setAmount(centsToDecimal(available))}>
                    Pay full balance ({formatPHP(available)})
                  </Button>
                )}

                {exceedsAllTotal && (
                  <div className="rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning" role="alert">
                    <p className="flex items-start gap-2 font-medium">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      This is {formatPHP(amountCents - totalMemberRemaining)} more than their total unpaid balance. Enter up to{" "}
                      {formatPHP(totalMemberRemaining)}, or switch to “One expense” to record an overpayment.
                    </p>
                  </div>
                )}

                {overpaysSingle && (
                  <div className="space-y-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning" role="alert">
                    <p className="flex items-start gap-2 font-medium">
                      <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                      This is {formatPHP(amountCents - available)} more than the remaining balance.
                    </p>
                    <div className="flex items-center gap-2">
                      <Checkbox id="confirm-over" checked={confirmOver} onCheckedChange={(v) => setConfirmOver(v === true)} />
                      <Label htmlFor="confirm-over" className="text-warning">
                        Yes, record this overpayment
                      </Label>
                    </div>
                  </div>
                )}

                <Field label="Proof of payment (optional)">
                  <ReceiptUpload folder="payments" value={receiptPath} onChange={setReceiptPath} label="Attach GCash / transfer screenshot" />
                </Field>

                <Field label="Notes (optional)" htmlFor="pay-notes">
                  <Textarea id="pay-notes" value={notes} onChange={(e) => setNotes(e.target.value)} maxLength={1000} />
                </Field>
              </>
            )}
            {error && (
              <p className="text-sm text-destructive" role="alert">
                {error}
              </p>
            )}
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending || (memberOptions.length === 0 && !editing) || exceedsAllTotal}>
              {pending && <Loader2 className="animate-spin" />}
              {editing
                ? "Save changes"
                : isPayAll && memberId && amountCents === totalMemberRemaining && totalMemberRemaining > 0
                  ? "Pay all utang"
                  : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
