import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }) {
  return <div className={cn("animate-pulse rounded-md bg-border/60", className)} aria-hidden="true" {...props} />;
}

export { Skeleton };
