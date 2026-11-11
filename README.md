# Utang Tracker

A minimalist web app for one administrator to track shared expenses, who owes what, and who has paid back. Built with Next.js (App Router, JavaScript), Tailwind CSS, shadcn/ui-style components, Supabase (PostgreSQL), Lucide and Recharts. Currency is the Philippine peso (₱).

The app starts **completely empty**. Nothing is seeded; every record is created from a form.

## Quick start

### 1. Create a Supabase project
1. Create a project at <https://supabase.com>.
2. **Authentication → Sign In / Providers → Email**: turn **off** "Allow new users to sign up" (this is a single-admin app).
3. **Authentication → Users → Add user**: create your admin account (email + password, tick "Auto Confirm User").

### 2. Run the database migrations
Open **SQL Editor** and run these files in order (paste each, click Run):

1. `supabase/migrations/0001_schema.sql`: tables, constraints, indexes
2. `supabase/migrations/0002_functions_triggers.sql`: triggers and `save_expense()`
3. `supabase/migrations/0003_row_level_security.sql`: Row Level Security

(Or with the Supabase CLI: `supabase link --project-ref <ref> && supabase db push`.)

### 3. Register the administrator
In the SQL Editor, run (use the email you created in step 1):

```sql
insert into public.admin_users (user_id)
select id from auth.users where email = 'you@example.com';
```

Only this account can read or write any data. Anyone else, including other signed-in users, gets nothing.

### 4. Configure and run
```bash
npm install
cp .env.example .env.local     # then fill in the two values from Supabase → Project Settings → API
npm run dev                    # http://localhost:3000
```

Sign in with the admin account. Add members first, then expenses.

## Environment variables

| Variable | Value |
| --- | --- |
| `SUPABASE_URL` | Project URL |
| `SUPABASE_ANON_KEY` | The `anon` / publishable key |

Both are read **server-side only** (no `NEXT_PUBLIC_` prefix), so nothing Supabase-related is shipped to the browser. The service-role key is never used and must never be added.

## Security model
- The admin signs in with Supabase Auth. The session lives in HTTP-only cookies; `middleware.js` redirects everyone else to `/login`.
- All database access happens in Server Components and Server Actions using the **anon key plus the admin's own session**, so **Row Level Security is always enforced**.
- RLS policies allow only the user listed in `public.admin_users` (checked by the `is_admin()` function). The `anon` role has no privileges at all. `admin_users` is unreadable by clients.
- Every Server Action re-checks the session and validates input with Zod; the database re-validates with constraints and triggers.

## How the money works
- Stored as `numeric(12,2)`; the app converts to **integer centavos** before any arithmetic, so there are no floating-point errors.
- **Total Assigned** = sum of a member's shares. **Total Paid** = sum of their payments. **Outstanding** = Assigned − Paid.
- **Equal split** divides in centavos; leftover centavos go to the first people in the list (₱100.00 ÷ 3 → 33.34 / 33.33 / 33.33).
- **Custom split** is never auto-corrected. A warning shows the difference and saving is blocked until the shares equal the total (enforced again on the server and in the database).
- **If the person who paid the bill is also a participant, their own share isn't counted as a debt** (they can't owe themselves). This is the one deliberate refinement of "Assigned = sum of all shares".
- Payments above the remaining balance require an explicit confirmation (checked on the server too). An overpaid member shows a negative balance (credit) and is not counted in Total Outstanding.
- `expense_shares.settled_amount` is kept in sync by a database trigger on `payments`.
- Editing an expense updates shares in place (payments are kept). Removing a participant who already has payments is blocked.
- Members who still have expenses or payments can't be deleted (foreign keys use `RESTRICT`). Deleting an expense also deletes its shares and payments after confirmation.

## Project structure
```
app/
  (admin)/          dashboard, expenses, members (+ [id]), payments, reports, settings
  actions/          server actions: auth, members, expenses, payments
  login/            sign-in page
components/         layout/ dashboard/ expenses/ members/ payments/ reports/ ui/
lib/
  supabase/         server client + middleware session helper
  calculations/     ledger.js (balances/status), analytics.js (reports)
  validations/      Zod schemas
  utils/            money (centavos), dates, cn
hooks/              use-server-action.js
supabase/
  migrations/       SQL migrations
  tests/            database tests (see below)
tests/              unit tests for money and balance logic
```
The UI components in `components/ui` follow shadcn/ui conventions (Radix primitives, `cva`, `cn`); they were written by hand rather than via the CLI. Dropdowns use the native `<select>` for accessibility and mobile ergonomics.

## Testing
```bash
npm test      # money, splitting, balances, report grouping (Node's built-in test runner)
```
Database tests: `supabase/tests/database.test.sql` exercises RLS, triggers, `save_expense()` and referential integrity. Run it against a **scratch** local Postgres (not your Supabase project): first `00_supabase_stub.sql` (fakes the `auth` schema and roles), then the three migrations, then the test file.

## Deployment
**Vercel (recommended):** push the repo, import it in Vercel, add `SUPABASE_URL` and `SUPABASE_ANON_KEY`, deploy.
**Self-hosted:** `npm run build && npm start` (Node 18.18+), behind HTTPS, with the same two variables set.

## Notes and limits
- Data is loaded in full per page (paged in batches of 1,000 rows) and filtered in the browser. This is ideal for a friends-sized ledger; for tens of thousands of rows, move filtering to the database.
- Dates are plain calendar dates (no time zone). "Today" uses the browser's clock.
