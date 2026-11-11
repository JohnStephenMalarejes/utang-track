// All money arithmetic in this app is done in INTEGER CENTAVOS.
// Database values (numeric(12,2)) and user input are converted once at the edge,
// so floating-point rounding errors cannot creep into balances.

const MAX_CENTS = 100_000_000_000; // ₱1,000,000,000.00 — keeps us far inside numeric(12,2)

/** Convert a numeric(12,2) value (number or string from the database) to integer cents. */
export function toCents(value) {
  if (value === null || value === undefined || value === "") return 0;
  return Math.round(Number(value) * 100);
}

/**
 * Parse text typed by a person ("1,234.5", "₱ 50") into integer cents.
 * Returns null when the text is not a valid amount with at most 2 decimals.
 */
export function parseAmount(input) {
  const text = String(input ?? "").replace(/[₱,\s]/g, "");
  if (!/^\d+(\.\d{1,2})?$/.test(text)) return null;
  const [whole, fraction = ""] = text.split(".");
  const cents = parseInt(whole, 10) * 100 + parseInt(fraction.padEnd(2, "0"), 10);
  return cents <= MAX_CENTS ? cents : null;
}

/** Integer cents -> "1234.50" (what we send to Postgres and put in inputs). */
export function centsToDecimal(cents) {
  const sign = cents < 0 ? "-" : "";
  const abs = Math.abs(cents);
  return `${sign}${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}

const phpFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Integer cents -> "₱1,234.50" */
export function formatPHP(cents) {
  return phpFormatter.format((cents || 0) / 100);
}

export function sumCents(values) {
  let total = 0;
  for (const v of values) total += v;
  return total;
}

/**
 * Split `totalCents` evenly among `count` people so every participant gets the exact same share.
 * Example: ₱100.00 / 3 -> [3333, 3333, 3333].
 */
export function splitEqual(totalCents, count) {
  if (!Number.isInteger(totalCents) || totalCents < 0 || !Number.isInteger(count) || count < 1) return [];
  const base = Math.floor(totalCents / count);
  return Array.from({ length: count }, () => base);
}
