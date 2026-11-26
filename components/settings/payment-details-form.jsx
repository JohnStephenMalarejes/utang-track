"use client";

import { useState } from "react";
import { Loader2, Save } from "lucide-react";
import { savePaymentDetails } from "@/app/actions/settings";
import { useServerAction } from "@/hooks/use-server-action";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Field } from "@/components/ui/label";

export function PaymentDetailsForm({ initialValue = "" }) {
  const [value, setValue] = useState(initialValue);
  const [error, setError] = useState("");
  const { pending, run } = useServerAction();
  const dirty = value.trim() !== initialValue.trim();

  function handleSubmit(e) {
    e.preventDefault();
    setError("");
    run(() => savePaymentDetails({ payment_details: value }), {
      success: "Payment details saved",
      silentError: true,
      onError: (r) => setError(r.error),
    });
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-3">
      <Field
        label="GCash / Maya / Bank details"
        htmlFor="payment-details"
        hint="Automatically included when you copy a singil reminder, export a member statement PDF, or share a live statement link."
      >
        <Textarea
          id="payment-details"
          value={value}
          onChange={(e) => setValue(e.target.value)}
          rows={3}
          maxLength={1000}
          placeholder={"GCash: 0917-123-4567 (Juan Dela Cruz)\nMaya: 0917-123-4567"}
        />
      </Field>
      {error && (
        <p className="text-xs text-destructive" role="alert">
          {error}
        </p>
      )}
      <div className="flex justify-end">
        <Button type="submit" size="sm" disabled={pending || !dirty}>
          {pending ? <Loader2 className="animate-spin" /> : <Save />}
          Save details
        </Button>
      </div>
    </form>
  );
}
