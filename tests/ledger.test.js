import test from "node:test";
import assert from "node:assert/strict";
import { buildLedger, allocateMemberPayment, groupPaymentsByBatch } from "../lib/calculations/ledger.js";
import { summarize, categoryTotals, expenseEntries } from "../lib/calculations/analytics.js";
import { memberPaymentSchema, paymentDetailsSchema } from "../lib/validations/schemas.js";
import { buildSingilMessage } from "../lib/utils/reminder.js";

const members = [
  { id: "m-ana", name: "Ana" },
  { id: "m-ben", name: "Ben" },
  { id: "m-cy", name: "Cy" },
];

const expenses = [
  {
    id: "e1", description: "Lunch", category: "Lunch", total_amount: "100.00", expense_date: "2025-03-03", paid_by: "m-ana",
    expense_shares: [
      { id: "s1a", member_id: "m-ana", share_amount: "33.34" },
      { id: "s1b", member_id: "m-ben", share_amount: "33.33" },
      { id: "s1c", member_id: "m-cy", share_amount: "33.33" },
    ],
  },
  {
    id: "e2", description: "Dinner", category: "Dinner", total_amount: "250.50", expense_date: "2025-03-05", paid_by: null,
    expense_shares: [
      { id: "s2b", member_id: "m-ben", share_amount: "150.50" },
      { id: "s2c", member_id: "m-cy", share_amount: "100.00" },
    ],
  },
];

test("empty database produces an all-zero ledger", () => {
  const l = buildLedger({ members: [], expenses: [], payments: [] });
  assert.deepEqual(l.totals, { expensesCents: 0, settledCents: 0, outstandingCents: 0, expenseCount: 0, unsettledCount: 0, memberCount: 0, paymentCount: 0 });
});

test("balances = assigned - paid; payer's own share is not a debt", () => {
  const payments = [
    { id: "p1", member_id: "m-ben", expense_share_id: "s1b", amount: "33.33", payment_date: "2025-03-04" },
    { id: "p2", member_id: "m-ben", expense_share_id: "s2b", amount: "50.00", payment_date: "2025-03-06" },
  ];
  const l = buildLedger({ members, expenses, payments });
  const byName = Object.fromEntries(l.members.map((m) => [m.name, m]));

  assert.equal(byName.Ana.assignedCents, 0); // Ana paid the bill, so her own share is not owed
  assert.equal(byName.Ana.status, "settled");
  assert.equal(byName.Ben.assignedCents, 3333 + 15050);
  assert.equal(byName.Ben.paidCents, 8333);
  assert.equal(byName.Ben.balanceCents, 10050);
  assert.equal(byName.Ben.status, "partial");
  assert.equal(byName.Cy.balanceCents, 3333 + 10000);
  assert.equal(byName.Cy.status, "unsettled");

  assert.equal(l.totals.expensesCents, 35050);
  assert.equal(l.totals.settledCents, 8333);
  assert.equal(l.totals.outstandingCents, 10050 + 13333);
  assert.equal(l.totals.expenseCount, 2);
  assert.equal(l.totals.unsettledCount, 2);

  const e1 = l.expenses.find((e) => e.id === "e1");
  assert.equal(e1.status, "partial");
  const s1b = l.shares.find((s) => s.id === "s1b");
  assert.equal(s1b.status, "settled");
});

test("equal split including user computes userShareCents evenly", () => {
  const expWithUser = [
    {
      id: "e3",
      description: "Pizza",
      category: "Dinner",
      total_amount: "100.00",
      expense_date: "2025-03-07",
      paid_by: null,
      expense_shares: [
        { id: "s3a", member_id: "m-ana", share_amount: "33.33" },
        { id: "s3b", member_id: "m-ben", share_amount: "33.33" },
      ],
    },
  ];
  const l = buildLedger({ members, expenses: expWithUser, payments: [] });
  assert.equal(l.expenses[0].userShareCents, 3333);
  assert.equal(l.expenses[0].owedCents, 6666);
});

test("overpayment shows as a negative balance and is not counted as debt", () => {
  const payments = [{ id: "p1", member_id: "m-cy", expense_share_id: "s2c", amount: "120.00", payment_date: "2025-03-06" }];
  const l = buildLedger({ members, expenses, payments });
  const cy = l.members.find((m) => m.name === "Cy");
  assert.equal(cy.balanceCents, 3333 + 10000 - 12000);
  const s2c = l.shares.find((s) => s.id === "s2c");
  assert.equal(s2c.remainingCents, -2000);
  assert.equal(s2c.status, "settled");
});

test("deleting a payment immediately restores the balance", () => {
  const payment = { id: "p1", member_id: "m-ben", expense_share_id: "s2b", amount: "150.50", payment_date: "2025-03-06" };
  const withPayment = buildLedger({ members, expenses, payments: [payment] });
  const without = buildLedger({ members, expenses, payments: [] });
  assert.equal(withPayment.shares.find((s) => s.id === "s2b").status, "settled");
  assert.equal(without.shares.find((s) => s.id === "s2b").remainingCents, 15050);
});

test("reports: period summaries and category totals", () => {
  const l = buildLedger({ members, expenses, payments: [] });
  const entries = expenseEntries(l.expenses);
  assert.deepEqual(summarize(entries, "monthly").map((r) => [r.key, r.totalCents]), [["2025-03", 35050]]);
  assert.deepEqual(summarize(entries, "weekly").map((r) => [r.key, r.totalCents]), [["2025-03-03", 35050]]);
  assert.deepEqual(summarize(entries, "daily").map((r) => r.totalCents), [10000, 25050]);
  assert.deepEqual(categoryTotals(entries).map((r) => r.category), ["Dinner", "Lunch"]);
  assert.equal(expenseEntries(l.expenses, "m-ben").reduce((a, e) => a + e.amountCents, 0), 3333 + 15050);
});

test("allocateMemberPayment settles all unpaid shares oldest-first and skips payer/settled shares", () => {
  const shares = [
    { id: "s-newer", remainingCents: 15050, isPayer: false, expenseDate: "2025-03-05" },
    { id: "s-payer", remainingCents: 5000, isPayer: true, expenseDate: "2025-03-01" },
    { id: "s-older", remainingCents: 3333, isPayer: false, expenseDate: "2025-03-03" },
    { id: "s-settled", remainingCents: 0, isPayer: false, expenseDate: "2025-03-02" },
    { id: "s-overpaid", remainingCents: -200, isPayer: false, expenseDate: "2025-03-04" },
  ];

  // Pay all unpaid utang at once
  const full = allocateMemberPayment(shares, 3333 + 15050);
  assert.equal(full.totalRemainingCents, 18383);
  assert.equal(full.allocatedCents, 18383);
  assert.equal(full.excessCents, 0);
  assert.deepEqual(
    full.allocations.map((a) => [a.share.id, a.amountCents, a.settlesShare]),
    [
      ["s-older", 3333, true],
      ["s-newer", 15050, true],
    ]
  );

  // Partial lump-sum allocates oldest-first
  const partial = allocateMemberPayment(shares, 5000);
  assert.equal(partial.allocatedCents, 5000);
  assert.equal(partial.excessCents, 0);
  assert.deepEqual(
    partial.allocations.map((a) => [a.share.id, a.amountCents, a.settlesShare]),
    [
      ["s-older", 3333, true],
      ["s-newer", 1667, false],
    ]
  );

  // Excess over total remaining is reported cleanly
  const excess = allocateMemberPayment(shares, 20000);
  assert.equal(excess.allocatedCents, 18383);
  assert.equal(excess.excessCents, 1617);
});

test("memberPaymentSchema validates bulk member payment input", () => {
  const valid = memberPaymentSchema.safeParse({
    member_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: "183.83",
    payment_date: "2025-03-10",
    payment_method: "GCash",
    notes: "GCash full payment",
    receipt_path: "payments/abc-123.jpg",
  });
  assert.equal(valid.success, true);

  const invalidZero = memberPaymentSchema.safeParse({
    member_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: "0",
    payment_date: "2025-03-10",
  });
  assert.equal(invalidZero.success, false);

  const invalidPath = memberPaymentSchema.safeParse({
    member_id: "550e8400-e29b-41d4-a716-446655440000",
    amount: "50",
    payment_date: "2025-03-10",
    receipt_path: "../etc/passwd",
  });
  assert.equal(invalidPath.success, false);
});

test("buildSingilMessage formats unpaid breakdown with payment details and share link", () => {
  const msg = buildSingilMessage({
    memberName: "Marco",
    unpaidShares: [
      { id: "s2", expenseDate: "2026-11-06", expenseCategory: "Breakfast", expenseDescription: "egg and banana", owedCents: 4175, paidCents: 0, remainingCents: 4175, isPayer: false },
      { id: "s1", expenseDate: "2026-11-05", expenseCategory: "Pre-workout", expenseDescription: "bread", owedCents: 2700, paidCents: 0, remainingCents: 2700, isPayer: false },
    ],
    paymentDetails: "GCash: 0917-123-4567",
    shareUrl: "https://example.com/s/tok12345678901234",
  });

  assert.ok(msg.includes("Hi Marco! Here's your unpaid utang (₱68.75 total):"));
  assert.ok(msg.indexOf("bread") < msg.indexOf("egg and banana"));
  assert.ok(msg.includes("GCash: 0917-123-4567"));
  assert.ok(msg.includes("Live statement: https://example.com/s/tok12345678901234"));
});

test("groupPaymentsByBatch collapses multi-item batches while preserving single payments", () => {
  const rows = [
    { id: "p1", memberId: "m1", memberName: "Marco", date: "2026-11-08", amountCents: 2700, paymentMethod: "GCash", batchId: "b-1", notes: "Paid all", expenseDescription: "bread", receiptPath: "payments/a.png" },
    { id: "p2", memberId: "m1", memberName: "Marco", date: "2026-11-08", amountCents: 4175, paymentMethod: "GCash", batchId: "b-1", notes: "Paid all", expenseDescription: "egg", receiptPath: "payments/a.png" },
    { id: "p3", memberId: "m2", memberName: "Kent", date: "2026-11-07", amountCents: 5000, paymentMethod: "Cash", batchId: null, notes: "", expenseDescription: "lunch", receiptPath: null },
  ];

  const grouped = groupPaymentsByBatch(rows);
  assert.equal(grouped.length, 2);
  assert.equal(grouped[0].isBatch, true);
  assert.equal(grouped[0].amountCents, 6875);
  assert.equal(grouped[0].items.length, 2);
  assert.equal(grouped[0].receiptPath, "payments/a.png");
  assert.equal(grouped[1].isBatch, false);
  assert.equal(grouped[1].id, "p3");
});

test("paymentDetailsSchema accepts and trims payment instructions", () => {
  const ok = paymentDetailsSchema.safeParse({ payment_details: "  GCash: 0917-000-0000  " });
  assert.equal(ok.success, true);
  assert.equal(ok.data.payment_details, "GCash: 0917-000-0000");
});
