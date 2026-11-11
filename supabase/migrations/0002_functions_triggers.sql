-- =====================================================================
-- Utang Tracker :: 0002 functions and triggers
-- =====================================================================

-- ---------- updated_at ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

create trigger members_updated_at        before update on public.members        for each row execute function public.set_updated_at();
create trigger expenses_updated_at       before update on public.expenses       for each row execute function public.set_updated_at();
create trigger expense_shares_updated_at before update on public.expense_shares for each row execute function public.set_updated_at();
create trigger payments_updated_at       before update on public.payments       for each row execute function public.set_updated_at();

-- ---------- is_admin ----------
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from public.admin_users where user_id = auth.uid());
$$;

revoke all on function public.is_admin() from public, anon;
grant execute on function public.is_admin() to authenticated;

-- ---------- payment validation ----------
-- A payment must be made by the member who owns the share, and the expense payer's own
-- share is never a debt, so it cannot receive payments.
create or replace function public.validate_payment()
returns trigger language plpgsql as $$
declare
  v_share_member uuid;
  v_paid_by      uuid;
begin
  select es.member_id, e.paid_by
    into v_share_member, v_paid_by
    from public.expense_shares es
    join public.expenses e on e.id = es.expense_id
   where es.id = new.expense_share_id;

  if v_share_member is null then
    raise exception 'Expense share not found';
  end if;
  if v_share_member <> new.member_id then
    raise exception 'This expense share does not belong to the selected member';
  end if;
  if v_paid_by is not null and v_paid_by = v_share_member then
    raise exception 'The payer''s own share is not a debt and cannot receive payments';
  end if;
  return new;
end $$;

create trigger payments_validate
  before insert or update on public.payments
  for each row execute function public.validate_payment();

-- ---------- keep expense_shares.settled_amount in sync with payments ----------
create or replace function public.sync_share_settled()
returns trigger language plpgsql as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update public.expense_shares
       set settled_amount = coalesce((select sum(amount) from public.payments where expense_share_id = old.expense_share_id), 0)
     where id = old.expense_share_id;
  end if;
  if tg_op in ('INSERT', 'UPDATE') then
    update public.expense_shares
       set settled_amount = coalesce((select sum(amount) from public.payments where expense_share_id = new.expense_share_id), 0)
     where id = new.expense_share_id;
  end if;
  return null;
end $$;

create trigger payments_sync_settled
  after insert or update or delete on public.payments
  for each row execute function public.sync_share_settled();

-- ---------- save_expense ----------
-- Creates or updates an expense AND its shares in one transaction.
-- p_expense: { id?, description, category, total_amount, expense_date, paid_by?, notes? }
-- p_shares : [ { member_id, share_amount }, ... ]
-- Runs as the caller (SECURITY INVOKER) so Row Level Security still applies.
create or replace function public.save_expense(p_expense jsonb, p_shares jsonb)
returns uuid
language plpgsql
as $$
declare
  v_id       uuid          := nullif(p_expense->>'id', '')::uuid;
  v_total    numeric(12,2) := (p_expense->>'total_amount')::numeric;
  v_paid_by  uuid          := nullif(p_expense->>'paid_by', '')::uuid;
  v_sum      numeric(12,2);
  v_distinct int;
  v_blocked  text;
begin
  if p_shares is null or jsonb_typeof(p_shares) <> 'array' or jsonb_array_length(p_shares) = 0 then
    raise exception 'Select at least one participant';
  end if;

  select coalesce(sum((s->>'share_amount')::numeric), 0), count(distinct s->>'member_id')
    into v_sum, v_distinct
    from jsonb_array_elements(p_shares) s;

  if v_distinct <> jsonb_array_length(p_shares) then
    raise exception 'A participant was added more than once';
  end if;
  if v_sum > v_total then
    raise exception 'Shares add up to % which exceeds the expense total of %', v_sum, v_total;
  end if;

  if v_id is null then
    insert into public.expenses (description, category, total_amount, expense_date, paid_by, notes)
    values (
      btrim(p_expense->>'description'),
      p_expense->>'category',
      v_total,
      (p_expense->>'expense_date')::date,
      v_paid_by,
      nullif(btrim(coalesce(p_expense->>'notes', '')), '')
    )
    returning id into v_id;
  else
    update public.expenses
       set description  = btrim(p_expense->>'description'),
           category     = p_expense->>'category',
           total_amount = v_total,
           expense_date = (p_expense->>'expense_date')::date,
           paid_by      = v_paid_by,
           notes        = nullif(btrim(coalesce(p_expense->>'notes', '')), '')
     where id = v_id;
    if not found then
      raise exception 'Expense not found';
    end if;

    -- Participants who already made payments cannot be removed silently.
    select string_agg(m.name, ', ')
      into v_blocked
      from public.expense_shares es
      join public.members m on m.id = es.member_id
     where es.expense_id = v_id
       and es.member_id not in (select (s->>'member_id')::uuid from jsonb_array_elements(p_shares) s)
       and exists (select 1 from public.payments p where p.expense_share_id = es.id);
    if v_blocked is not null then
      raise exception 'Cannot remove participant(s) who already have payments: %. Delete those payments first.', v_blocked;
    end if;

    delete from public.expense_shares
     where expense_id = v_id
       and member_id not in (select (s->>'member_id')::uuid from jsonb_array_elements(p_shares) s);
  end if;

  -- The payer's own share is not a debt, so it must not have payments.
  if v_paid_by is not null and exists (
    select 1 from public.payments p
      join public.expense_shares es on es.id = p.expense_share_id
     where es.expense_id = v_id and es.member_id = v_paid_by
  ) then
    raise exception 'The selected payer already has payments recorded on this expense. Delete those payments first.';
  end if;

  insert into public.expense_shares (expense_id, member_id, share_amount)
  select v_id, (s->>'member_id')::uuid, (s->>'share_amount')::numeric
    from jsonb_array_elements(p_shares) s
  on conflict (expense_id, member_id)
  do update set share_amount = excluded.share_amount;

  return v_id;
end $$;

revoke all on function public.save_expense(jsonb, jsonb) from public, anon;
grant execute on function public.save_expense(jsonb, jsonb) to authenticated;
