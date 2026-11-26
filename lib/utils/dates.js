import { format, parseISO } from "date-fns";

const MAX_CACHE = 400;
const dateCache = new Map();
const longDateCache = new Map();

function memo(cache, key, compute) {
  const hit = cache.get(key);
  if (hit !== undefined) return hit;
  const val = compute();
  if (cache.size >= MAX_CACHE) cache.clear();
  cache.set(key, val);
  return val;
}

/** Today's date as YYYY-MM-DD in the browser's local time zone. */
export function todayISO(now = new Date()) {
  return format(now, "yyyy-MM-dd");
}

/** "2025-03-09" -> "Mar 9, 2025" */
export function formatDate(iso) {
  if (!iso) return "—";
  return memo(dateCache, iso, () => format(parseISO(iso), "MMM d, yyyy"));
}

/** "2025-03-09" -> "Sunday, March 9, 2025" */
export function formatDateLong(iso) {
  if (!iso) return "—";
  return memo(longDateCache, iso, () => format(parseISO(iso), "EEEE, MMMM d, yyyy"));
}
