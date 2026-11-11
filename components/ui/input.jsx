import * as React from "react";
import { cn } from "@/lib/utils";

const fieldBase =
  "w-full rounded-md border border-slate-300 bg-white text-[13.5px] text-slate-900 shadow-sm transition-colors duration-150 placeholder:text-slate-400 hover:border-slate-400 focus-visible:border-teal-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-teal-600/20 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-500 aria-[invalid=true]:border-red-600 aria-[invalid=true]:focus-visible:ring-red-600/20";

const Input = React.forwardRef(({ className, type, ...props }, ref) => (
  <input type={type} ref={ref} className={cn(fieldBase, "flex h-9 px-3 py-1", className)} {...props} />
));
Input.displayName = "Input";

/** Peso amount field. Keeps raw text so nothing is rounded while typing; parsing happens at submit. */
const MoneyInput = React.forwardRef(({ className, ...props }, ref) => (
  <div className="relative">
    <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-[13px] font-medium text-slate-500">₱</span>
    <Input ref={ref} inputMode="decimal" autoComplete="off" placeholder="0.00" className={cn("tabular pl-7", className)} {...props} />
  </div>
));
MoneyInput.displayName = "MoneyInput";

export { Input, MoneyInput, fieldBase };
