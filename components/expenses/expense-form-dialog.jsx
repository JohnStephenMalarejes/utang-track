"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AlertTriangle, Loader2 } from "lucide-react";
import { saveExpense } from "@/app/actions/expenses";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input, MoneyInput } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select } from "@/components/ui/select";
import { Field } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { CATEGORIES } from "@/lib/constants";
import { centsToDecimal, cn, formatPHP, parseAmount, splitEqual, sumCents, todayISO } from "@/lib/utils";

const blank = () => ({
  description: "",
  category: "Lunch",
  total: "",
  date: todayISO(),
  paidBy: "",
  notes: "",
  mode: "equal",
  includeUser: true,
  userCustom: "",
  selected: {},
  custom: {},
});

/** Rebuild the form state from an existing expense. */
function fromExpense(expense, members) {
  const selected = {};
  const custom = {};
  for (const s of expense.shares) {
    selected[s.memberId] = true;
    custom[s.memberId] = centsToDecimal(s.amountCents);
  }
  const ordered = members.filter((m) => selected[m.id]);
  const includeUser = (expense.userShareCents ?? 0) > 0;
  const splitCount = ordered.length + (includeUser ? 1 : 0);
  // Is it an equal split? Compare against what "equal" would produce for the same people.
  const equal = splitEqual(expense.totalCents, splitCount);
  const isEqual =
    ordered.length > 0 &&
    ordered.every((m, i) => expense.shares.find((s) => s.memberId === m.id)?.amountCents === equal[i + (includeUser ? 1 : 0)]);
  return {
    description: expense.description,
    category: expense.category,
    total: centsToDecimal(expense.totalCents),
    date: expense.date,
    paidBy: expense.paidBy ?? "",
    notes: expense.notes,
    mode: isEqual ? "equal" : "custom",
    includeUser,
    userCustom: includeUser ? centsToDecimal(expense.userShareCents) : "",
    selected,
    custom,
  };
}

export function ExpenseFormDialog({ open, onOpenChange, ledger, expense }) {
  const editing = Boolean(expense);
  const { members } = ledger;
  const [form, setForm] = useState(blank);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (open) {
      setForm(expense ? fromExpense(expense, members) : blank());
      setError("");
      setSubmitted(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, expense?.id]);

  const update = (patch) => setForm((f) => ({ ...f, ...patch }));

  const participants = useMemo(() => members.filter((m) => form.selected[m.id]), [members, form.selected]);
  const splitCount = participants.length + (form.includeUser ? 1 : 0);
  const totalCents = parseAmount(form.total);

  // Per-person amounts in cents (null = not a valid amount yet)
  const { shareCents, userShareCents } = useMemo(() => {
    const out = {};
    let userCents = 0;
    if (form.mode === "equal") {
      const parts = totalCents && splitCount > 0 ? splitEqual(totalCents, splitCount) : [];
      userCents = form.includeUser ? (parts[0] ?? null) : 0;
      participants.forEach((m, i) => (out[m.id] = parts[i + (form.includeUser ? 1 : 0)] ?? null));
    } else {
      userCents = form.includeUser ? parseAmount(form.userCustom) : 0;
      participants.forEach((m) => (out[m.id] = parseAmount(form.custom[m.id])));
    }
    return { shareCents: out, userShareCents: userCents };
  }, [form.mode, form.custom, form.includeUser, form.userCustom, participants, splitCount, totalCents]);

  const allMembersValid = participants.length > 0 && participants.every((m) => shareCents[m.id] !== null && shareCents[m.id] > 0);
  const userValid = !form.includeUser || (userShareCents !== null && userShareCents > 0);
  const allValid = allMembersValid && userValid;
  const sharesTotal = (form.includeUser ? (userShareCents ?? 0) : 0) + sumCents(participants.map((m) => shareCents[m.id] ?? 0));
  const diff = totalCents ? totalCents - sharesTotal : 0;
  const mismatch = form.mode === "custom" && totalCents !== null && participants.length > 0 && diff !== 0;

  function toggle(id, checked) {
    update({
      selected: { ...form.selected, [id]: checked },
      // keep any amount already typed; only seed a blank one so nothing the user typed is overwritten
      custom: checked && form.custom[id] === undefined ? { ...form.custom, [id]: "" } : form.custom,
    });
  }

  function switchMode(mode) {
    if (mode === "custom" && form.mode === "equal") {
      // Start custom from the current equal split so the user edits from sensible numbers (explicit, user-triggered).
      const custom = { ...form.custom };
      participants.forEach((m) => {
        if (shareCents[m.id] !== null && shareCents[m.id] !== undefined) custom[m.id] = centsToDecimal(shareCents[m.id]);
      });
      const userCustom =
        form.includeUser && userShareCents !== null && userShareCents !== undefined ? centsToDecimal(userShareCents) : form.userCustom;
      update({ mode, custom, userCustom });
    } else {
      update({ mode });
    }
  }

  function validate() {
    if (!form.description.trim()) return "Enter a description";
    if (!form.date) return "Select the expense date";
    if (totalCents === null || totalCents <= 0) return "Enter a total amount above ₱0.00 with at most 2 decimals";
    if (participants.length === 0) return "Select at least one participant";
    if (!allValid) return form.mode === "equal" ? "The total is too small to give everyone at least ₱0.01" : "Every participant needs an amount above ₱0.00";
    if (form.mode === "custom" && diff !== 0) return `The shares are ${formatPHP(Math.abs(diff))} ${diff > 0 ? "short of" : "over"} the total`;
    return "";
  }

  function submit(e) {
    e.preventDefault();
    setSubmitted(true);
    const problem = validate();
    if (problem) return setError(problem);
    setError("");
    run(
      () =>
        saveExpense({
          id: expense?.id,
          description: form.description,
          category: form.category,
          total_amount: centsToDecimal(totalCents),
          expense_date: form.date,
          paid_by: form.paidBy,
          notes: form.notes,
          shares: participants.map((m) => ({ member_id: m.id, share_amount: centsToDecimal(shareCents[m.id]) })),
        }),
      {
        success: editing ? "Expense updated" : "Expense added",
        onSuccess: () => onOpenChange(false),
        silentError: true,
        onError: (r) => setError(r.error),
      }
    );
  }


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent size="lg">
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit expense" : "Add expense"}</DialogTitle>
            <DialogDescription>Record a bill and decide who owes what.</DialogDescription>
          </DialogHeader>

          <DialogBody className="space-y-5">
            {members.length === 0 ? (
              <p className="rounded-md bg-muted px-3 py-2.5 text-sm text-muted-foreground">
                You need at least one member before you can record an expense.{" "}
                <Link href="/members?new=1" className="font-medium text-accent-strong underline">
                  Add a member
                </Link>
              </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Description" htmlFor="exp-desc" className="sm:col-span-2">
                <Input
                  id="exp-desc"
                  value={form.description}
                  onChange={(e) => update({ description: e.target.value })}
                  maxLength={200}
                  placeholder="e.g. Chicken inasal at Mang Inasal"
                  aria-invalid={submitted && !form.description.trim()}
                />
              </Field>
              <Field label="Date" htmlFor="exp-date">
                <Input id="exp-date" type="date" value={form.date} onChange={(e) => update({ date: e.target.value })} />
              </Field>
              <Field label="Category" htmlFor="exp-cat">
                <Select id="exp-cat" value={form.category} onChange={(e) => update({ category: e.target.value })}>
                  {CATEGORIES.map((c) => (
                    <option key={c}>{c}</option>
                  ))}
                </Select>
              </Field>
              <Field label="Total amount" htmlFor="exp-total">
                <MoneyInput id="exp-total" value={form.total} onChange={(e) => update({ total: e.target.value })} aria-invalid={submitted && !totalCents} />
              </Field>
              <Field label="Who paid the original bill?" htmlFor="exp-paid" hint="Pick “You” if you paid the bill yourself">
                <Select id="exp-paid" value={form.paidBy} onChange={(e) => update({ paidBy: e.target.value })}>
                  <option value="">You (Administrator)</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.name}
                    </option>
                  ))}
                </Select>
              </Field>
            </div>

            {members.length > 0 && (
              <fieldset className="space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <legend className="text-[13px] font-medium">Participants and shares</legend>
                  <div className="inline-flex rounded-md border bg-muted p-0.5" role="group" aria-label="Splitting method">
                    {[
                      ["equal", "Equal split"],
                      ["custom", "Custom split"],
                    ].map(([value, label]) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={form.mode === value}
                        onClick={() => switchMode(value)}
                        className={cn(
                          "rounded px-3 py-1 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
                          form.mode === value ? "bg-card text-foreground shadow-sm" : "text-muted-foreground hover:text-foreground"
                        )}
                      >
                        {label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 text-xs">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2"
                    onClick={() => update({ includeUser: true, selected: Object.fromEntries(members.map((m) => [m.id, true])) })}
                  >
                    Select all
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 px-2" onClick={() => update({ selected: {} })}>
                    Clear
                  </Button>
                </div>

                <ul className="divide-y rounded-lg border">
                  <li className="flex items-center justify-between gap-3 bg-muted/30 px-3 py-2">
                    <div className="flex min-w-0 items-center gap-2.5">
                      <Checkbox
                        id="part-user"
                        checked={Boolean(form.includeUser)}
                        onCheckedChange={(v) =>
                          update({
                            includeUser: v === true,
                            userCustom: v === true && !form.userCustom ? "" : form.userCustom,
                          })
                        }
                      />
                      <label htmlFor="part-user" className="min-w-0 cursor-pointer text-sm">
                        <span className="block truncate font-medium">You</span>
                        {form.includeUser && <span className="block text-xs text-muted-foreground">Included in split (your share isn't owed)</span>}
                      </label>
                    </div>
                    {form.includeUser &&
                      (form.mode === "equal" ? (
                        <span className="text-sm font-medium tabular">{userShareCents ? formatPHP(userShareCents) : "—"}</span>
                      ) : (
                        <div className="w-36">
                          <MoneyInput
                            aria-label="Share for You"
                            value={form.userCustom ?? ""}
                            onChange={(e) => update({ userCustom: e.target.value })}
                            aria-invalid={submitted && (userShareCents === null || userShareCents <= 0)}
                            className="h-8"
                          />
                        </div>
                      ))}
                  </li>
                  {members.map((m) => {
                    const checked = Boolean(form.selected[m.id]);
                    const cents = shareCents[m.id];
                    return (
                      <li key={m.id} className="flex items-center justify-between gap-3 px-3 py-2">
                        <div className="flex min-w-0 items-center gap-2.5">
                          <Checkbox id={`part-${m.id}`} checked={checked} onCheckedChange={(v) => toggle(m.id, v === true)} />
                          <label htmlFor={`part-${m.id}`} className="min-w-0 cursor-pointer text-sm">
                            <span className="block truncate font-medium">{m.name}</span>
                            {form.paidBy === m.id && checked && <span className="block text-xs text-muted-foreground">Paid the bill, so this share isn't owed</span>}
                          </label>
                        </div>
                        {checked &&
                          (form.mode === "equal" ? (
                            <span className="text-sm font-medium tabular">{cents ? formatPHP(cents) : "—"}</span>
                          ) : (
                            <div className="w-36">
                              <MoneyInput
                                aria-label={`Share for ${m.name}`}
                                value={form.custom[m.id] ?? ""}
                                onChange={(e) => update({ custom: { ...form.custom, [m.id]: e.target.value } })}
                                aria-invalid={submitted && (cents === null || cents <= 0)}
                                className="h-8"
                              />
                            </div>
                          ))}
                      </li>
                    );
                  })}
                </ul>

                {mismatch && (
                  <div className="flex items-start gap-2 rounded-md border border-warning/30 bg-warning-soft px-3 py-2.5 text-sm text-warning" role="alert">
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                    <div>
                      <p className="font-medium">
                        Shares add up to {formatPHP(sharesTotal)}, but the total is {formatPHP(totalCents)}.
                      </p>
                      <p className="mt-0.5">
                        {diff > 0 ? `${formatPHP(diff)} is not assigned to anyone.` : `The shares are ${formatPHP(-diff)} over.`} Your amounts are left as you typed them.
                      </p>
                      <button type="button" className="mt-1 font-medium underline" onClick={() => update({ mode: "equal" })}>
                        Switch back to equal split
                      </button>
                    </div>
                  </div>
                )}
                {form.mode === "custom" && !mismatch && participants.length > 0 && totalCents > 0 && allValid && (
                  <p className="text-xs text-muted-foreground">Shares add up to the total.</p>
                )}

              </fieldset>
            )}

            <Field label="Notes (optional)" htmlFor="exp-notes">
              <Textarea id="exp-notes" value={form.notes} onChange={(e) => update({ notes: e.target.value })} maxLength={1000} />
            </Field>

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
            <Button type="submit" disabled={pending || members.length === 0}>
              {pending && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Add expense"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
