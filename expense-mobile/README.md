# Utang Tracker Mobile (`expense-mobile`)

React Native + Expo Router mobile application for **Utang Tracker**, converted to **local SQLite** (`expo-sqlite`) for offline-first, on-device tracking.

## Features
- **Local SQLite Database (`src/lib/sqlite.ts` & `sqlite/schema.sql`)**: Offline on-device storage (`utang_tracker.db`) with foreign key constraints, unique member names, payment validation triggers, and automatic `settled_amount` synchronization.
- **Overview (`src/app/index.tsx`)**: Outstanding receivable summary card, collected vs. billed progress, quick actions, ranked "Who owes you" list, latest bills, and 14-day spending pulse.
- **Expenses (`src/app/expenses.tsx`)**: Filter by status (All / Unpaid / Partial / Settled), search, category/person/date range filters, date-grouped ledger feed, receipt detail modal, and Equal / Custom split expense form.
- **Payments (`src/app/payments.tsx`)**: "To collect" unpaid shares with one-tap Settle and partial payment recording, plus date-grouped payment history.
- **People (`src/app/members/index.tsx` & `src/app/members/[id].tsx`)**: Member directory, individual statement view, Settle All, and per-member expense/payment history.
- **Reports (`src/app/reports.tsx`)**: Date range and member filtering, 4 KPI cards, Daily/Weekly/Monthly spending bar chart, member balances, category breakdown, and payment history.
- **Settings & Exports (`src/app/settings.tsx`)**: Local SQLite status, native PDF statement generation/preview (`src/lib/pdf.ts`), native share sheet fallback, and JSON backup export.

## Running the App

```bash
cd expense-mobile
npx expo start
```

- Press **`a`** to open on Android Emulator, **`i`** for iOS Simulator, **`w`** for Web, or scan the QR code with **Expo Go**.
