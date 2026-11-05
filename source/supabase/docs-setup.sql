-- =====================================================================
-- أصيل — المستندات: Receipt Voucher و Tax Invoice و Progress Invoice
-- يُنفَّذ مرة واحدة: SQL Editor ← New query ← الصق ← Run   (آمن للتكرار)
-- الترقيم داخل قاعدة البيانات نفسها، فلا يتكرر رقم أبداً حتى لو أصدر شخصان مستنداً في نفس اللحظة.
--   rv  : Receipt Voucher  (01023، 01024 …)
--   inv : Tax Invoice و Progress Invoice معاً (INV/2026/438 …)
-- =====================================================================

-- ---------- 1) المستندات ----------
create table if not exists public.docs (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 2) العدّادات: آخر رقم صدر لكل نوع ----------
create table if not exists public.doc_counters (
  counter text primary key check (counter in ('rv','inv')),
  last    int  not null default 0
);
-- سند القبض يكمل بعد آخر رقم صدر (01022)، والفواتير تكمل من «آخر رقم فاتورة صدر» في إعدادات التطبيق
insert into public.doc_counters (counter, last) values ('rv', 1022) on conflict (counter) do nothing;
insert into public.doc_counters (counter, last)
  select 'inv', coalesce((select (data->>'invSeq')::int from public.settings where id = 'company' and (data->>'invSeq') ~ '^\d+$'), 0)
  on conflict (counter) do nothing;

-- ---------- 3) الرقم التالي (يقفل العدّاد حتى ينتهي، فلا يأخذ اثنان نفس الرقم) ----------
create or replace function public.next_doc_no(p_counter text) returns int
language plpgsql security definer set search_path = public as $$
declare cur int; used int; nxt int;
begin
  if public.my_role() is distinct from 'admin' then raise exception 'not allowed'; end if;
  select last into cur from public.doc_counters where counter = p_counter for update;
  if not found then raise exception 'unknown counter %', p_counter; end if;
  -- احتياط: لا ينزل أبداً تحت أكبر رقم مستخدم فعلاً
  select coalesce(max((data->>'seq')::int), 0) into used from public.docs
   where data->>'counter' = p_counter and (data->>'seq') ~ '^\d+$';
  nxt := greatest(cur, used) + 1;
  update public.doc_counters set last = nxt where counter = p_counter;
  return nxt;
end $$;

-- تعديل «آخر رقم صدر» من التطبيق (لا يقبل رقماً أقل من رقم صدر فعلاً)
create or replace function public.set_doc_counter(p_counter text, p_last int) returns int
language plpgsql security definer set search_path = public as $$
declare used int;
begin
  if public.my_role() is distinct from 'admin' then raise exception 'not allowed'; end if;
  select coalesce(max((data->>'seq')::int), 0) into used from public.docs
   where data->>'counter' = p_counter and (data->>'seq') ~ '^\d+$';
  if p_last < used then raise exception 'below issued %', used; end if;
  update public.doc_counters set last = p_last where counter = p_counter;
  if not found then raise exception 'unknown counter %', p_counter; end if;
  return p_last;
end $$;

revoke all on function public.next_doc_no(text), public.set_doc_counter(text, int) from public, anon;
grant execute on function public.next_doc_no(text), public.set_doc_counter(text, int) to authenticated;

-- ---------- 4) الحماية: أصحاب الصلاحيات الكاملة فقط ----------
alter table public.docs enable row level security;
alter table public.doc_counters enable row level security;
do $$ declare p record; begin
  for p in select policyname, tablename from pg_policies where schemaname = 'public' and tablename in ('docs','doc_counters') loop
    execute format('drop policy %I on public.%I', p.policyname, p.tablename);
  end loop;
end $$;
revoke all on public.docs, public.doc_counters from anon;
grant select, insert, update on public.docs to authenticated;
revoke delete on public.docs from authenticated;             -- المستند المرقّم لا يُحذف، بل يُلغى
grant select on public.doc_counters to authenticated;
revoke insert, update, delete on public.doc_counters from authenticated; -- العدّاد يتغيّر بالدالتين أعلاه فقط
create policy docs_read   on public.docs for select to authenticated using (public.my_role() = 'admin');
create policy docs_insert on public.docs for insert to authenticated with check (public.my_role() = 'admin');
create policy docs_update on public.docs for update to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy counters_read on public.doc_counters for select to authenticated using (public.my_role() = 'admin');

-- ---------- 5) التحديث اللحظي ----------
do $$ begin
  if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'docs') then
    execute 'alter publication supabase_realtime add table public.docs';
  end if;
end $$;

-- ---------- 6) النسخة الاحتياطية اليومية تشمل المستندات ----------
create or replace function public.make_backup(p_kind text default 'auto') returns bigint
language plpgsql security definer set search_path = public as $$
declare d jsonb; new_id bigint;
begin
  if auth.uid() is not null and public.my_role() is distinct from 'admin' then
    raise exception 'not allowed';
  end if;
  d := jsonb_build_object(
    'app', 'aseel', 'version', 1, 'at', to_char(now() at time zone 'utc', 'YYYY-MM-DD"T"HH24:MI:SS"Z"'), 'by', 'نسخة تلقائية',
    'sites',   coalesce((select jsonb_object_agg(s.id, coalesce(s.data,'{}'::jsonb) || coalesce(f.data,'{}'::jsonb))
                         from public.sites s left join public.site_fin f on f.id = s.id), '{}'::jsonb),
    'marks',   coalesce((select jsonb_object_agg(id, data) from public.marks), '{}'::jsonb),
    'custody', coalesce((select jsonb_object_agg(id, data) from public.custody), '{}'::jsonb),
    'docs',    coalesce((select jsonb_object_agg(id, data) from public.docs), '{}'::jsonb),
    'settings',coalesce((select data from public.settings where id = 'company'), '{}'::jsonb));
  insert into public.backups (kind, size, data) values (p_kind, length(d::text), d) returning id into new_id;
  delete from public.backups where kind = 'auto' and id not in (select id from public.backups where kind = 'auto' order by at desc limit 30);
  return new_id;
end $$;

-- ---------- 7) فحص: يجب أن يظهر العدّادان ----------
select counter as "العدّاد", last as "آخر رقم صدر" from public.doc_counters order by 1;
