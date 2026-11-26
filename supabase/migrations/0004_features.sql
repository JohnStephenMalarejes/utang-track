-- =====================================================================
-- Utang Tracker :: 0004 features migration
-- Adds:
--   1. app_settings (saved GCash / Maya / Bank payment details for singil & statements)
--   2. payments.payment_method, payments.batch_id, payments.receipt_path
--   3. expenses.receipt_path
--   4. members.share_token + SECURITY DEFINER RPC get_public_member_statement(token)
--   5. Private Supabase Storage bucket 'receipts' + admin-only policies
-- =====================================================================

-- ---------- 1. Workspace settings (payment details for reminders/statements) ----------
create table if not exists public.app_settings (
  id              smallint primary key default 1 check (id = 1),
  payment_details text check (payment_details is null or char_length(payment_details) <= 1000),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);

drop trigger if exists app_settings_updated_at on public.app_settings;
create trigger app_settings_updated_at
  before update on public.app_settings
  for each row execute function public.set_updated_at();

alter table public.app_settings enable row level security;

drop policy if exists "admin full access" on public.app_settings;
create policy "admin full access" on public.app_settings
  for all to authenticated using (public.is_admin()) with check (public.is_admin());

revoke all on public.app_settings from anon;

-- ---------- 2. Payment method, bulk batch grouping, and proof photo ----------
alter table public.payments
  add column if not exists payment_method text not null default 'Cash',
  add column if not exists batch_id       uuid,
  add column if not exists receipt_path   text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'payments_payment_method_check'
  ) then
    alter table public.payments
      add constraint payments_payment_method_check
      check (payment_method in ('Cash', 'GCash', 'Maya', 'Bank Transfer', 'Other'));
  end if;
end $$;

create index if not exists payments_batch_idx  on public.payments (batch_id) where batch_id is not null;
create index if not exists payments_method_idx on public.payments (payment_method);

-- ---------- 3. Expense receipt photo ----------
alter table public.expenses
  add column if not exists receipt_path text;

-- ---------- 4. Shareable read-only member statement link ----------
alter table public.members
  add column if not exists share_token text;

create unique index if not exists members_share_token_unique
  on public.members (share_token)
  where share_token is not null;

-- Returns read-only statement JSON for ONLY the member matching p_token.
-- Runs as SECURITY DEFINER so anonymous visitors never get direct table access.
create or replace function public.get_public_member_statement(p_token text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_member          public.members%rowtype;
  v_payment_details text;
  v_shares          jsonb;
  v_payments        jsonb;
begin
  if p_token is null or char_length(btrim(p_token)) < 16 then
    return null;
  end if;

  select *
    into v_member
    from public.members
   where share_token = btrim(p_token)
   limit 1;

  if not found then
    return null;
  end if;

  select payment_details
    into v_payment_details
    from public.app_settings
   where id = 1;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',                 es.id,
        'expense_id',         e.id,
        'share_amount',       es.share_amount,
        'expense_description', e.description,
        'expense_category',   e.category,
        'expense_date',       e.expense_date,
        'is_payer',           (e.paid_by is not null and e.paid_by = es.member_id)
      )
      order by e.expense_date desc, e.created_at desc, es.id
    ),
    '[]'::jsonb
  )
    into v_shares
    from public.expense_shares es
    join public.expenses e on e.id = es.expense_id
   where es.member_id = v_member.id;

  select coalesce(
    jsonb_agg(
      jsonb_build_object(
        'id',                  p.id,
        'expense_share_id',    p.expense_share_id,
        'amount',              p.amount,
        'payment_date',        p.payment_date,
        'payment_method',      p.payment_method,
        'batch_id',            p.batch_id,
        'notes',               p.notes,
        'expense_description', e.description
      )
      order by p.payment_date desc, p.created_at desc, p.id
    ),
    '[]'::jsonb
  )
    into v_payments
    from public.payments p
    left join public.expense_shares es on es.id = p.expense_share_id
    left join public.expenses e on e.id = es.expense_id
   where p.member_id = v_member.id;

  return jsonb_build_object(
    'member', jsonb_build_object(
      'id',         v_member.id,
      'name',       v_member.name,
      'created_at', v_member.created_at
    ),
    'shares',          v_shares,
    'payments',        v_payments,
    'payment_details', coalesce(v_payment_details, '')
  );
end $$;

revoke all on function public.get_public_member_statement(text) from public;
grant execute on function public.get_public_member_statement(text) to anon, authenticated;

-- ---------- 5. Supabase Storage bucket for receipts & payment proofs ----------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'receipts',
  'receipts',
  false,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update
  set public             = excluded.public,
      file_size_limit    = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "admin receipts read"   on storage.objects;
drop policy if exists "admin receipts insert" on storage.objects;
drop policy if exists "admin receipts update" on storage.objects;
drop policy if exists "admin receipts delete" on storage.objects;

create policy "admin receipts read" on storage.objects
  for select to authenticated
  using (bucket_id = 'receipts' and public.is_admin());

create policy "admin receipts insert" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'receipts' and public.is_admin());

create policy "admin receipts update" on storage.objects
  for update to authenticated
  using (bucket_id = 'receipts' and public.is_admin())
  with check (bucket_id = 'receipts' and public.is_admin());

create policy "admin receipts delete" on storage.objects
  for delete to authenticated
  using (bucket_id = 'receipts' and public.is_admin());
