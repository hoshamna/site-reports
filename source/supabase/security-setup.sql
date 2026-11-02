-- =====================================================================
-- أصيل — الأمان الحقيقي: حسابات الدخول والصلاحيات داخل قاعدة البيانات
-- يُنفَّذ مرة واحدة في Supabase: SQL Editor ← New query ← الصق ← Run
-- آمن للتكرار: لو نُفّذ مرة ثانية لا يكرر نقل البيانات.
-- =====================================================================

-- ---------- 1) المستخدمون ----------
create table if not exists public.profiles (
  id         text primary key,                 -- معرّف المستخدم داخل التطبيق
  auth_id    uuid unique,                      -- حسابه في Supabase Auth
  name       text not null,
  role       text not null check (role in ('admin','eng','buyer')),
  data       jsonb not null default '{}'::jsonb, -- mustChange, canBackup, notifyLow
  updated_at timestamptz not null default now()
);
create unique index if not exists profiles_name_key on public.profiles (lower(trim(name)));

-- رموز الدخول القديمة (قبل الحسابات) — لا يقرؤها إلا الخادم، وتُحذف عند أول دخول لكل مستخدم
create table if not exists public.legacy_pins (
  id    text primary key,
  name  text not null,
  role  text not null,
  h     text not null,
  data  jsonb not null default '{}'::jsonb,
  fails int  not null default 0
);

-- ---------- 2) مالية المواقع في جدول منفصل ----------
create table if not exists public.site_fin (
  id         text primary key,
  data       jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now()
);

-- ---------- 3) من أنشأ حركة العهدة ----------
alter table public.custody add column if not exists created_by uuid default auth.uid();

-- ---------- 4) نقل البيانات (مرة واحدة) ----------
do $$
declare fin_keys text[] := array['total','payments','purchases','labor','otherCosts','quotes','quoteNo','schedule'];
begin
  -- مالية المواقع: انسخها إلى site_fin ثم احذفها من sites
  insert into public.site_fin (id, data)
  select s.id, coalesce((select jsonb_object_agg(k, v) from jsonb_each(s.data) as e(k, v) where k = any(fin_keys)), '{}'::jsonb)
  from public.sites s
  on conflict (id) do nothing;
  update public.sites set data = data - fin_keys
  where data ?| fin_keys and id in (select id from public.site_fin);

  -- المستخدمون القدامى من الإعدادات إلى legacy_pins، ثم احذفهم من الإعدادات
  insert into public.legacy_pins (id, name, role, h, data)
  select u->>'id', u->>'name', coalesce(u->>'role','admin'), u->>'h',
         jsonb_strip_nulls(jsonb_build_object('mustChange', u->'mustChange', 'canBackup', u->'canBackup', 'notifyLow', u->'notifyLow'))
  from public.settings st, jsonb_array_elements(coalesce(st.data->'users','[]'::jsonb)) u
  where st.id = 'company' and u ? 'id' and u ? 'h'
    and not exists (select 1 from public.profiles p where p.id = u->>'id')
  on conflict (id) do nothing;
  -- حافظ على صاحب العهدة الرئيسية وصلاحية النسخ الاحتياطي كما كانت (أول مستخدم بصلاحيات كاملة)
  update public.settings st
     set data = st.data || jsonb_build_object('cuMainHolder', (select u->>'id' from jsonb_array_elements(st.data->'users') u where coalesce(u->>'role','admin') = 'admin' limit 1))
   where st.id = 'company' and jsonb_typeof(st.data->'users') = 'array' and not (st.data ? 'cuMainHolder')
     and exists (select 1 from jsonb_array_elements(st.data->'users') u where coalesce(u->>'role','admin') = 'admin');
  update public.legacy_pins l set data = l.data || '{"canBackup":true}'::jsonb
   from public.settings st
   where st.id = 'company' and jsonb_typeof(st.data->'users') = 'array'
     and l.id = (select u->>'id' from jsonb_array_elements(st.data->'users') u where coalesce(u->>'role','admin') = 'admin' limit 1)
     and not exists (select 1 from jsonb_array_elements(st.data->'users') u where (u->>'canBackup')::boolean);
  update public.settings set data = data - 'users' where id = 'company' and data ? 'users';
  delete from public.settings where id = '_migrated';
end $$;

-- ---------- 5) دوال مساعدة ----------
create or replace function public.my_role() returns text
language sql stable security definer set search_path = public as
$$ select role from public.profiles where auth_id = auth.uid() $$;

create or replace function public.my_name() returns text
language sql stable security definer set search_path = public as
$$ select name from public.profiles where auth_id = auth.uid() $$;

-- قائمة الأسماء في شاشة الدخول (الاسم والدور فقط، بلا أي رموز)
create or replace function public.login_list()
returns table (id text, name text, role text, legacy boolean)
language sql stable security definer set search_path = public as
$$ select id, name, role, false from public.profiles
   union all
   select id, name, role, true from public.legacy_pins
   order by 2 $$;

revoke all on function public.my_role(), public.my_name(), public.login_list() from public;
grant execute on function public.my_role(), public.my_name() to authenticated;
grant execute on function public.login_list() to anon, authenticated;

-- ---------- 6) تفعيل الحماية وحذف كل القواعد القديمة المفتوحة ----------
do $$
declare t text; p record;
begin
  foreach t in array array['sites','site_fin','marks','custody','settings','profiles','legacy_pins','push_subs','push_keys'] loop
    if to_regclass('public.'||t) is not null then
      execute format('alter table public.%I enable row level security', t);
      for p in select policyname from pg_policies where schemaname = 'public' and tablename = t loop
        execute format('drop policy %I on public.%I', p.policyname, t);
      end loop;
      execute format('revoke all on public.%I from anon', t);
      execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    end if;
  end loop;
end $$;

-- ---------- 7) القواعد ----------
-- المواقع (بدون المالية): الكل يقرأ؛ صلاحيات كاملة + المهندس يعدّلون؛ الحذف لصلاحيات كاملة فقط
create policy sites_read   on public.sites for select to authenticated using (public.my_role() is not null);
create policy sites_insert on public.sites for insert to authenticated with check (public.my_role() in ('admin','eng'));
create policy sites_update on public.sites for update to authenticated using (public.my_role() in ('admin','eng')) with check (public.my_role() in ('admin','eng'));
create policy sites_delete on public.sites for delete to authenticated using (public.my_role() = 'admin');

-- مالية المواقع: صلاحيات كاملة فقط
create policy fin_all on public.site_fin for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');

-- العلامات على الواجهات: صلاحيات كاملة + المهندس
create policy marks_all on public.marks for all to authenticated using (public.my_role() in ('admin','eng')) with check (public.my_role() in ('admin','eng'));

-- العهدة: صلاحيات كاملة يرون كل شيء؛ الباقون يرون ما صوّروه أو ما يخص عهدتهم، ويضيفون فواتير فقط
create policy cu_admin on public.custody for all to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy cu_read_own on public.custody for select to authenticated using (
  public.my_role() in ('eng','buyer') and (
    created_by = auth.uid()
    or data->>'by' = public.my_name() or data->>'to' = public.my_name() or data->>'holder' = public.my_name()));
create policy cu_add_inv on public.custody for insert to authenticated with check (
  public.my_role() in ('eng','buyer') and created_by = auth.uid() and coalesce(data->>'kind','exp') = 'exp');
create policy cu_edit_inv on public.custody for update to authenticated
  using (public.my_role() in ('eng','buyer') and created_by = auth.uid())
  with check (created_by = auth.uid() and coalesce(data->>'kind','exp') = 'exp');
create policy cu_del_inv on public.custody for delete to authenticated using (
  public.my_role() in ('eng','buyer') and created_by = auth.uid() and coalesce(data->>'kind','exp') = 'exp');

-- إعدادات الشركة: الكل يقرأ، صلاحيات كاملة يعدّلون
create policy set_read  on public.settings for select to authenticated using (public.my_role() is not null);
create policy set_write on public.settings for insert to authenticated with check (public.my_role() = 'admin');
create policy set_upd   on public.settings for update to authenticated using (public.my_role() = 'admin') with check (public.my_role() = 'admin');
create policy set_del   on public.settings for delete to authenticated using (public.my_role() = 'admin');

-- المستخدمون: يُقرؤون داخل التطبيق فقط، والتعديل عن طريق دالة accounts على الخادم
create policy prof_read on public.profiles for select to authenticated using (public.my_role() is not null);
revoke insert, update, delete on public.profiles from authenticated;
revoke all on public.legacy_pins from authenticated;
-- push_subs و push_keys: لا قواعد = لا يصل إليها إلا الخادم (دالة push)
do $$ begin
  if to_regclass('public.push_subs') is not null then execute 'revoke all on public.push_subs from authenticated'; end if;
  if to_regclass('public.push_keys') is not null then execute 'revoke all on public.push_keys from authenticated'; end if;
end $$;

-- ---------- 8) الصور: مخزن خاص ----------
update storage.buckets set public = false where id = 'media';
do $$
declare p record;
begin
  for p in select policyname from pg_policies
           where schemaname = 'storage' and tablename = 'objects'
             and (coalesce(qual,'') ilike '%media%' or coalesce(with_check,'') ilike '%media%' or policyname ilike '%media%') loop
    execute format('drop policy %I on storage.objects', p.policyname);
  end loop;
end $$;
create policy media_read   on storage.objects for select to authenticated using (bucket_id = 'media' and public.my_role() is not null);
create policy media_upload on storage.objects for insert to authenticated with check (bucket_id = 'media' and public.my_role() is not null);
create policy media_update on storage.objects for update to authenticated using (bucket_id = 'media' and public.my_role() is not null);
create policy media_delete on storage.objects for delete to authenticated using (bucket_id = 'media' and public.my_role() = 'admin');

-- ---------- 9) التحديث اللحظي للجداول الجديدة ----------
do $$
declare t text;
begin
  foreach t in array array['site_fin','profiles'] loop
    if not exists (select 1 from pg_publication_tables where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = t) then
      execute format('alter publication supabase_realtime add table public.%I', t);
    end if;
  end loop;
end $$;

-- ---------- 10) فحص سريع: يجب أن تظهر كل الجداول وبجانبها true ----------
select c.relname as "الجدول", c.relrowsecurity as "الحماية مفعّلة",
       (select count(*) from pg_policies p where p.schemaname = 'public' and p.tablename = c.relname) as "عدد القواعد"
from pg_class c join pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public' and c.relkind = 'r'
order by 1;
