import * as React from "react";
import { cn } from "@/lib/utils";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input
    type={type}
    ref={ref}
    className={cn(
      "flex h-9 w-full rounded-md border border-input bg-card px-3 py-1 text-sm shadow-sm transition-colors placeholder:text-muted-foreground/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 aria-[invalid=true]:border-destructive",
      className
    )}
    {...props}
  />
));
Input.displayName = "Input";

/** Peso amount field. Keeps raw text so nothing is rounded while typing; parsing happens at submit. */
const MoneyInput = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-sm text-muted-foreground">₱</span>
    <Input ref={ref} inputMode="decimal" autoComplete="off" placeholder="0.00" className={cn("pl-7 tabular-nums", className)} {...props} />
  </div>
));
MoneyInput.displayName = "MoneyInput";

export { Input, MoneyInput };
