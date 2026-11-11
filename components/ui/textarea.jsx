import * as React from "react";
import { cn } from "@/lib/utils";
import { fieldBase } from "./input";

const Textarea = React.forwardRef(({ className, ...props }, ref) => (
  <textarea ref={ref} className={cn(fieldBase, "flex min-h-[76px] px-3 py-2", className)} {...props} />
));
Textarea.displayName = "Textarea";

export { Textarea };
