import test from "node:test";
import assert from "node:assert/strict";
import { parseAmount, toCents, centsToDecimal, formatPHP, splitEqual, sumCents } from "../lib/utils/money.js";
import { buildLedgerPdf, buildMemberStatementPdf, buildExpenseDetailPdf, buildFormattedReportBlocks } from "../lib/utils/pdf.js";

test("parseAmount accepts valid peso amounts and rejects junk", () => {
  assert.equal(parseAmount("150"), 15000);
  assert.equal(parseAmount("150.5"), 15050);
  assert.equal(parseAmount("₱1,234.56"), 123456);
  assert.equal(parseAmount("0.07"), 7);
  assert.equal(parseAmount("1.234"), null);
  assert.equal(parseAmount("-5"), null);
  assert.equal(parseAmount("abc"), null);
  assert.equal(parseAmount(""), null);
});

test("toCents avoids floating-point drift", () => {
  assert.equal(toCents(0.1 + 0.2), 30);
  assert.equal(toCents("19.99"), 1999);
  assert.equal(sumCents([toCents(0.1), toCents(0.2)]), 30);
});

test("centsToDecimal and formatPHP", () => {
  assert.equal(centsToDecimal(5), "0.05");
  assert.equal(centsToDecimal(123456), "1234.56");
  assert.equal(centsToDecimal(-250), "-2.50");
  assert.equal(formatPHP(0), "₱0.00");
  assert.equal(formatPHP(123456), "₱1,234.56");
});

test("splitEqual always gives every participant the same even share", () => {
  assert.deepEqual(splitEqual(10000, 3), [3333, 3333, 3333]);
  assert.deepEqual(splitEqual(10000, 4), [2500, 2500, 2500, 2500]);
  assert.deepEqual(splitEqual(1, 3), [0, 0, 0]);
  for (const [total, n] of [[9999, 7], [100001, 13], [5, 2], [123457, 9]]) {
    const parts = splitEqual(total, n);
    assert.equal(parts.length, n);
    assert.equal(Math.max(...parts), Math.min(...parts));
  }
  assert.deepEqual(splitEqual(100, 0), []);
});

test("PDF generators produce valid PDF 1.4 byte streams in the custom date & total format", () => {
  const expenses = [
    {
      id: "e1",
      date: "2026-11-06",
      description: "bread",
      category: "Pre-workout",
      totalCents: 8100,
      shares: [
        { id: "s1", memberId: "m-marco", memberName: "Marco", amountCents: 2700, remainingCents: 2700, isPayer: false },
        { id: "s2", memberId: "m-kent", memberName: "Kent", amountCents: 2700, remainingCents: 2700, isPayer: false },
      ],
    },
    {
      id: "e2",
      date: "2026-11-06",
      description: "egg and banana",
      category: "Breakfast",
      totalCents: 16000,
      shares: [
        { id: "s3", memberId: "m-arsenio", memberName: "Arsenio", amountCents: 1175, remainingCents: 1175, isPayer: false },
        { id: "s4", memberId: "m-marco", memberName: "Marco", amountCents: 4175, remainingCents: 4175, isPayer: false },
        { id: "s5", memberId: "m-kent", memberName: "Kent", amountCents: 4175, remainingCents: 4175, isPayer: false },
      ],
    },
  ];
  const members = [
    { id: "m-arsenio", name: "Arsenio", balanceCents: 1175 },
    { id: "m-marco", name: "Marco", balanceCents: 6875 },
    { id: "m-kent", name: "Kent", balanceCents: 6875 },
  ];

  const blocks = buildFormattedReportBlocks({ expenses, members });
  assert.equal(blocks.dateSections[0].dateHeading, "November 6");
  assert.equal(blocks.dateSections[0].lines[0], "pre-workout - bread = 81 (27 marco kent)");
  assert.equal(blocks.dateSections[0].lines[1], "breakfast - egg and banana = 160 (11.75 arsenio, 41.75 marco kent)");
  assert.deepEqual(blocks.totalLines, ["ARSENIO = 11.75", "MARCO = 68.75", "KENT = 68.75"]);

  const ledgerBytes = buildLedgerPdf({ members, expenses, paymentDetails: "GCash: 0917-123-4567" });
  const text = new TextDecoder().decode(ledgerBytes);
  assert.ok(text.startsWith("%PDF-1.4\n"));
  assert.ok(text.endsWith("%%EOF"));
  assert.ok(text.includes("UTANG TRACKER"));
  assert.ok(text.includes("BALANCES DUE"));
  assert.ok(text.includes("UNSETTLED EXPENSES"));
  assert.ok(text.includes("November 6"));
  assert.ok(text.includes("PHP 68.75"));
  assert.ok(text.includes("HOW TO PAY"));
  assert.ok(text.includes("GCash: 0917-123-4567"));
  assert.ok(text.includes("Page 1 of 1"));

  const memberBytes = buildMemberStatementPdf({
    member: members[0],
    shares: [
      {
        id: "s3",
        expenseDate: "2026-11-06",
        expenseDescription: "egg and banana",
        expenseCategory: "Breakfast",
        amountCents: 1175,
        remainingCents: 1175,
      },
    ],
  });
  assert.ok(new TextDecoder().decode(memberBytes).startsWith("%PDF-1.4\n"));

  const expBytes = buildExpenseDetailPdf(expenses[0]);
  assert.ok(new TextDecoder().decode(expBytes).startsWith("%PDF-1.4\n"));
});

test("PDF excludes already settled expenses, settled shares, and settled members", () => {
  const expenses = [
    {
      id: "e-settled",
      date: "2026-11-05",
      description: "fully paid coffee",
      category: "Breakfast",
      totalCents: 10000,
      shares: [
        { id: "s-old-1", memberId: "m-arsenio", memberName: "Arsenio", amountCents: 5000, remainingCents: 0, isPayer: false },
        { id: "s-old-2", memberId: "m-marco", memberName: "Marco", amountCents: 5000, remainingCents: 0, isPayer: false },
      ],
    },
    {
      id: "e-mixed",
      date: "2026-11-06",
      description: "egg and banana",
      category: "Breakfast",
      totalCents: 16000,
      shares: [
        // Arsenio already settled his share; Marco partially paid (2000 remaining); Kent unpaid (4175 remaining)
        { id: "s-mix-1", memberId: "m-arsenio", memberName: "Arsenio", amountCents: 1175, remainingCents: 0, isPayer: false },
        { id: "s-mix-2", memberId: "m-marco", memberName: "Marco", amountCents: 4175, remainingCents: 2000, isPayer: false },
        { id: "s-mix-3", memberId: "m-kent", memberName: "Kent", amountCents: 4175, remainingCents: 4175, isPayer: false },
      ],
    },
  ];
  const members = [
    { id: "m-arsenio", name: "Arsenio", balanceCents: 0 },
    { id: "m-marco", name: "Marco", balanceCents: 2000 },
    { id: "m-kent", name: "Kent", balanceCents: 4175 },
  ];

  const blocks = buildFormattedReportBlocks({ expenses, members });
  // November 5 (all settled) must not appear at all
  assert.equal(blocks.dateSections.length, 1);
  assert.equal(blocks.dateSections[0].dateHeading, "November 6");
  // Arsenio (settled) is excluded; Marco shows remaining 20; Kent shows 41.75
  assert.deepEqual(blocks.dateSections[0].lines, ["breakfast - egg and banana = 160 (20 marco, 41.75 kent)"]);
  assert.deepEqual(blocks.totalLines, ["MARCO = 20", "KENT = 41.75"]);

  // Member statement PDF for a settled member has no settled items
  const settledMemberPdf = new TextDecoder().decode(
    buildMemberStatementPdf({
      member: members[0],
      shares: [
        { id: "s-old-1", expenseDate: "2026-11-05", expenseDescription: "fully paid coffee", expenseCategory: "Breakfast", amountCents: 5000, remainingCents: 0, isPayer: false },
      ],
      paymentDetails: "GCash: 0917-123-4567",
    })
  );
  assert.ok(settledMemberPdf.includes("No unsettled utang."));
  assert.ok(!settledMemberPdf.includes("fully paid coffee"));
  assert.ok(!settledMemberPdf.includes("ARSENIO"));
});
