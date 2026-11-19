import { format, isToday, isYesterday, parseISO } from 'date-fns';

/** Today's date as YYYY-MM-DD in the device's local time zone. */
export function todayISO(now = new Date()): string {
  return format(now, 'yyyy-MM-dd');
}

/** "2025-03-09" -> "Mar 9, 2025" */
export function formatDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

/** "2025-03-09" -> "Sunday, March 9, 2025" */
export function formatDateLong(iso?: string | null): string {
  if (!iso) return '—';
  try {
    return format(parseISO(iso), 'EEEE, MMMM d, yyyy');
  } catch {
    return iso;
  }
}

/** "Today", "Yesterday", or "Mon, Nov 10" for a YYYY-MM-DD string. */
export function dayLabel(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    if (isToday(d)) return 'Today';
    if (isYesterday(d)) return 'Yesterday';
    return format(d, d.getFullYear() === new Date().getFullYear() ? 'EEE, MMM d' : 'EEE, MMM d, yyyy');
  } catch {
    return iso;
  }
}

/** Compact date for row metadata: "Nov 10". */
export function shortDate(iso?: string | null): string {
  if (!iso) return '—';
  try {
    const d = parseISO(iso);
    return format(d, d.getFullYear() === new Date().getFullYear() ? 'MMM d' : 'MMM d, yyyy');
  } catch {
    return iso;
  }
}

/** Groups items (already sorted) by a date key, preserving order. */
export function groupByDate<T>(items: T[], getDate: (item: T) => string): [string, T[]][] {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = getDate(item);
    if (!map.has(key)) map.set(key, []);
    map.get(key)!.push(item);
  }
  return [...map.entries()];
}
