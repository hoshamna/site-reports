-- Assertions on the database after security-setup.sql and backup-setup.sql. Any failure raises an error.
\set ON_ERROR_STOP 1
create or replace function pg_temp.expect(ok boolean, what text) returns void language plpgsql as $$
begin if not coalesce(ok, false) then raise exception 'FAILED: %', what; end if; raise notice 'ok: %', what; end $$;

-- migration
select pg_temp.expect((select data->>'total' from site_fin where id = 's1') = '85000', 'finance moved to site_fin');
select pg_temp.expect(not exists (select 1 from sites where data ?| array['total','payments','purchases']), 'no finance left in sites');
select pg_temp.expect((select data ? 'users' from settings where id = 'company') = false, 'users removed from settings');
select pg_temp.expect((select data->>'cuMainHolder' from settings where id = 'company') = 'u1', 'custody main holder kept');
select pg_temp.expect((select count(*) from legacy_pins) = 2, 'old PINs kept for first sign-in');
select pg_temp.expect(not exists (select 1 from settings where id = '_migrated'), 'old seed flag removed');
select pg_temp.expect((select public from storage.buckets where id = 'media') = false, 'images bucket is private');

-- accounts as the accounts function would create them
insert into profiles (id, auth_id, name, role) values
  ('u1', '11111111-1111-1111-1111-111111111111', 'هشام', 'admin'),
  ('u2', '22222222-2222-2222-2222-222222222222', 'أحمد', 'buyer'),
  ('u3', '33333333-3333-3333-3333-333333333333', 'محمد', 'eng');
delete from legacy_pins;
insert into cu_editors (profile_id) select id from profiles where name in ('هشام', 'GM') on conflict do nothing; -- as custody-guard.sql does once the accounts exist
create temp table r (k text, v text); grant all on r to anon, authenticated;

-- signed out
set role anon;
do $$ begin perform 1 from sites; insert into r values ('anon_sites', 'allowed'); exception when others then insert into r values ('anon_sites', 'denied'); end $$;
insert into r select 'anon_list', count(*)::text from login_list();
reset role;
select pg_temp.expect((select v from r where k = 'anon_sites') = 'denied', 'signed-out users cannot read sites');
select pg_temp.expect((select v from r where k = 'anon_list') = '3', 'sign-in list shows names');
select pg_temp.expect((select string_agg(parameter_name, ',' order by ordinal_position) from information_schema.parameters p join information_schema.routines r on r.specific_name = p.specific_name
  where r.routine_name = 'login_list' and p.parameter_mode = 'OUT') = 'id,name,role,legacy', 'sign-in list returns names and roles only, no PIN data');

-- buyer
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into r select 'b_fin', count(*)::text from site_fin;
insert into r select 'b_cu', string_agg(id, ',' order by id) from custody;
insert into r select 'b_bk', count(*)::text from backups;
insert into custody (id, data) values ('c9', '{"kind":"exp","by":"أحمد","amount":5}');
do $$ begin insert into custody (id, data) values ('c10', '{"kind":"dep","amount":999}'); insert into r values ('b_dep', 'allowed'); exception when others then insert into r values ('b_dep', 'denied'); end $$;
update sites set data = '{}' where id = 's1';
do $$ begin perform public.make_backup('manual'); insert into r values ('b_mk', 'allowed'); exception when others then insert into r values ('b_mk', 'denied'); end $$;
do $$ begin insert into settings values ('company', '{}') on conflict (id) do update set data = '{}'; insert into r values ('b_set', 'allowed'); exception when others then insert into r values ('b_set', 'denied'); end $$;
reset role;
select pg_temp.expect((select v from r where k = 'b_fin') = '0', 'buyer cannot read finance');
select pg_temp.expect((select v from r where k = 'b_cu') = 'c2,c3', 'buyer sees only his own custody entries');
select pg_temp.expect((select created_by from custody where id = 'c9') = '22222222-2222-2222-2222-222222222222', 'buyer can add an invoice, stamped with his account');
select pg_temp.expect((select v from r where k = 'b_dep') = 'denied', 'buyer cannot record a deposit');
select pg_temp.expect((select data->>'name' from sites where id = 's1') = 'فيلا', 'buyer cannot change a site');
select pg_temp.expect((select v from r where k = 'b_bk') = '0' and (select v from r where k = 'b_mk') = 'denied', 'buyer cannot see or make backups');
select pg_temp.expect((select v from r where k = 'b_set') = 'denied', 'buyer cannot change company settings');

-- engineer
set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into r select 'e_fin', count(*)::text from site_fin;
update sites set data = data || '{"notes":"x"}' where id = 's1';
delete from sites where id = 's2';
reset role;
select pg_temp.expect((select v from r where k = 'e_fin') = '0', 'engineer cannot read finance');
select pg_temp.expect((select data->>'notes' from sites where id = 's1') = 'x', 'engineer can edit a site');
select pg_temp.expect(exists (select 1 from sites where id = 's2'), 'engineer cannot delete a site');

-- full access
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into r select 'a_fin', count(*)::text from site_fin;
insert into r select 'a_cu', count(*)::text from custody;
select public.make_backup('manual');
reset role;
select pg_temp.expect((select v from r where k = 'a_fin') = '2' and (select v from r where k = 'a_cu') = '5', 'full access sees finance and all custody');
select pg_temp.expect((select (data->'sites'->'s1'->>'total') from backups order by id desc limit 1) = '85000', 'backup contains sites with their finance');

-- account without a profile (e.g. someone signing themselves up)
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
insert into r select 'x_sites', count(*)::text from sites;
reset role;
select pg_temp.expect((select v from r where k = 'x_sites') = '0', 'an account without a profile sees nothing');

-- backups keep the last 30 (run as the nightly job does: no signed-in user)
reset request.jwt.claim.sub;
do $$ begin for i in 1..35 loop perform public.make_backup('auto'); end loop; end $$;
select pg_temp.expect((select count(*) from backups where kind = 'auto') = 30, 'only the last 30 automatic backups are kept');

-- reminder key is readable by the server only
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
do $$ begin perform 1 from app_secrets; insert into r values ('sec', 'allowed'); exception when others then insert into r values ('sec', 'denied'); end $$;
reset role; reset request.jwt.claim.sub;
select pg_temp.expect((select v from r where k = 'sec') = 'denied', 'the reminder key is hidden even from full-access users');
select pg_temp.expect(length((select value from app_secrets where id = 'cron')) = 64, 'a random reminder key was created');

-- documents: numbering in the database, full access only, never deleted
select pg_temp.expect((select last from doc_counters where counter = 'rv') = 1022, 'receipt vouchers continue after 01022');
select pg_temp.expect((select last from doc_counters where counter = 'inv') = 437, 'invoices continue from the app''s last invoice number');
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
insert into r select 'rv1', public.next_doc_no('rv')::text;
insert into r select 'rv2', public.next_doc_no('rv')::text;
insert into r select 'inv1', public.next_doc_no('inv')::text;
insert into docs (id, data) values ('d1', '{"kind":"tax","counter":"inv","seq":500}');
insert into r select 'inv2', public.next_doc_no('inv')::text;
do $$ begin perform public.set_doc_counter('inv', 100); insert into r values ('lower', 'allowed'); exception when others then insert into r values ('lower', 'denied'); end $$;
do $$ begin delete from docs where id = 'd1'; if found then insert into r values ('del', 'allowed'); else insert into r values ('del', 'denied'); end if; exception when others then insert into r values ('del', 'denied'); end $$;
insert into r select 'a_docs', count(*)::text from docs;
set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
do $$ begin perform public.next_doc_no('rv'); insert into r values ('b_no', 'allowed'); exception when others then insert into r values ('b_no', 'denied'); end $$;
insert into r select 'b_docs', count(*)::text from docs;
do $$ begin insert into docs (id, data) values ('d2', '{}'); insert into r values ('b_ins', 'allowed'); exception when others then insert into r values ('b_ins', 'denied'); end $$;
set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into r select 'e_cnt', count(*)::text from doc_counters;
reset role; reset request.jwt.claim.sub;
select pg_temp.expect((select v from r where k = 'rv1') = '1023' and (select v from r where k = 'rv2') = '1024', 'each receipt voucher gets the next number');
select pg_temp.expect((select v from r where k = 'inv1') = '438', 'tax and progress invoices share the invoice counter');
select pg_temp.expect((select v from r where k = 'inv2') = '501', 'the counter never goes below a number already used');
select pg_temp.expect((select v from r where k = 'lower') = 'denied', 'the counter cannot be set below an issued number');
select pg_temp.expect((select v from r where k = 'del') = 'denied' and (select v from r where k = 'a_docs') = '1', 'issued documents cannot be deleted');
select pg_temp.expect((select v from r where k = 'b_no') = 'denied' and (select v from r where k = 'b_docs') = '0' and (select v from r where k = 'b_ins') = 'denied', 'a buyer cannot see, number or add documents');
select pg_temp.expect((select v from r where k = 'e_cnt') = '0', 'an engineer cannot see the counters');
do $$ begin perform public.make_backup('auto'); end $$;
select pg_temp.expect((select data->'docs' ? 'd1' from backups order by id desc limit 1), 'the daily backup includes the documents');

-- custody guard: only Hesham and GM edit, delete or review invoices; others complete theirs until «✓ حفظ» or 24 hours
insert into profiles (id, auth_id, name, role) values ('u4', '44444444-4444-4444-4444-444444444444', 'سالم', 'admin') on conflict do nothing;
update settings set data = data || '{"cuHolders":["أحمد"]}' where id = 'company';
create or replace function pg_temp.now_ms() returns bigint language sql as $f$ select (extract(epoch from now()) * 1000)::bigint $f$;
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
insert into custody (id, data) values ('g1', jsonb_build_object('kind','exp','by','محمد','holder','main','hv',2,'hvm',1,'rev',jsonb_build_object('by','me'),'amount',50,'createdAt',pg_temp.now_ms()));
update custody set data = data || '{"holder":"main","rev":{"by":"me"},"amount":60}' where id = 'g1';
insert into custody (id, data) values ('g4', jsonb_build_object('kind','exp','amount',9,'createdAt',pg_temp.now_ms()));
do $$ begin delete from custody where id = 'g4'; insert into r values ('g_del_own', case when found then 'allowed' else 'none' end); exception when others then insert into r values ('g_del_own', 'denied'); end $$;
insert into custody (id, data) values ('g5', jsonb_build_object('kind','exp','amount',9,'createdAt',pg_temp.now_ms() - 2*86400000));
do $$ begin update custody set data = data || '{"amount":1}' where id = 'g5'; insert into r values ('g_old', 'allowed'); exception when others then insert into r values ('g_old', 'denied'); end $$;
reset role;
select pg_temp.expect((select data->>'holder' from custody where id = 'g1') = 'أحمد', 'an employee who holds custody: his invoice goes to his own custody, whatever the app sent');
select pg_temp.expect((select data->>'by' from custody where id = 'g1') = 'أحمد', 'an invoice is recorded in the name of who uploaded it');
select pg_temp.expect(not (select data ? 'rev' from custody where id = 'g1') and not (select data ? 'hvm' from custody where id = 'g1'), 'an employee cannot mark his invoice reviewed');
select pg_temp.expect((select (data->>'amount')::int from custody where id = 'g1') = 60, 'an employee can complete his invoice before saving it');
select pg_temp.expect((select v from r where k = 'g_del_own') = 'denied' and exists (select 1 from custody where id = 'g4'), 'an employee cannot delete even his own invoice');
select pg_temp.expect((select v from r where k = 'g_old') = 'denied', 'an unsaved invoice locks itself after 24 hours');
set role authenticated; set request.jwt.claim.sub = '22222222-2222-2222-2222-222222222222';
update custody set data = data || '{"ok":true,"amount":61}' where id = 'g1';
do $$ begin update custody set data = data || '{"amount":999}' where id = 'g1'; insert into r values ('g_upd', 'allowed'); exception when others then insert into r values ('g_upd', 'denied'); end $$;
reset role;
select pg_temp.expect((select (data->>'amount')::int from custody where id = 'g1') = 61 and (select v from r where k = 'g_upd') = 'denied', 'after «✓ حفظ» the employee can no longer change it');
-- another full-access user who is not Hesham or GM
set role authenticated; set request.jwt.claim.sub = '44444444-4444-4444-4444-444444444444';
do $$ begin update custody set data = data || '{"amount":5}' where id = 'g1'; insert into r values ('s_upd', 'allowed'); exception when others then insert into r values ('s_upd', 'denied'); end $$;
do $$ begin update custody set data = data || '{"rev":{"by":"سالم"}}' where id = 'g4'; insert into r values ('s_rev', 'allowed'); exception when others then insert into r values ('s_rev', 'denied'); end $$;
do $$ begin delete from custody where id = 'g1'; insert into r values ('s_del', 'allowed'); exception when others then insert into r values ('s_del', 'denied'); end $$;
insert into custody (id, data) values ('s_dep', '{"kind":"dep","amount":500}');
update custody set data = data || '{"amount":600}' where id = 's_dep';
reset role;
select pg_temp.expect((select v from r where k = 's_upd') = 'denied' and (select v from r where k = 's_rev') = 'denied' and (select v from r where k = 's_del') = 'denied', 'another full-access user cannot change, review or delete invoices');
select pg_temp.expect((select (data->>'amount')::int from custody where id = 's_dep') = 600, 'deposits stay as before for full-access users');
-- Hesham
set role authenticated; set request.jwt.claim.sub = '11111111-1111-1111-1111-111111111111';
update custody set data = data || '{"rev":{"by":"هشام"},"holder":"main","hvm":1,"amount":62}' where id = 'g1';
delete from custody where id = 'g4';
reset role;
select pg_temp.expect((select data->>'holder' from custody where id = 'g1') = 'main' and (select data ? 'rev' from custody where id = 'g1') and (select (data->>'amount')::int from custody where id = 'g1') = 62, 'Hesham can review, edit and choose the custody of any invoice');
select pg_temp.expect(not exists (select 1 from custody where id = 'g4'), 'Hesham can delete an invoice');
set role authenticated; set request.jwt.claim.sub = '33333333-3333-3333-3333-333333333333';
insert into custody (id, data) values ('g3', jsonb_build_object('kind','exp','holder','محمد','amount',7,'createdAt',pg_temp.now_ms()));
reset role;
select pg_temp.expect((select data->>'holder' from custody where id = 'g3') = 'main', 'an employee without custody: his invoice stays on the main custody');
