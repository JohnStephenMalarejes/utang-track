import { format, parseISO } from "date-fns";

/* =====================================================================
 * Utang Tracker :: Editorial Financial Statement PDF Generator (PDF 1.4)
 * Zero external dependencies, vector precision, multi-page pagination,
 * Swiss-inspired financial typography using the brand Ink + Mint palette.
 * Only unsettled utang is included in generated PDFs.
 * ===================================================================== */

// Brand palette (normalized 0..1 RGB, lifted from tailwind.config.mjs)
const COLOR = {
  ink: "0.078 0.110 0.227",       // #141C3A
  inkSoft: "0.169 0.204 0.337",   // #2B3456
  inkMuted: "0.357 0.388 0.502",  // #5B6380
  slateLight: "0.525 0.561 0.643",// #868FA4
  mint: "0.361 0.827 0.639",      // #5CD3A3
  mintDeep: "0.071 0.478 0.341",  // #127A57
  mintSoft: "0.914 0.969 0.945",  // #E9F7F1
  surface: "0.969 0.973 0.980",   // #F7F8FA
  rule: "0.886 0.902 0.929",      // #E2E6ED
  ruleStrong: "0.788 0.816 0.863",// #C9D0DC
  white: "1 1 1",
};

// Page geometry (A4 Portrait in points)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 46;
const MARGIN_TOP = 44;
const MARGIN_BOTTOM = 54;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

const currencyFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/**
 * Format centavos as a compact number without trailing ".00" (e.g. 8100 -> "81", 4750 -> "47.5", 1175 -> "11.75").
 */
export function formatCompactAmount(cents) {
  const value = (cents || 0) / 100;
  return String(Number(value.toFixed(2)));
}

/**
 * Format centavos as ISO Philippine Peso for WinAnsi PDF typography: "PHP 1,234.50".
 */
export function formatPdfPHP(cents) {
  const safe = Math.abs(cents || 0) / 100;
  const sign = (cents || 0) < 0 ? "-" : "";
  return `${sign}PHP ${currencyFormatter.format(safe)}`;
}

function formatPdfNumber(cents) {
  const safe = Math.abs(cents || 0) / 100;
  return currencyFormatter.format(safe);
}

/**
 * Normalize any string to printable ASCII for PDF Type1 Helvetica strings.
 */
function sanitizePdfText(input) {
  return String(input ?? "")
    .replace(/₱/g, "PHP ")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/·/g, " - ")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfLiteral(text) {
  return sanitizePdfText(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

// Accurate Helvetica / Helvetica-Bold relative advance widths so right-aligned
// ledger figures and wrapped paragraphs align cleanly.
function charWidthUnit(ch, bold) {
  if (ch >= "0" && ch <= "9") return 0.556;
  if (ch === " ") return 0.278;
  if (".,:;!'|".includes(ch)) return 0.278;
  if ("ilIjtfr()[]".includes(ch)) return bold ? 0.333 : 0.295;
  if ("-".includes(ch)) return 0.333;
  if ("mwMW".includes(ch)) return bold ? 0.889 : 0.833;
  if ("@%".includes(ch)) return 0.92;
  if (ch >= "A" && ch <= "Z") {
    if ("GOQD".includes(ch)) return bold ? 0.778 : 0.75;
    if ("HNRU".includes(ch)) return 0.722;
    if ("ABCDEFKPSVXYZ".includes(ch)) return bold ? 0.69 : 0.667;
    if ("LTJ".includes(ch)) return bold ? 0.61 : 0.58;
    return 0.67;
  }
  return bold ? 0.575 : 0.535;
}

function measureTextWidth(text, fontSize, bold = false) {
  const clean = sanitizePdfText(text);
  let units = 0;
  for (let i = 0; i < clean.length; i++) {
    units += charWidthUnit(clean[i], bold);
  }
  return units * fontSize;
}

export function wrapPdfText(text, maxWidth, fontSize, bold = false) {
  const clean = sanitizePdfText(text).trim();
  if (!clean) return [""];
  const words = clean.split(/\s+/);
  const lines = [];
  let current = "";

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureTextWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      if (measureTextWidth(word, fontSize, bold) > maxWidth) {
        let chunk = "";
        for (const ch of word) {
          if (measureTextWidth(chunk + ch, fontSize, bold) <= maxWidth) {
            chunk += ch;
          } else {
            if (chunk) lines.push(chunk);
            chunk = ch;
          }
        }
        current = chunk;
      } else {
        current = word;
      }
    }
  }
  if (current) lines.push(current);
  return lines.length > 0 ? lines : [""];
}

/**
 * Returns the unsettled amount (in cents) for a share, or 0 if it is the payer's share or already settled.
 */
function shareUnsettledCents(share) {
  if (!share || share.isPayer) return 0;
  const remaining = share.remainingCents ?? share.amountCents ?? 0;
  return Math.max(remaining, 0);
}

/**
 * Format the unsettled shares of an expense by grouping members who have the same remaining amount:
 * e.g. "(27 marco kent)" or "(11.75 arsenio, 41.75 marco kent)"
 * Settled shares (remainingCents <= 0) and the payer's share are excluded.
 */
export function formatExpenseSharesInline(shares = []) {
  const groups = new Map();
  for (const s of shares) {
    const unsettled = shareUnsettledCents(s);
    if (unsettled <= 0) continue;
    const amt = formatCompactAmount(unsettled);
    if (!groups.has(amt)) groups.set(amt, []);
    groups.get(amt).push((s.memberName || "").toLowerCase());
  }
  if (groups.size === 0) return "";
  const parts = [];
  for (const [amt, names] of groups.entries()) {
    parts.push(`${amt} ${names.join(" ")}`);
  }
  return `(${parts.join(", ")})`;
}

/**
 * Format a single expense line:
 * e.g. "pre-workout - bread = 81 (27 marco kent)"
 */
export function formatExpenseLine(expense) {
  const cat = (expense.category || "").toLowerCase();
  const desc = (expense.description || "").toLowerCase();
  const total = formatCompactAmount(expense.totalCents);
  const sharesPart = formatExpenseSharesInline(expense.shares);
  return `${cat} - ${desc} = ${total}${sharesPart ? ` ${sharesPart}` : ""}`;
}

function formatDayHeading(isoDate) {
  if (!isoDate) return "";
  try {
    return format(parseISO(isoDate), "MMMM d");
  } catch {
    return isoDate;
  }
}

function formatDayHeadingLong(isoDate) {
  if (!isoDate) return "";
  try {
    return format(parseISO(isoDate), "EEEE, MMMM d, yyyy");
  } catch {
    return isoDate;
  }
}

function formatShortDate(isoDate) {
  if (!isoDate) return "";
  try {
    return format(parseISO(isoDate), "MMM d, yyyy");
  } catch {
    return isoDate;
  }
}

function todayFormatted() {
  try {
    return format(new Date(), "MMM d, yyyy");
  } catch {
    return "";
  }
}

/**
 * Build structured, unsettled-only report data used by both tests and the editorial PDF renderer.
 */
export function buildFormattedReportBlocks({ expenses = [], allExpenses = null, members = [] }) {
  const memberIds = members.length > 0 ? new Set(members.map((m) => m.id)) : null;

  const unsettledExpenses = [];
  for (const e of expenses) {
    const openShares = (e.shares || []).filter(
      (s) => shareUnsettledCents(s) > 0 && (!memberIds || memberIds.has(s.memberId))
    );
    if (openShares.length === 0) continue;
    const unsettledCents = openShares.reduce((sum, s) => sum + shareUnsettledCents(s), 0);
    unsettledExpenses.push({ ...e, shares: openShares, unsettledCents });
  }

  const sortedExpenses = unsettledExpenses.sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return 0;
  });

  const byDate = new Map();
  for (const e of sortedExpenses) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }

  const dateSections = [];
  for (const [date, items] of byDate.entries()) {
    dateSections.push({
      date,
      dateHeading: formatDayHeading(date),
      dateHeadingLong: formatDayHeadingLong(date),
      dayUnsettledCents: items.reduce((sum, item) => sum + item.unsettledCents, 0),
      items,
      lines: items.map((e) => formatExpenseLine(e)),
    });
  }

  const scopedIds = new Set(expenses.map((e) => e.id));
  const priorExpenses = allExpenses ? allExpenses.filter((e) => !scopedIds.has(e.id)) : [];

  const totalLines = [];
  const memberTotals = [];

  for (const m of members) {
    const memberId = m.id;
    const upperName = (m.name || "").toUpperCase();

    let currentUnsettledCents = 0;
    let openShareCount = 0;
    for (const e of sortedExpenses) {
      for (const s of e.shares || []) {
        if (s.memberId === memberId) {
          const u = shareUnsettledCents(s);
          if (u > 0) {
            currentUnsettledCents += u;
            openShareCount += 1;
          }
        }
      }
    }

    const priorUnsettledByDate = [];
    let priorTotalCents = 0;
    let priorShareCount = 0;
    if (priorExpenses.length > 0) {
      const sortedPrior = [...priorExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));
      const priorByDateMap = new Map();
      for (const e of sortedPrior) {
        for (const s of e.shares || []) {
          const unsettled = s.memberId === memberId ? shareUnsettledCents(s) : 0;
          if (unsettled > 0) {
            priorByDateMap.set(e.date, (priorByDateMap.get(e.date) || 0) + unsettled);
            priorTotalCents += unsettled;
            priorShareCount += 1;
          }
        }
      }
      for (const cents of priorByDateMap.values()) {
        priorUnsettledByDate.push(cents);
      }
    }

    const totalBalanceCents =
      expenses.length > 0 || priorExpenses.length > 0
        ? priorTotalCents + currentUnsettledCents
        : Math.max(m.balanceCents ?? m.balance ?? 0, 0);

    if (totalBalanceCents <= 0) continue;

    memberTotals.push({
      id: memberId,
      name: m.name || "",
      openShareCount: openShareCount + priorShareCount,
      currentUnsettledCents,
      priorTotalCents,
      totalBalanceCents,
    });

    if (priorUnsettledByDate.length > 0 && currentUnsettledCents > 0) {
      const priorParts = priorUnsettledByDate.map((c) => `${formatCompactAmount(c)} not settled`).join(" + ");
      if (priorUnsettledByDate.length > 1) {
        totalLines.push(
          `${upperName} = ${priorParts} = ${formatCompactAmount(priorTotalCents)} + ${formatCompactAmount(currentUnsettledCents)} = ${formatCompactAmount(totalBalanceCents)}`
        );
      } else {
        totalLines.push(
          `${upperName} = ${priorParts} + ${formatCompactAmount(currentUnsettledCents)} = ${formatCompactAmount(totalBalanceCents)}`
        );
      }
    } else {
      totalLines.push(`${upperName} = ${formatCompactAmount(totalBalanceCents)}`);
    }
  }

  // Sort summary table highest unsettled balance first for scannability
  memberTotals.sort((a, b) => b.totalBalanceCents - a.totalBalanceCents || a.name.localeCompare(b.name));

  const grandUnsettledCents =
    memberTotals.length > 0
      ? memberTotals.reduce((sum, m) => sum + m.totalBalanceCents, 0)
      : sortedExpenses.reduce((sum, e) => sum + e.unsettledCents, 0);

  return {
    dateSections,
    totalLines,
    memberTotals,
    openExpenseCount: sortedExpenses.length,
    grandUnsettledCents,
  };
}

/**
 * Format unsettled shares cleanly for the itemized statement table:
 * e.g. "Marco: PHP 27.00  |  Kent: PHP 27.00"
 */
function formatShareBreakdown(shares = []) {
  const parts = [];
  for (const s of shares) {
    const unsettled = shareUnsettledCents(s);
    if (unsettled <= 0) continue;
    const isPartial = typeof s.amountCents === "number" && unsettled < s.amountCents;
    parts.push(`${s.memberName}: PHP ${formatPdfNumber(unsettled)}${isPartial ? " rem." : ""}`);
  }
  return parts.join("  |  ");
}

/**
 * Render an editorial, Swiss-inspired financial statement PDF 1.4 document.
 */
function renderStatementPdf({
  eyebrow = "UTANG TRACKER",
  documentLabel = "UNSETTLED STATEMENT",
  title = "Unsettled Balances",
  subtitle = "",
  dateSections = [],
  memberTotals = [],
  openExpenseCount = 0,
  grandUnsettledCents = 0,
  paymentDetails = "",
  showMemberSummary = true,
}) {
  const pages = [[]];
  let ops = pages[0];
  let cursorY = MARGIN_TOP;

  const toY = (topY) => PAGE_HEIGHT - topY;
  const f = (n) => n.toFixed(2);

  // Vector primitives
  const drawRect = (x, topY, w, h, fillColor) => {
    ops.push(`q ${fillColor} rg ${f(x)} ${f(toY(topY + h))} ${f(w)} ${f(h)} re f Q`);
  };

  const drawLine = (x1, topY1, x2, topY2, strokeColor, lineWidth = 0.6) => {
    ops.push(`q ${strokeColor} RG ${f(lineWidth)} w ${f(x1)} ${f(toY(topY1))} m ${f(x2)} ${f(toY(topY2))} l S Q`);
  };

  const drawText = (text, x, topBaselineY, { size = 10, bold = false, color = COLOR.ink, align = "left" } = {}) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    let drawX = x;
    if (align === "right") {
      drawX = x - measureTextWidth(clean, size, bold);
    } else if (align === "center") {
      drawX = x - measureTextWidth(clean, size, bold) / 2;
    }
    const font = bold ? "/F2" : "/F1";
    ops.push(
      `BT ${color} rg ${font} ${f(size)} Tf 1 0 0 1 ${f(drawX)} ${f(toY(topBaselineY))} Tm (${escapePdfLiteral(clean)}) Tj ET`
    );
  };

  const drawTopBrandStrip = () => {
    // Subtle 3pt top brand accent: Mint lead segment + Ink rule across full page width
    drawRect(0, 0, MARGIN_X + 74, 3.5, COLOR.mint);
    drawRect(MARGIN_X + 74, 0, PAGE_WIDTH - (MARGIN_X + 74), 3.5, COLOR.ink);
  };

  const startNewPage = () => {
    ops = [];
    pages.push(ops);
    drawTopBrandStrip();
    // Quiet continuation masthead
    drawText(eyebrow, MARGIN_X, 28, { size: 7.5, bold: true, color: COLOR.mintDeep });
    drawText(`${title} (continued)`, PAGE_WIDTH - MARGIN_X, 28, { size: 7.5, bold: false, color: COLOR.inkMuted, align: "right" });
    drawLine(MARGIN_X, 36, PAGE_WIDTH - MARGIN_X, 36, COLOR.rule, 0.5);
    cursorY = 52;
  };

  const ensureSpace = (needed) => {
    if (cursorY + needed > PAGE_HEIGHT - MARGIN_BOTTOM) {
      startNewPage();
    }
  };

  // ==================== PAGE 1 MASTHEAD ====================
  drawTopBrandStrip();

  // Left identity block
  drawText(`${eyebrow}  /  ${documentLabel}`, MARGIN_X, cursorY + 6, {
    size: 7.5,
    bold: true,
    color: COLOR.mintDeep,
  });

  const titleLines = wrapPdfText(title, CONTENT_WIDTH - 190, 20, true);
  let titleY = cursorY + 28;
  for (const tLine of titleLines) {
    drawText(tLine, MARGIN_X, titleY, { size: 20, bold: true, color: COLOR.ink });
    titleY += 23;
  }

  // Build clean date range + issued metadata
  const dates = dateSections.map((s) => s.date).filter(Boolean);
  const rangeStr =
    dates.length > 1
      ? `${formatShortDate(dates[0])} - ${formatShortDate(dates[dates.length - 1])}`
      : dates.length === 1
        ? formatShortDate(dates[0])
        : "";
  const issuedStr = todayFormatted() ? `Issued ${todayFormatted()}` : "";
  const metaParts = [subtitle, rangeStr, issuedStr, "Unsettled items only"].filter(Boolean);
  const metaY = Math.max(titleY + 2, cursorY + 48);
  drawText(metaParts.join("  |  "), MARGIN_X, metaY, {
    size: 8.5,
    bold: false,
    color: COLOR.inkMuted,
  });

  // Right hero balance readout
  const rightX = PAGE_WIDTH - MARGIN_X;
  drawText("TOTAL UNSETTLED", rightX, cursorY + 6, {
    size: 7.5,
    bold: true,
    color: COLOR.inkMuted,
    align: "right",
  });
  drawText(formatPdfPHP(grandUnsettledCents), rightX, cursorY + 30, {
    size: 20,
    bold: true,
    color: grandUnsettledCents > 0 ? COLOR.ink : COLOR.mintDeep,
    align: "right",
  });
  const countCaption =
    grandUnsettledCents > 0
      ? `${openExpenseCount} open ${openExpenseCount === 1 ? "bill" : "bills"}${
          memberTotals.length > 0 ? `  |  ${memberTotals.length} ${memberTotals.length === 1 ? "person" : "people"}` : ""
        }`
      : "All settled up";
  drawText(countCaption, rightX, metaY, {
    size: 8.5,
    bold: false,
    color: COLOR.inkMuted,
    align: "right",
  });

  cursorY = metaY + 13;
  drawLine(MARGIN_X, cursorY, rightX, cursorY, COLOR.ink, 1.1);
  cursorY += 22;

  // ==================== EMPTY / ALL SETTLED STATE ====================
  if (dateSections.length === 0 && memberTotals.length === 0) {
    drawRect(MARGIN_X, cursorY, CONTENT_WIDTH, 56, COLOR.mintSoft);
    drawRect(MARGIN_X, cursorY, 3, 56, COLOR.mintDeep);
    drawText("No unsettled utang.", MARGIN_X + 16, cursorY + 23, { size: 12, bold: true, color: COLOR.ink });
    drawText("Every expense in this scope has already been settled in full.", MARGIN_X + 16, cursorY + 40, {
      size: 9,
      bold: false,
      color: COLOR.inkMuted,
    });
    cursorY += 72;
  }

  // ==================== SECTION 1: BALANCES DUE ====================
  if (showMemberSummary && memberTotals.length > 0) {
    const colNameX = MARGIN_X + 8;
    const colBillsX = rightX - 122;
    const colAmtX = rightX - 8;

    ensureSpace(70);
    drawText("BALANCES DUE", MARGIN_X, cursorY + 8, { size: 8, bold: true, color: COLOR.inkMuted });
    cursorY += 16;

    // Clean column header strip
    drawRect(MARGIN_X, cursorY, CONTENT_WIDTH, 22, COLOR.surface);
    drawLine(MARGIN_X, cursorY, rightX, cursorY, COLOR.rule, 0.6);
    drawLine(MARGIN_X, cursorY + 22, rightX, cursorY + 22, COLOR.ruleStrong, 0.7);
    drawText("MEMBER", colNameX, cursorY + 14, { size: 7.5, bold: true, color: COLOR.inkMuted });
    drawText("OPEN BILLS", colBillsX, cursorY + 14, { size: 7.5, bold: true, color: COLOR.inkMuted, align: "right" });
    drawText("UNSETTLED", colAmtX, cursorY + 14, { size: 7.5, bold: true, color: COLOR.inkMuted, align: "right" });
    cursorY += 22;

    for (let i = 0; i < memberTotals.length; i++) {
      const m = memberTotals[i];
      const hasPrior = m.priorTotalCents > 0;
      const rowHeight = hasPrior ? 34 : 25;
      ensureSpace(rowHeight + 4);

      if (i % 2 === 1) {
        drawRect(MARGIN_X, cursorY, CONTENT_WIDTH, rowHeight, COLOR.surface);
      }

      drawText(m.name, colNameX, cursorY + 16, { size: 10, bold: true, color: COLOR.ink });
      if (hasPrior) {
        const priorNote =
          m.currentUnsettledCents > 0
            ? `Includes ${formatPdfPHP(m.priorTotalCents)} prior unsettled + ${formatPdfPHP(m.currentUnsettledCents)} in range`
            : `Carried over from prior unsettled bills`;
        drawText(priorNote, colNameX, cursorY + 28, { size: 7.5, bold: false, color: COLOR.inkMuted });
      }

      drawText(
        m.openShareCount > 0 ? `${m.openShareCount} ${m.openShareCount === 1 ? "bill" : "bills"}` : "-",
        colBillsX,
        cursorY + 16,
        { size: 9, bold: false, color: COLOR.inkMuted, align: "right" }
      );
      drawText(formatPdfPHP(m.totalBalanceCents), colAmtX, cursorY + 16, {
        size: 10,
        bold: true,
        color: COLOR.ink,
        align: "right",
      });

      cursorY += rowHeight;
      drawLine(MARGIN_X, cursorY, rightX, cursorY, COLOR.rule, 0.45);
    }

    // Total footer bar (when 2+ people)
    if (memberTotals.length > 1) {
      ensureSpace(28);
      drawLine(MARGIN_X, cursorY, rightX, cursorY, COLOR.ink, 0.9);
      drawText("TOTAL UNSETTLED", colNameX, cursorY + 17, { size: 8.5, bold: true, color: COLOR.ink });
      drawText(formatPdfPHP(grandUnsettledCents), colAmtX, cursorY + 17, {
        size: 11,
        bold: true,
        color: COLOR.ink,
        align: "right",
      });
      cursorY += 26;
    }

    cursorY += 20;
  }

  // ==================== SECTION 2: ITEMIZED UNSETTLED EXPENSES ====================
  if (dateSections.length > 0) {
    const colCatX = MARGIN_X + 8;
    const colDescX = MARGIN_X + 94;
    const descMaxW = CONTENT_WIDTH - 94 - 168;
    const colBillX = rightX - 88;
    const colDueX = rightX - 8;

    const drawExpenseTableHeader = () => {
      drawRect(MARGIN_X, cursorY, CONTENT_WIDTH, 20, COLOR.surface);
      drawLine(MARGIN_X, cursorY, rightX, cursorY, COLOR.rule, 0.6);
      drawLine(MARGIN_X, cursorY + 20, rightX, cursorY + 20, COLOR.ruleStrong, 0.7);
      drawText("CATEGORY", colCatX, cursorY + 13, { size: 7.5, bold: true, color: COLOR.inkMuted });
      drawText("EXPENSE & UNSETTLED SPLIT", colDescX, cursorY + 13, { size: 7.5, bold: true, color: COLOR.inkMuted });
      drawText("BILL TOTAL", colBillX, cursorY + 13, { size: 7.5, bold: true, color: COLOR.inkMuted, align: "right" });
      drawText("UNSETTLED", colDueX, cursorY + 13, { size: 7.5, bold: true, color: COLOR.inkMuted, align: "right" });
      cursorY += 20;
    };

    ensureSpace(84);
    drawText("UNSETTLED EXPENSES", MARGIN_X, cursorY + 8, { size: 8, bold: true, color: COLOR.inkMuted });
    cursorY += 16;

    for (let sIdx = 0; sIdx < dateSections.length; sIdx++) {
      const section = dateSections[sIdx];
      // Prevent orphaned date heading at bottom of page
      ensureSpace(76);

      // Date sub-header with crisp Mint accent tick
      drawRect(MARGIN_X, cursorY + 2, 2.5, 11, COLOR.mint);
      drawText(section.dateHeadingLong || section.dateHeading, MARGIN_X + 9, cursorY + 11, {
        size: 10.5,
        bold: true,
        color: COLOR.ink,
      });
      drawText(`Subtotal ${formatPdfPHP(section.dayUnsettledCents)}`, rightX - 8, cursorY + 11, {
        size: 8.5,
        bold: false,
        color: COLOR.inkMuted,
        align: "right",
      });
      cursorY += 18;
      drawExpenseTableHeader();

      for (let i = 0; i < section.items.length; i++) {
        const exp = section.items[i];
        const descLines = wrapPdfText(exp.description || "Expense", descMaxW, 9.5, true);
        const splitStr = formatShareBreakdown(exp.shares);
        const splitLines = splitStr ? wrapPdfText(splitStr, descMaxW, 8, false) : [];

        const descBlockH = descLines.length * 12.5;
        const splitBlockH = splitLines.length > 0 ? splitLines.length * 10.5 + 2 : 0;
        const rowHeight = Math.max(28, 12 + descBlockH + splitBlockH);

        if (cursorY + rowHeight > PAGE_HEIGHT - MARGIN_BOTTOM) {
          startNewPage();
          drawText(`${section.dateHeadingLong || section.dateHeading} (continued)`, MARGIN_X, cursorY + 9, {
            size: 9,
            bold: true,
            color: COLOR.inkMuted,
          });
          cursorY += 15;
          drawExpenseTableHeader();
        }

        if (i % 2 === 1) {
          drawRect(MARGIN_X, cursorY, CONTENT_WIDTH, rowHeight, COLOR.surface);
        }

        // Category label
        drawText(exp.category || "Other", colCatX, cursorY + 15, {
          size: 8.5,
          bold: false,
          color: COLOR.inkSoft,
        });

        // Expense description + unsettled breakdown
        let textY = cursorY + 15;
        for (const dLine of descLines) {
          drawText(dLine, colDescX, textY, { size: 9.5, bold: true, color: COLOR.ink });
          textY += 12.5;
        }
        if (splitLines.length > 0) {
          textY += 1;
          for (const sLine of splitLines) {
            drawText(sLine, colDescX, textY, { size: 8, bold: false, color: COLOR.inkMuted });
            textY += 10.5;
          }
        }

        // Right-aligned figures
        drawText(formatPdfPHP(exp.totalCents), colBillX, cursorY + 15, {
          size: 8.5,
          bold: false,
          color: COLOR.slateLight,
          align: "right",
        });
        drawText(formatPdfPHP(exp.unsettledCents), colDueX, cursorY + 15, {
          size: 9.5,
          bold: true,
          color: COLOR.ink,
          align: "right",
        });

        cursorY += rowHeight;
        drawLine(MARGIN_X, cursorY, rightX, cursorY, COLOR.rule, 0.45);
      }

      cursorY += 16;
    }
  }

  // ==================== SECTION 3: PAYMENT DETAILS ====================
  const rawDetailLines =
    grandUnsettledCents > 0
      ? String(paymentDetails ?? "")
          .split(/\r?\n/)
          .map((l) => l.trim())
          .filter(Boolean)
      : [];

  if (rawDetailLines.length > 0) {
    const wrappedDetails = rawDetailLines.flatMap((line) => wrapPdfText(line, CONTENT_WIDTH - 28, 9, false));
    const boxHeight = 25 + wrappedDetails.length * 13 + 7;
    ensureSpace(boxHeight + 10);

    drawRect(MARGIN_X, cursorY, CONTENT_WIDTH, boxHeight, COLOR.surface);
    drawRect(MARGIN_X, cursorY, 3, boxHeight, COLOR.mintDeep);
    drawText("HOW TO PAY", MARGIN_X + 14, cursorY + 16, { size: 7.5, bold: true, color: COLOR.mintDeep });

    let dy = cursorY + 30;
    for (const dLine of wrappedDetails) {
      drawText(dLine, MARGIN_X + 14, dy, { size: 9, bold: false, color: COLOR.ink });
      dy += 13;
    }
    cursorY += boxHeight + 12;
  }

  // ==================== RUNNING FOOTER ON EVERY PAGE ====================
  const totalPages = pages.length;
  const footerLabel = documentLabel
    .toLowerCase()
    .replace(/\b\w/g, (ch) => ch.toUpperCase());
  for (let i = 0; i < totalPages; i++) {
    ops = pages[i];
    const footerRuleY = PAGE_HEIGHT - 36;
    const footerTextY = PAGE_HEIGHT - 23;
    drawLine(MARGIN_X, footerRuleY, PAGE_WIDTH - MARGIN_X, footerRuleY, COLOR.rule, 0.5);
    drawText(`Utang Tracker  |  ${footerLabel}`, MARGIN_X, footerTextY, {
      size: 7.5,
      bold: false,
      color: COLOR.slateLight,
    });
    drawText(`Page ${i + 1} of ${totalPages}`, PAGE_WIDTH - MARGIN_X, footerTextY, {
      size: 7.5,
      bold: false,
      color: COLOR.slateLight,
      align: "right",
    });
  }

  // ==================== ASSEMBLE PDF 1.4 STREAM ====================
  const objects = [];
  const pageObjIds = [];

  for (let i = 0; i < totalPages; i++) {
    const contentObjId = 5 + i * 2;
    const pageObjId = 6 + i * 2;
    pageObjIds.push(pageObjId);
    const streamContent = pages[i].join("\n");
    objects.push({
      id: contentObjId,
      body: `<< /Length ${streamContent.length} >>\nstream\n${streamContent}\nendstream`,
    });
    objects.push({
      id: pageObjId,
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${f(PAGE_WIDTH)} ${f(PAGE_HEIGHT)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>`,
    });
  }

  const allObjects = [
    { id: 1, body: `<< /Type /Catalog /Pages 2 0 R >>` },
    { id: 2, body: `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(" ")}] /Count ${totalPages} >>` },
    { id: 3, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>` },
    { id: 4, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>` },
    ...objects,
  ];

  let pdf = "%PDF-1.4\n";
  const offsets = [0];

  for (const obj of allObjects) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${allObjects.length + 1}\n`;
  pdf += "0000000000 65535 f \n";
  for (let id = 1; id <= allObjects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, "0")} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

/**
 * Build a modern editorial Ledger / Summary PDF (unsettled utang only).
 */
export function buildLedgerPdf({
  title = "Unsettled Utang",
  expenses = [],
  allExpenses = null,
  members = [],
  paymentDetails = "",
}) {
  const blocks = buildFormattedReportBlocks({ expenses, allExpenses, members });
  return renderStatementPdf({
    documentLabel: "UNSETTLED STATEMENT",
    title,
    ...blocks,
    paymentDetails,
    showMemberSummary: true,
  });
}

/**
 * Build an individual Member Statement PDF (unsettled utang only).
 */
export function buildMemberStatementPdf({ member, shares = [], paymentDetails = "" }) {
  const fakeExpenses = shares
    .filter((s) => shareUnsettledCents(s) > 0)
    .map((s) => ({
      id: s.expenseId || s.id,
      date: s.expenseDate,
      category: s.expenseCategory,
      description: s.expenseDescription,
      totalCents: s.amountCents,
      shares: [
        {
          memberId: member.id,
          memberName: member.name,
          amountCents: s.amountCents,
          remainingCents: shareUnsettledCents(s),
          isPayer: s.isPayer,
        },
      ],
    }));

  const blocks = buildFormattedReportBlocks({
    expenses: fakeExpenses,
    members: fakeExpenses.length > 0 ? [member] : [],
  });

  return renderStatementPdf({
    documentLabel: "MEMBER STATEMENT",
    title: member?.name || "Member Statement",
    subtitle: member?.contact || "",
    ...blocks,
    paymentDetails,
    showMemberSummary: false,
  });
}

/**
 * Build a single Expense Breakdown PDF (unsettled shares only).
 */
export function buildExpenseDetailPdf(expense, { paymentDetails = "" } = {}) {
  const membersFromShares = (expense.shares || [])
    .filter((s) => shareUnsettledCents(s) > 0)
    .map((s) => ({
      id: s.memberId,
      name: s.memberName,
      balanceCents: shareUnsettledCents(s),
    }));

  const blocks = buildFormattedReportBlocks({
    expenses: [expense],
    members: membersFromShares,
  });

  return renderStatementPdf({
    documentLabel: "EXPENSE BREAKDOWN",
    title: expense?.description || "Expense Breakdown",
    subtitle: expense?.category ? `${expense.category}  |  Paid by ${expense.paidByName ?? "You"}` : "",
    ...blocks,
    paymentDetails,
    showMemberSummary: true,
  });
}
