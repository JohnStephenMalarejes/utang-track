-- =====================================================================
-- Utang Tracker :: 0001 schema
-- Tables, constraints, indexes. No data is inserted (the app starts empty).
-- Money is stored as numeric(12,2). The app converts to integer cents
-- before doing any arithmetic, so floating-point drift cannot occur.
-- =====================================================================

-- ---------- members ----------
create table public.members (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(btrim(name)) between 1 and 120),
  contact     text check (contact is null or char_length(contact) <= 200),
  notes       text check (notes is null or char_length(notes) <= 1000),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index members_name_unique on public.members (lower(btrim(name)));

-- ---------- expenses ----------
create table public.expenses (
  id            uuid primary key default gen_random_uuid(),
  description   text not null check (char_length(btrim(description)) between 1 and 200),
  category      text not null check (category in ('Breakfast','Lunch','Dinner','Snack','Pre-workout','Other')),
  total_amount  numeric(12,2) not null check (total_amount > 0),
  expense_date  date not null default current_date,
  paid_by       uuid references public.members(id) on delete set null,  -- null = payer is not a tracked member
  notes         text check (notes is null or char_length(notes) <= 1000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index expenses_date_idx     on public.expenses (expense_date desc);
create index expenses_category_idx on public.expenses (category);
create index expenses_paid_by_idx  on public.expenses (paid_by);

-- ---------- expense_shares ----------
create table public.expense_shares (
  id              uuid primary key default gen_random_uuid(),
  expense_id      uuid not null references public.expenses(id) on delete cascade,
  member_id       uuid not null references public.members(id) on delete restrict,
  share_amount    numeric(12,2) not null check (share_amount >= 0),
  settled_amount  numeric(12,2) not null default 0 check (settled_amount >= 0), -- maintained by trigger from payments
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now(),
  unique (expense_id, member_id)
);
create index expense_shares_member_idx  on public.expense_shares (member_id);
create index expense_shares_expense_idx on public.expense_shares (expense_id);

-- ---------- payments ----------
create table public.payments (
  id                uuid primary key default gen_random_uuid(),
  member_id         uuid not null references public.members(id) on delete restrict,
  expense_share_id  uuid not null references public.expense_shares(id) on delete cascade,
  amount            numeric(12,2) not null check (amount > 0),
  payment_date      date not null default current_date,
  notes             text check (notes is null or char_length(notes) <= 1000),
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
create index payments_member_idx on public.payments (member_id);
create index payments_share_idx  on public.payments (expense_share_id);
create index payments_date_idx   on public.payments (payment_date desc);

-- ---------- admin_users ----------
-- Whoever is listed here is the administrator. RLS is enabled with NO policies, so
-- clients can never read or write this table; only is_admin() (security definer) can.
create table public.admin_users (
  user_id     uuid primary key references auth.users(id) on delete cascade,
  created_at  timestamptz not null default now()
);
