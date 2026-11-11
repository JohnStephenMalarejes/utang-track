-- =====================================================================
-- Utang Tracker :: 0003 Row Level Security
--
-- Strategy (single administrator, no service-role key anywhere):
--   * The app signs the admin in with Supabase Auth (email + password).
--   * Every query runs with the admin's own session through the anon key.
--   * RLS lets only the user listed in public.admin_users touch any row.
--   * The anon role (not signed in) and any other signed-in user get nothing.
-- =====================================================================

alter table public.members        enable row level security;
alter table public.expenses       enable row level security;
alter table public.expense_shares enable row level security;
alter table public.payments       enable row level security;
alter table public.admin_users    enable row level security;  -- no policies: unreadable by clients

create policy "admin full access" on public.members
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin full access" on public.expenses
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin full access" on public.expense_shares
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

create policy "admin full access" on public.payments
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- Defence in depth: remove default table privileges from the anon role.
revoke all on public.members, public.expenses, public.expense_shares, public.payments, public.admin_users from anon;
revoke all on public.admin_users from authenticated;
