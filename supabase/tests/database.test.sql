\set ON_ERROR_STOP 0
\pset pager off
-- 0. fresh database is empty
do $$ begin
  assert (select count(*) from members)=0 and (select count(*) from expenses)=0 and (select count(*) from payments)=0, 'tables must start empty';
  raise notice 'PASS starts empty (no seed data)';
end $$;

insert into auth.users (id,email) values ('aaaaaaaa-0000-4000-8000-000000000001','admin@x.com'),('bbbbbbbb-0000-4000-8000-000000000002','stranger@x.com');
insert into admin_users (user_id) values ('aaaaaaaa-0000-4000-8000-000000000001');

-- 1. anon blocked
set role anon;
do $$ begin
  begin perform 1 from members; raise notice 'FAIL anon can read members'; exception when insufficient_privilege then raise notice 'PASS anon cannot read members'; end;
end $$;
reset role;

-- 2. non-admin authenticated sees nothing and cannot write
set role authenticated; set request.jwt.claim.sub = 'bbbbbbbb-0000-4000-8000-000000000002';
do $$ begin
  begin insert into members(name) values ('Hacker'); raise notice 'FAIL stranger inserted'; exception when others then raise notice 'PASS stranger blocked from insert (%)', sqlerrm; end;
  assert (select count(*) from members)=0;
  assert public.is_admin() = false;
  begin perform 1 from admin_users; raise notice 'FAIL admin_users readable'; exception when insufficient_privilege then raise notice 'PASS admin_users unreadable by clients'; end;
end $$;
reset role;

-- 3. admin flow
set role authenticated; set request.jwt.claim.sub = 'aaaaaaaa-0000-4000-8000-000000000001';
insert into members(id,name) values
 ('00000000-0000-4000-8000-00000000000a','Ana'),('00000000-0000-4000-8000-00000000000b','Ben'),('00000000-0000-4000-8000-00000000000c','Cy');

do $$ declare v uuid; begin
  assert public.is_admin() = true;
  -- duplicate name (case-insensitive)
  begin insert into members(name) values ('  ana '); raise notice 'FAIL duplicate member allowed'; exception when unique_violation then raise notice 'PASS duplicate member name blocked'; end;

  -- mismatched shares rejected, nothing saved
  begin
    perform save_expense('{"description":"Bad","category":"Lunch","total_amount":"100.00","expense_date":"2025-03-03","paid_by":"00000000-0000-4000-8000-00000000000a"}'::jsonb,
      '[{"member_id":"00000000-0000-4000-8000-00000000000a","share_amount":"50.00"},{"member_id":"00000000-0000-4000-8000-00000000000b","share_amount":"40.00"}]'::jsonb);
    raise notice 'FAIL mismatch accepted';
  exception when others then raise notice 'PASS mismatch rejected: %', sqlerrm; end;
  assert (select count(*) from expenses)=0, 'failed save must leave nothing behind';

  -- valid save, payer Ana is also a participant
  v := save_expense('{"description":"Lunch","category":"Lunch","total_amount":"100.00","expense_date":"2025-03-03","paid_by":"00000000-0000-4000-8000-00000000000a","notes":"  "}'::jsonb,
      '[{"member_id":"00000000-0000-4000-8000-00000000000a","share_amount":"33.34"},{"member_id":"00000000-0000-4000-8000-00000000000b","share_amount":"33.33"},{"member_id":"00000000-0000-4000-8000-00000000000c","share_amount":"33.33"}]'::jsonb);
  assert (select count(*) from expense_shares where expense_id=v)=3;
  assert (select notes from expenses where id=v) is null, 'blank notes -> null';
  raise notice 'PASS save_expense creates expense + 3 shares atomically';
end $$;

-- 4. payments + triggers
do $$ declare s_ben uuid; s_ana uuid; p uuid; e uuid; begin
  select id into e from expenses limit 1;
  select id into s_ben from expense_shares where member_id='00000000-0000-4000-8000-00000000000b';
  select id into s_ana from expense_shares where member_id='00000000-0000-4000-8000-00000000000a';

  insert into payments(member_id,expense_share_id,amount,payment_date) values ('00000000-0000-4000-8000-00000000000b',s_ben,10.10,'2025-03-04') returning id into p;
  assert (select settled_amount from expense_shares where id=s_ben)=10.10;
  insert into payments(member_id,expense_share_id,amount,payment_date) values ('00000000-0000-4000-8000-00000000000b',s_ben,0.20,'2025-03-05');
  assert (select settled_amount from expense_shares where id=s_ben)=10.30, 'partial payments accumulate exactly';
  raise notice 'PASS settled_amount tracks inserts (10.10 + 0.20 = 10.30)';

  update payments set amount=20.00 where id=p;
  assert (select settled_amount from expense_shares where id=s_ben)=20.20;
  raise notice 'PASS settled_amount tracks edits';
  delete from payments where id=p;
  assert (select settled_amount from expense_shares where id=s_ben)=0.20;
  raise notice 'PASS settled_amount tracks deletes';

  begin insert into payments(member_id,expense_share_id,amount) values ('00000000-0000-4000-8000-00000000000c',s_ben,5); raise notice 'FAIL wrong member accepted'; exception when others then raise notice 'PASS wrong member rejected: %', sqlerrm; end;
  begin insert into payments(member_id,expense_share_id,amount) values ('00000000-0000-4000-8000-00000000000a',s_ana,5); raise notice 'FAIL payer share payable'; exception when others then raise notice 'PASS payer''s own share cannot be paid: %', sqlerrm; end;
  begin insert into payments(member_id,expense_share_id,amount) values ('00000000-0000-4000-8000-00000000000b',s_ben,-5); raise notice 'FAIL negative accepted'; exception when check_violation then raise notice 'PASS negative amount rejected'; end;
  begin insert into payments(member_id,expense_share_id,amount) values ('00000000-0000-4000-8000-00000000000b',s_ben,0); raise notice 'FAIL zero accepted'; exception when check_violation then raise notice 'PASS zero amount rejected'; end;
  begin insert into expenses(description,category,total_amount) values ('x','Snack',-1); raise notice 'FAIL negative expense'; exception when check_violation then raise notice 'PASS negative expense rejected'; end;
  begin insert into expenses(description,category,total_amount) values ('x','Brunch',5); raise notice 'FAIL bad category'; exception when check_violation then raise notice 'PASS invalid category rejected'; end;
end $$;

-- 5. editing an expense
do $$ declare e uuid; s_ben uuid; begin
  select id into e from expenses limit 1;
  select id into s_ben from expense_shares where member_id='00000000-0000-4000-8000-00000000000b';
  -- removing Ben (who has a payment) is blocked
  begin
    perform save_expense(('{"id":"'||e||'","description":"Lunch","category":"Lunch","total_amount":"100.00","expense_date":"2025-03-03","paid_by":"00000000-0000-4000-8000-00000000000a"}')::jsonb,
      '[{"member_id":"00000000-0000-4000-8000-00000000000a","share_amount":"50.00"},{"member_id":"00000000-0000-4000-8000-00000000000c","share_amount":"50.00"}]'::jsonb);
    raise notice 'FAIL removed participant with payments';
  exception when others then raise notice 'PASS cannot remove participant with payments: %', sqlerrm; end;
  assert (select count(*) from expense_shares where expense_id=e)=3, 'rolled back';
  -- changing amounts keeps share id and its payments, adds a participant-less recalculation
  perform save_expense(('{"id":"'||e||'","description":"Lunch (edited)","category":"Dinner","total_amount":"120.00","expense_date":"2025-03-03","paid_by":"00000000-0000-4000-8000-00000000000a"}')::jsonb,
      '[{"member_id":"00000000-0000-4000-8000-00000000000a","share_amount":"40.00"},{"member_id":"00000000-0000-4000-8000-00000000000b","share_amount":"40.00"},{"member_id":"00000000-0000-4000-8000-00000000000c","share_amount":"40.00"}]'::jsonb);
  assert (select id from expense_shares where member_id='00000000-0000-4000-8000-00000000000b')=s_ben, 'share row preserved';
  assert (select settled_amount from expense_shares where id=s_ben)=0.20, 'payments preserved on edit';
  assert (select share_amount from expense_shares where id=s_ben)=40.00;
  assert (select count(*) from expenses)=1, 'edit must not create a second expense';
  raise notice 'PASS editing recalculates shares and preserves payments';
  -- remove Cy (no payments): allowed
  perform save_expense(('{"id":"'||e||'","description":"Lunch (edited)","category":"Dinner","total_amount":"80.00","expense_date":"2025-03-03","paid_by":"00000000-0000-4000-8000-00000000000a"}')::jsonb,
      '[{"member_id":"00000000-0000-4000-8000-00000000000a","share_amount":"40.00"},{"member_id":"00000000-0000-4000-8000-00000000000b","share_amount":"40.00"}]'::jsonb);
  assert (select count(*) from expense_shares)=2;
  raise notice 'PASS participant without payments can be removed';
end $$;

-- 6. referential integrity
do $$ begin
  begin delete from members where id='00000000-0000-4000-8000-00000000000b'; raise notice 'FAIL deleted member with shares'; exception when foreign_key_violation then raise notice 'PASS member with records cannot be deleted (23503)'; end;
  delete from members where id='00000000-0000-4000-8000-00000000000c';
  raise notice 'PASS member without records can be deleted';
  delete from expenses;
  assert (select count(*) from expense_shares)=0 and (select count(*) from payments)=0;
  raise notice 'PASS deleting an expense cascades to shares and payments';
  assert (select updated_at from members where name='Ana') >= (select created_at from members where name='Ana');
end $$;
reset role;
