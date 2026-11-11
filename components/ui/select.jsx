import * as React from "react";
import { ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

/** Native <select> styled like shadcn's Select: accessible by default and ideal on mobile. */
const Select = React.forwardRef(({ className, children, ...props }, ref) => (
  <div className="relative">
    <select ref={ref} className={cn(fieldBase, "h-9 appearance-none pl-3 pr-8 text-slate-900", className)} {...props}>
      {children}
    </select>
    <ChevronsUpDown className="pointer-events-none absolute right-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-500" aria-hidden="true" />
  </div>
));
Select.displayName = "Select";

export { Select };
