import { format, parseISO } from "date-fns";

/** Today's date as YYYY-MM-DD in the browser's local time zone. */
export function todayISO(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

/** "2025-03-09" -> "Mar 9, 2025" */
export function formatDate(iso) {
  if (!iso) return "—";
  return format(parseISO(iso), "MMM d, yyyy");
}

/** "2025-03-09" -> "Sunday, March 9" */
export function formatDateLong(iso) {
  if (!iso) return "—";
  return format(parseISO(iso), "EEEE, MMMM d, yyyy");
}
