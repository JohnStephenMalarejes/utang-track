export const CATEGORIES = ["Breakfast", "Lunch", "Dinner", "Snack", "Pre-workout", "Other"];

export const PAYMENT_METHODS = ["Cash", "GCash", "Maya", "Bank Transfer", "Other"];

export const STATUS = {
  UNSETTLED: "unsettled",
  PARTIAL: "partial",
  SETTLED: "settled",
};

export const STATUS_LABELS = {
  unsettled: "Unsettled",
  partial: "Partially Paid",
  settled: "Settled",
  none: "No expenses",
};

export const PAGE_SIZE = 10;

export const RECEIPT_PATH_PATTERN = /^(expenses|payments)\/[a-zA-Z0-9._-]+$/;
