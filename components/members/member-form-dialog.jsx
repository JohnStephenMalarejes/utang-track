"use client";

import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";
import { saveMember } from "@/app/actions/members";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/label";
import { Dialog, DialogBody, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export function MemberFormDialog({ open, onOpenChange, member }) {
  const editing = Boolean(member);
  const [form, setForm] = useState({ name: "", contact: "", notes: "" });
  const [error, setError] = useState("");
  const { pending, run } = useServerAction();

  useEffect(() => {
    if (open) {
      setForm({ name: member?.name ?? "", contact: member?.contact ?? "", notes: member?.notes ?? "" });
      setError("");
    }
  }, [open, member]);

  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  function submit(e) {
    e.preventDefault();
    if (!form.name.trim()) return setError("Enter the member's name");
    setError("");
    run(() => saveMember({ id: member?.id, ...form }), {
      success: editing ? "Member updated" : "Member added",
      onSuccess: () => onOpenChange(false),
      silentError: true,
      onError: (r) => setError(r.error),
    });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <form onSubmit={submit} noValidate className="flex min-h-0 flex-1 flex-col">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit member" : "Add member"}</DialogTitle>
            <DialogDescription>{editing ? "Update this person's details." : "Add someone you share expenses with."}</DialogDescription>
          </DialogHeader>
          <DialogBody className="space-y-4">
            <Field label="Full name" htmlFor="member-name" error={error}>
              <Input id="member-name" value={form.name} onChange={set("name")} maxLength={120} autoFocus aria-invalid={Boolean(error)} />
            </Field>
            <Field label="Contact (optional)" htmlFor="member-contact" hint="Phone number, email or messenger handle">
              <Input id="member-contact" value={form.contact} onChange={set("contact")} maxLength={200} />
            </Field>
            <Field label="Notes (optional)" htmlFor="member-notes">
              <Textarea id="member-notes" value={form.notes} onChange={set("notes")} maxLength={1000} />
            </Field>
          </DialogBody>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}
              {editing ? "Save changes" : "Add member"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
