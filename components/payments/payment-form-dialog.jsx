"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Loader2 } from "lucide-react";
import { savePayment } from "@/app/actions/payments";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, MoneyInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field, Label } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { centsToDecimal, formatDate, formatPHP, parseAmount, todayISO } from "@/lib/utils";

/**
 * Record or edit a payment.
 *  - payment: existing payment (edit mode)
 *  - preset : { memberId, shareId } to pre-select a member / expense
 */
export function PaymentFormDialog({ open, onOpenChange, ledger, payment, preset }) {
  const editing = Boolean(payment);
  const [memberId, setMemberId] = useState("");
  const [shareId, setShareId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayISO());
  const [notes, setNotes] = useState("");
  const [confirmOver, setConfirmOver] = useState(false);
  const [error, setError] = useState("");
  const { pending, run } = useServerAction();

  // Money available to pay on a share. When editing, the payment being edited doesn't count against itself.
  const availableFor = (share) => share.remainingCents + (editing && share.id === payment.shareId ? payment.amountCents : 0);
  const payable = (share) => !share.isPayer && (availableFor(share) > 0 || (editing && share.id === payment.shareId));

  const memberOptions = useMemo(() => {
    const ids = new Set(ledger.shares.filter(payable).map((s) => s.memberId));
    return ledger.members.filter((m) => ids.has(m.id));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ledger, payment]);

  const shareOptions = useMemo(
    () => ledger.shares.filter((s) => s.memberId === memberId && payable(s)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [ledger, memberId, payment]
  );

  const share = shareOptions.find((s) => s.id === shareId);
  const available = share ? availableFor(share) : 0;
  const amountCents = parseAmount(amount);
  const overpays = share && amountCents !== null && amountCents > available;

  useEffect(() => {
    if (!open) return;
    setError("");
    setConfirmOver(false);
    if (payment) {
      setMemberId(payment.memberId);
      setShareId(payment.shareId);
      setAmount(centsToDecimal(payment.amountCents));
      setDate(payment.date);
      setNotes(payment.notes);
      return;
    }
    const presetShare = preset?.shareId ? ledger.shares.find((s) => s.id === preset.shareId) : null;
    const m = presetShare?.memberId ?? preset?.memberId ?? "";
    setMemberId(m);
    setShareId(presetShare?.id ?? "");
    setAmount(presetShare && presetShare.remainingCents > 0 ? centsToDecimal(presetShare.remainingCents) : "");
    setDate(todayISO());
    setNotes("");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, payment?.id, preset?.memberId, preset?.shareId]);

  function pickMember(id) {
    setMemberId(id);
    setShareId("");
    setAmount("");
    setConfirmOver(false);
  }

  function pickShare(id) {
    setShareId(id);
    setConfirmOver(false);
    const s = ledger.shares.find((x) => x.id === id);
    if (s) {
      const avail = availableFor(s);
      setAmount(avail > 0 ? centsToDecimal(avail) : "");
    }
  }

  function submit(e) {
    e.preventDefault();
    if (!memberId) return setError("Select who is paying");
    if (!shareId) return setError("Select which expense is being paid");
    if (amountCents === null || amountCents <= 0) return setError("Enter an amount above ₱0.00 with at most 2 decimals");
    if (!date) return setError("Select the payment date");
    if (overpays && !confirmOver) return setError("This is more than the remaining balance. Tick the confirmation box to continue.");
    setError("");
    run(
      () =>
        savePayment({
          id: payment?.id,
          member_id: memberId,
          expense_share_id: shareId,
          amount,
          payment_date: date,
          notes,
          confirmOverpay: Boolean(overpays && confirmOver),
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
            <DialogDescription>Partial payments are fine. The balance updates right away.</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            {memberOptions.length === 0 && !editing ? (
              <p className="rounded-md bg-muted px-3 py-2 text-sm text-muted-foreground">Nobody owes anything right now, so there's nothing to pay.</p>
            ) : (
              <>
                <Field label="Member" htmlFor="pay-member">
                  <Select id="pay-member" value={memberId} onChange={(e) => pickMember(e.target.value)} disabled={editing}>
                    <option value="">Select a member</option>
                    {memberOptions.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name} — owes {formatPHP(Math.max(m.balanceCents, 0))}
                      </option>
                    ))}
                  </Select>
                </Field>

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

                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Amount" htmlFor="pay-amount" hint={share ? `Remaining: ${formatPHP(Math.max(available, 0))}` : undefined}>
                    <MoneyInput id="pay-amount" value={amount} onChange={(e) => setAmount(e.target.value)} />
                  </Field>
                  <Field label="Payment date" htmlFor="pay-date">
                    <Input id="pay-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
                  </Field>
                </div>

                {share && available > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="-mt-2 h-7 px-2" onClick={() => setAmount(centsToDecimal(available))}>
                    Pay full balance ({formatPHP(available)})
                  </Button>
                )}

                {overpays && (
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
            <Button type="submit" disabled={pending || (memberOptions.length === 0 && !editing)}>
              {pending && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Record payment"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
