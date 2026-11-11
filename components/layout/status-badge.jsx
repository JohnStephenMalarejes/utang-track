import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";
import { cn } from "@/lib/utils";

const VARIANT = { unsettled: "danger", partial: "warning", settled: "success", none: "muted" };
const DOT = { unsettled: "bg-red-600", partial: "bg-amber-600", settled: "bg-emerald-600", none: "bg-slate-400" };

export function StatusBadge({ status }) {
  return (
    <Badge variant={VARIANT[status] ?? "muted"}>
      <span className={cn("h-1.5 w-1.5 rounded-full", DOT[status] ?? "bg-slate-400")} aria-hidden="true" />
      {STATUS_LABELS[status] ?? status}
    </Badge>
  );
}
