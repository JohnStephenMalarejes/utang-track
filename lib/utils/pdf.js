import { format, parseISO } from "date-fns";

/**
 * Format centavos as a compact number without trailing ".00" (e.g. 8100 -> "81", 4750 -> "47.5", 1175 -> "11.75").
 */
export function formatCompactAmount(cents) {
  const value = (cents || 0) / 100;
  return String(Number(value.toFixed(2)));
}

/**
 * Legacy helper kept for compatibility.
 */
export function formatPdfPHP(cents) {
  return formatCompactAmount(cents);
}

/**
 * Normalize any string to printable ASCII for PDF Type1 Helvetica strings.
 */
function sanitizePdfText(input) {
  return String(input ?? "")
    .replace(/₱/g, "")
    .replace(/[—–]/g, "-")
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, "...")
    .replace(/·/g, "-")
    .replace(/[^\x20-\x7E]/g, "");
}

function escapePdfLiteral(text) {
  return sanitizePdfText(text)
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)");
}

function measureTextWidth(text, fontSize, bold = false) {
  const clean = sanitizePdfText(text);
  let units = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if ("ilI.,:;!|'` ".includes(ch)) units += 0.28;
    else if ("mwMW@%".includes(ch)) units += 0.82;
    else if (ch >= "A" && ch <= "Z") units += bold ? 0.68 : 0.64;
    else if (ch >= "0" && ch <= "9") units += 0.56;
    else units += bold ? 0.56 : 0.52;
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
 * Format the shares of an expense by grouping members who have the same share amount:
 * e.g. "(27 marco kent)" or "(11.75 arsenio, 41.75 marco kent)"
 */
export function formatExpenseSharesInline(shares = []) {
  const groups = new Map();
  for (const s of shares) {
    if (s.isPayer) continue;
    const amt = formatCompactAmount(s.amountCents);
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

/**
 * Format a date heading like "November 6"
 */
function formatDayHeading(isoDate) {
  if (!isoDate) return "";
  try {
    return format(parseISO(isoDate), "MMMM d");
  } catch {
    return isoDate;
  }
}

/**
 * Build the plain-text lines in the user's exact format:
 *
 * November 6
 *
 * pre-workout - bread = 81 (27 marco kent)
 *
 * breakfast - egg and banana = 160 (11.75 arsenio, 41.75 marco kent)
 *
 * TOTAL:
 * ARSENIO = 220.41
 * MARCO = 207.75
 * KENT = 220.75
 */
export function buildFormattedReportBlocks({ expenses = [], allExpenses = null, members = [] }) {
  // Sort expenses oldest date first so dates read chronologically (e.g. November 6, then November 7)
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return 0;
  });

  // Group expenses by date
  const byDate = new Map();
  for (const e of sortedExpenses) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date).push(e);
  }

  const dateSections = [];
  for (const [date, items] of byDate.entries()) {
    dateSections.push({
      dateHeading: formatDayHeading(date),
      lines: items.map((e) => formatExpenseLine(e)),
    });
  }

  // Build TOTAL section per member
  const scopedIds = new Set(expenses.map((e) => e.id));
  const priorExpenses = allExpenses ? allExpenses.filter((e) => !scopedIds.has(e.id)) : [];

  const totalLines = [];
  for (const m of members) {
    const memberId = m.id;
    const upperName = (m.name || "").toUpperCase();

    // Unsettled amount in the current expenses
    let currentUnsettledCents = 0;
    for (const e of sortedExpenses) {
      for (const s of e.shares || []) {
        if (s.memberId === memberId && !s.isPayer && s.remainingCents > 0) {
          currentUnsettledCents += s.remainingCents;
        }
      }
    }

    // Check if there are prior unsettled expenses outside the current filter scope
    const priorUnsettledByDate = [];
    let priorTotalCents = 0;
    if (priorExpenses.length > 0) {
      const sortedPrior = [...priorExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));
      const priorByDateMap = new Map();
      for (const e of sortedPrior) {
        for (const s of e.shares || []) {
          if (s.memberId === memberId && !s.isPayer && s.remainingCents > 0) {
            priorByDateMap.set(e.date, (priorByDateMap.get(e.date) || 0) + s.remainingCents);
            priorTotalCents += s.remainingCents;
          }
        }
      }
      for (const cents of priorByDateMap.values()) {
        priorUnsettledByDate.push(cents);
      }
    }

    const totalBalanceCents =
      priorTotalCents > 0
        ? priorTotalCents + currentUnsettledCents
        : currentUnsettledCents > 0
          ? currentUnsettledCents
          : Math.max(m.balanceCents ?? m.balance ?? 0, 0);

    if (totalBalanceCents <= 0 && expenses.length > 0) {
      // If member participated in scoped expenses and has 0 remaining, check if we should skip or show 0
      const participated = sortedExpenses.some((e) => (e.shares || []).some((s) => s.memberId === memberId));
      if (!participated) continue;
    }
    if (totalBalanceCents <= 0 && expenses.length === 0) continue;

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

  return { dateSections, totalLines };
}

// Page geometry (A4 Portrait in points)
const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

/**
 * Render the formatted blocks into a clean multi-page PDF 1.4 document.
 */
function renderBlocksToPdf({ dateSections = [], totalLines = [] }) {
  const pages = [[]];
  let currentOps = pages[0];
  let cursorY = MARGIN_TOP;

  const toPdfY = (topY) => PAGE_HEIGHT - topY;

  const ensureSpace = (heightNeeded) => {
    if (cursorY + heightNeeded > PAGE_HEIGHT - MARGIN_BOTTOM) {
      currentOps = [];
      pages.push(currentOps);
      cursorY = MARGIN_TOP;
    }
  };

  const drawLineText = (text, topY, { size = 11, bold = false } = {}) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    const pdfY = toPdfY(topY);
    const font = bold ? "/F2" : "/F1";
    currentOps.push(
      ["BT", "0.10 0.12 0.15 rg", `${font} ${size} Tf`, `1 0 0 1 ${MARGIN_X.toFixed(2)} ${pdfY.toFixed(2)} Tm`, `(${escapePdfLiteral(clean)}) Tj`, "ET"].join("\n")
    );
  };

  const drawWrappedParagraph = (text, { size = 11, bold = false, lineHeight = 16, gapAfter = 10 } = {}) => {
    const lines = wrapPdfText(text, CONTENT_WIDTH, size, bold);
    ensureSpace(lines.length * lineHeight + gapAfter);
    for (const line of lines) {
      drawLineText(line, cursorY + size, { size, bold });
      cursorY += lineHeight;
    }
    cursorY += gapAfter;
  };

  if (dateSections.length === 0 && totalLines.length === 0) {
    drawWrappedParagraph("No records found.", { size: 11, bold: false });
  }

  for (const section of dateSections) {
    ensureSpace(44);
    drawWrappedParagraph(section.dateHeading, { size: 12.5, bold: true, lineHeight: 18, gapAfter: 8 });

    for (const expLine of section.lines) {
      drawWrappedParagraph(expLine, { size: 11, bold: false, lineHeight: 16, gapAfter: 10 });
    }

    cursorY += 8;
  }

  if (totalLines.length > 0) {
    cursorY += 10;
    ensureSpace(36);
    drawWrappedParagraph("TOTAL:", { size: 12, bold: true, lineHeight: 18, gapAfter: 4 });
    for (const tLine of totalLines) {
      drawWrappedParagraph(tLine, { size: 11, bold: true, lineHeight: 16, gapAfter: 4 });
    }
  }

  const totalPages = pages.length;
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
      body: `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${PAGE_WIDTH.toFixed(2)} ${PAGE_HEIGHT.toFixed(2)}] /Resources << /Font << /F1 3 0 R /F2 4 0 R >> >> /Contents ${contentObjId} 0 R >>`,
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
 * Build a PDF in the user's exact format:
 *
 * November 6
 *
 * pre-workout - bread = 81 (27 marco kent)
 * ...
 * TOTAL:
 * ARSENIO = ...
 * MARCO = 207.75
 * KENT = 220.75
 */
export function buildLedgerPdf({
  expenses = [],
  allExpenses = null,
  members = [],
}) {
  const blocks = buildFormattedReportBlocks({ expenses, allExpenses, members });
  return renderBlocksToPdf(blocks);
}

/**
 * Build an individual Member Statement PDF in the same format.
 */
export function buildMemberStatementPdf({ member, shares = [] }) {
  // Convert the member's shares into expense-like items grouped by date
  const fakeExpenses = shares.map((s) => ({
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
        remainingCents: Math.max(s.remainingCents, 0),
        isPayer: s.isPayer,
      },
    ],
  }));

  const blocks = buildFormattedReportBlocks({
    expenses: fakeExpenses,
    members: [member],
  });
  return renderBlocksToPdf(blocks);
}

/**
 * Build a single Expense Breakdown PDF in the same format.
 */
export function buildExpenseDetailPdf(expense) {
  const membersFromShares = (expense.shares || [])
    .filter((s) => !s.isPayer)
    .map((s) => ({
      id: s.memberId,
      name: s.memberName,
      balanceCents: Math.max(s.remainingCents, 0),
    }));

  const blocks = buildFormattedReportBlocks({
    expenses: [expense],
    members: membersFromShares,
  });
  return renderBlocksToPdf(blocks);
}
