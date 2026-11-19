export const CATEGORIES = [
  'Breakfast',
  'Lunch',
  'Dinner',
  'Snack',
  'Pre-workout',
  'Other',
] as const;

export type ExpenseCategory = (typeof CATEGORIES)[number];

export const STATUS = {
  UNSETTLED: 'unsettled',
  PARTIAL: 'partial',
  SETTLED: 'settled',
} as const;

export type SettlementStatus = (typeof STATUS)[keyof typeof STATUS] | 'none';

export const STATUS_LABELS: Record<string, string> = {
  unsettled: 'Unsettled',
  partial: 'Partially Paid',
  settled: 'Settled',
  none: 'No expenses',
};

export const PAGE_SIZE = 10;
