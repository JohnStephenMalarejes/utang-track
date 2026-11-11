import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/constants";

const VARIANT = { unsettled: "danger", partial: "warning", settled: "success", none: "muted" };

export function StatusBadge({ status }) {
  return <Badge variant={VARIANT[status] ?? "muted"}>{STATUS_LABELS[status] ?? status}</Badge>;
}
