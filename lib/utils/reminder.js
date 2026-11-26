import { format, parseISO } from "date-fns";
import { formatPHP, sumCents } from "./money.js";

function formatShortDate(iso) {
  if (!iso) return "";
  try {
    return format(parseISO(iso), "MMM d");
  } catch {
    return iso;
  }
}

/**
 * Builds a clean, ready-to-paste Messenger / Viber / SMS reminder ("singil") message
 * for a member's unpaid utang, optionally including payment details and a live share link.
 */
export function buildSingilMessage({ memberName, unpaidShares = [], paymentDetails = "", shareUrl = "" }) {
  const ordered = [...unpaidShares]
    .filter((s) => !s.isPayer && s.remainingCents > 0)
    .sort((a, b) => String(a.expenseDate ?? "").localeCompare(String(b.expenseDate ?? "")));

  const totalCents = sumCents(ordered.map((s) => s.remainingCents));
  const lines = [];

  if (ordered.length === 0) {
    lines.push(`Hi ${memberName}! You're all settled up with ₱0.00 remaining. Thank you!`);
  } else {
    lines.push(`Hi ${memberName}! Here's your unpaid utang (${formatPHP(totalCents)} total):`);
    for (const s of ordered) {
      const dateStr = formatShortDate(s.expenseDate);
      const cat = s.expenseCategory ? `${s.expenseCategory} - ` : "";
      const partialTag = s.paidCents > 0 ? ` (remaining of ${formatPHP(s.owedCents)})` : "";
      lines.push(`• ${dateStr ? `${dateStr} · ` : ""}${cat}${s.expenseDescription}: ${formatPHP(s.remainingCents)}${partialTag}`);
    }
  }

  const trimmedDetails = String(paymentDetails ?? "").trim();
  if (trimmedDetails && ordered.length > 0) {
    lines.push("", "Payment details:", trimmedDetails);
  }

  const trimmedUrl = String(shareUrl ?? "").trim();
  if (trimmedUrl) {
    lines.push("", `Live statement: ${trimmedUrl}`);
  }

  return lines.join("\n");
}
