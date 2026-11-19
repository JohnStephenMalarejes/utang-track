import { format, parseISO } from 'date-fns';
import { File, Paths } from 'expo-file-system';
import { Platform, Share } from 'react-native';
import { Ledger, LedgerExpense, LedgerMember, LedgerShare } from './ledger';
import { centsToDecimal } from './money';

export function formatCompactAmount(cents: number | null | undefined): string {
  const value = (cents || 0) / 100;
  return String(Number(value.toFixed(2)));
}

function sanitizePdfText(input: string | null | undefined): string {
  return String(input ?? '')
    .replace(/₱/g, '')
    .replace(/[—–]/g, '-')
    .replace(/[“”]/g, '"')
    .replace(/[‘’]/g, "'")
    .replace(/…/g, '...')
    .replace(/·/g, '-')
    .replace(/[^\x20-\x7E]/g, '');
}

function escapePdfLiteral(text: string): string {
  return sanitizePdfText(text)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)');
}

function measureTextWidth(text: string, fontSize: number, bold = false): number {
  const clean = sanitizePdfText(text);
  let units = 0;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if ("ilI.,:;!|'` ".includes(ch)) units += 0.28;
    else if ('mwMW@%'.includes(ch)) units += 0.82;
    else if (ch >= 'A' && ch <= 'Z') units += bold ? 0.68 : 0.64;
    else if (ch >= '0' && ch <= '9') units += 0.56;
    else units += bold ? 0.56 : 0.52;
  }
  return units * fontSize;
}

export function wrapPdfText(text: string, maxWidth: number, fontSize: number, bold = false): string[] {
  const clean = sanitizePdfText(text).trim();
  if (!clean) return [''];
  const words = clean.split(/\s+/);
  const lines: string[] = [];
  let current = '';

  for (const word of words) {
    const candidate = current ? `${current} ${word}` : word;
    if (!current || measureTextWidth(candidate, fontSize, bold) <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      if (measureTextWidth(word, fontSize, bold) > maxWidth) {
        let chunk = '';
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
  return lines.length > 0 ? lines : [''];
}

export function formatExpenseSharesInline(
  shares: { isPayer?: boolean; amountCents: number; memberName?: string }[] = []
): string {
  const groups = new Map<string, string[]>();
  for (const s of shares) {
    if (s.isPayer) continue;
    const amt = formatCompactAmount(s.amountCents);
    if (!groups.has(amt)) groups.set(amt, []);
    groups.get(amt)!.push((s.memberName || '').toLowerCase());
  }
  if (groups.size === 0) return '';
  const parts: string[] = [];
  for (const [amt, names] of groups.entries()) {
    parts.push(`${amt} ${names.join(' ')}`);
  }
  return `(${parts.join(', ')})`;
}

export function formatExpenseLine(expense: {
  category?: string;
  description?: string;
  totalCents: number;
  shares?: { isPayer?: boolean; amountCents: number; memberName?: string }[];
}): string {
  const cat = (expense.category || '').toLowerCase();
  const desc = (expense.description || '').toLowerCase();
  const total = formatCompactAmount(expense.totalCents);
  const sharesPart = formatExpenseSharesInline(expense.shares);
  return `${cat} - ${desc} = ${total}${sharesPart ? ` ${sharesPart}` : ''}`;
}

function formatDayHeading(isoDate?: string): string {
  if (!isoDate) return '';
  try {
    return format(parseISO(isoDate), 'MMMM d');
  } catch {
    return isoDate;
  }
}

export interface ReportBlocks {
  dateSections: { dateHeading: string; lines: string[] }[];
  totalLines: string[];
}

export function buildFormattedReportBlocks({
  expenses = [],
  allExpenses = null,
  members = [],
}: {
  expenses?: {
    id: string;
    date: string;
    createdAt?: string;
    category: string;
    description: string;
    totalCents: number;
    shares?: {
      memberId: string;
      memberName: string;
      amountCents: number;
      remainingCents: number;
      isPayer?: boolean;
    }[];
  }[];
  allExpenses?: LedgerExpense[] | null;
  members?: { id: string; name: string; balanceCents?: number; balance?: number }[];
}): ReportBlocks {
  const sortedExpenses = [...expenses].sort((a, b) => {
    if (a.date !== b.date) return a.date < b.date ? -1 : 1;
    if (a.createdAt && b.createdAt && a.createdAt !== b.createdAt) {
      return a.createdAt < b.createdAt ? -1 : 1;
    }
    return 0;
  });

  const byDate = new Map<string, typeof sortedExpenses>();
  for (const e of sortedExpenses) {
    if (!byDate.has(e.date)) byDate.set(e.date, []);
    byDate.get(e.date)!.push(e);
  }

  const dateSections: { dateHeading: string; lines: string[] }[] = [];
  for (const [date, items] of byDate.entries()) {
    dateSections.push({
      dateHeading: formatDayHeading(date),
      lines: items.map((e) => formatExpenseLine(e)),
    });
  }

  const scopedIds = new Set(expenses.map((e) => e.id));
  const priorExpenses = allExpenses ? allExpenses.filter((e) => !scopedIds.has(e.id)) : [];

  const totalLines: string[] = [];
  for (const m of members) {
    const memberId = m.id;
    const upperName = (m.name || '').toUpperCase();

    let currentUnsettledCents = 0;
    for (const e of sortedExpenses) {
      for (const s of e.shares || []) {
        if (s.memberId === memberId && !s.isPayer && s.remainingCents > 0) {
          currentUnsettledCents += s.remainingCents;
        }
      }
    }

    const priorUnsettledByDate: number[] = [];
    let priorTotalCents = 0;
    if (priorExpenses.length > 0) {
      const sortedPrior = [...priorExpenses].sort((a, b) => (a.date < b.date ? -1 : 1));
      const priorByDateMap = new Map<string, number>();
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
      const participated = sortedExpenses.some((e) => (e.shares || []).some((s) => s.memberId === memberId));
      if (!participated) continue;
    }
    if (totalBalanceCents <= 0 && expenses.length === 0) continue;

    if (priorUnsettledByDate.length > 0 && currentUnsettledCents > 0) {
      const priorParts = priorUnsettledByDate.map((c) => `${formatCompactAmount(c)} not settled`).join(' + ');
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

export function renderBlocksToText(blocks: ReportBlocks): string {
  const out: string[] = [];
  for (const section of blocks.dateSections) {
    out.push(section.dateHeading);
    out.push('');
    for (const line of section.lines) {
      out.push(line);
      out.push('');
    }
  }
  if (blocks.totalLines.length > 0) {
    out.push('TOTAL:');
    for (const tLine of blocks.totalLines) {
      out.push(tLine);
    }
  }
  return out.join('\n').trim() || 'No records found.';
}

const PAGE_WIDTH = 595.28;
const PAGE_HEIGHT = 841.89;
const MARGIN_X = 48;
const MARGIN_TOP = 48;
const MARGIN_BOTTOM = 48;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN_X * 2;

export function renderBlocksToPdf({ dateSections = [], totalLines = [] }: ReportBlocks): Uint8Array {
  const pages: string[][] = [[]];
  let currentOps = pages[0];
  let cursorY = MARGIN_TOP;

  const toPdfY = (topY: number) => PAGE_HEIGHT - topY;

  const ensureSpace = (heightNeeded: number) => {
    if (cursorY + heightNeeded > PAGE_HEIGHT - MARGIN_BOTTOM) {
      currentOps = [];
      pages.push(currentOps);
      cursorY = MARGIN_TOP;
    }
  };

  const drawLineText = (text: string, topY: number, { size = 11, bold = false } = {}) => {
    const clean = sanitizePdfText(text);
    if (!clean) return;
    const pdfY = toPdfY(topY);
    const font = bold ? '/F2' : '/F1';
    currentOps.push(
      ['BT', '0.10 0.12 0.15 rg', `${font} ${size} Tf`, `1 0 0 1 ${MARGIN_X.toFixed(2)} ${pdfY.toFixed(2)} Tm`, `(${escapePdfLiteral(clean)}) Tj`, 'ET'].join('\n')
    );
  };

  const drawWrappedParagraph = (text: string, { size = 11, bold = false, lineHeight = 16, gapAfter = 10 } = {}) => {
    const lines = wrapPdfText(text, CONTENT_WIDTH, size, bold);
    ensureSpace(lines.length * lineHeight + gapAfter);
    for (const line of lines) {
      drawLineText(line, cursorY + size, { size, bold });
      cursorY += lineHeight;
    }
    cursorY += gapAfter;
  };

  if (dateSections.length === 0 && totalLines.length === 0) {
    drawWrappedParagraph('No records found.', { size: 11, bold: false });
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
    drawWrappedParagraph('TOTAL:', { size: 12, bold: true, lineHeight: 18, gapAfter: 4 });
    for (const tLine of totalLines) {
      drawWrappedParagraph(tLine, { size: 11, bold: true, lineHeight: 16, gapAfter: 4 });
    }
  }

  const totalPages = pages.length;
  const objects: { id: number; body: string }[] = [];
  const pageObjIds: number[] = [];

  for (let i = 0; i < totalPages; i++) {
    const contentObjId = 5 + i * 2;
    const pageObjId = 6 + i * 2;
    pageObjIds.push(pageObjId);
    const streamContent = pages[i].join('\n');
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
    { id: 2, body: `<< /Type /Pages /Kids [${pageObjIds.map((id) => `${id} 0 R`).join(' ')}] /Count ${totalPages} >>` },
    { id: 3, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica /Encoding /WinAnsiEncoding >>` },
    { id: 4, body: `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold /Encoding /WinAnsiEncoding >>` },
    ...objects,
  ];

  let pdf = '%PDF-1.4\n';
  const offsets: number[] = [0];

  for (const obj of allObjects) {
    offsets[obj.id] = pdf.length;
    pdf += `${obj.id} 0 obj\n${obj.body}\nendobj\n`;
  }

  const xrefOffset = pdf.length;
  pdf += `xref\n0 ${allObjects.length + 1}\n`;
  pdf += '0000000000 65535 f \n';
  for (let id = 1; id <= allObjects.length; id++) {
    pdf += `${String(offsets[id]).padStart(10, '0')} 00000 n \n`;
  }
  pdf += `trailer\n<< /Size ${allObjects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;

  return new TextEncoder().encode(pdf);
}

export async function exportReportPdf({
  filename,
  shareTitle,
  blocks,
}: {
  filename: string;
  shareTitle: string;
  blocks: ReportBlocks;
}) {
  const pdfBytes = renderBlocksToPdf(blocks);
  const textSummary = renderBlocksToText(blocks);

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const blob = new Blob([pdfBytes.buffer as ArrayBuffer], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  try {
    const file = new File(Paths.cache, filename);
    await file.write(pdfBytes);
    const previewable = await file.canPreview({ mimeType: 'application/pdf' });
    if (previewable) {
      await file.preview({ title: shareTitle, mimeType: 'application/pdf' });
      return;
    }
  } catch {
    // Fallback to native Share sheet below
  }

  await Share.share({
    title: shareTitle,
    message: `${shareTitle}\n\n${textSummary}`,
  });
}

export async function exportLedgerSummaryPdf({
  filename,
  shareTitle,
  members = [],
  expenses = [],
  allExpenses = null,
}: {
  filename: string;
  shareTitle: string;
  members?: LedgerMember[];
  expenses?: LedgerExpense[];
  allExpenses?: LedgerExpense[] | null;
}) {
  const blocks = buildFormattedReportBlocks({ expenses, allExpenses, members });
  await exportReportPdf({ filename, shareTitle, blocks });
}

export async function exportMemberStatementPdf({
  filename,
  shareTitle,
  member,
  shares = [],
}: {
  filename: string;
  shareTitle: string;
  member: LedgerMember;
  shares?: LedgerShare[];
}) {
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
  await exportReportPdf({ filename, shareTitle, blocks });
}

export async function exportExpenseDetailPdf({
  filename,
  shareTitle,
  expense,
}: {
  filename: string;
  shareTitle: string;
  expense: LedgerExpense;
}) {
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
  await exportReportPdf({ filename, shareTitle, blocks });
}

export async function exportJsonBackup(ledger: Ledger) {
  const backup = {
    exportedAt: new Date().toISOString(),
    currency: 'PHP',
    members: ledger.members.map(({ id, name, contact, notes, createdAt }) => ({ id, name, contact, notes, createdAt })),
    expenses: ledger.expenses.map((e) => ({
      id: e.id,
      date: e.date,
      description: e.description,
      category: e.category,
      total: centsToDecimal(e.totalCents),
      paidBy: e.paidByName,
      notes: e.notes,
      shares: e.shares.map((s) => ({
        member: s.memberName,
        share: centsToDecimal(s.amountCents),
        paid: centsToDecimal(s.paidCents),
      })),
    })),
    payments: ledger.payments.map((p) => ({
      id: p.id,
      date: p.date,
      member: p.memberName,
      expense: p.expenseDescription,
      amount: centsToDecimal(p.amountCents),
      notes: p.notes,
    })),
  };

  const json = JSON.stringify(backup, null, 2);
  const filename = `debt-tracker-backup-${new Date().toISOString().slice(0, 10)}.json`;

  if (Platform.OS === 'web' && typeof document !== 'undefined') {
    const url = URL.createObjectURL(new Blob([json], { type: 'application/json' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return;
  }

  await Share.share({
    title: filename,
    message: json,
  });
}
