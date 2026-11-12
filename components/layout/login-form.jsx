"use client";

import { useActionState } from "react";
import { Loader2 } from "lucide-react";
import { signIn } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Field } from "@/components/ui/label";

export function LoginForm() {
  const [state, action, pending] = useActionState(signIn, null);
  return (
    <form action={action} className="space-y-4" noValidate>
      <Field label="Email" htmlFor="email">
        <Input id="email" name="email" type="email" autoComplete="username" required aria-invalid={Boolean(state?.error)} />
      </Field>
      <Field label="Password" htmlFor="password" error={state?.error}>
        <Input id="password" name="password" type="password" autoComplete="current-password" required aria-invalid={Boolean(state?.error)} />
      </Field>
      <Button type="submit" className="h-11 w-full rounded-xl bg-ink text-[15px] font-semibold sm:h-9 sm:rounded-md sm:bg-slate-900 sm:text-[13px]" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        Sign in
      </Button>
    </form>
  );
}
