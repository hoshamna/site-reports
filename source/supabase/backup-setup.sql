-- =====================================================================
-- أصيل — نسخة احتياطية تلقائية يومية داخل قاعدة البيانات
-- يُنفَّذ مرة واحدة: SQL Editor ← New query ← الصق ← Run
-- كل يوم الساعة 4 فجراً بتوقيت الإمارات تُحفظ نسخة كاملة (المواقع مع ماليتها، العلامات، العهدة، الإعدادات)
-- ويُحتفظ بآخر 30 نسخة. الصور تبقى في التخزين ولا تُنسخ (مثل النسخة اليدوية).
-- =====================================================================

create table if not exists public.backups (
  id   bigserial primary key,
  at   timestamptz not null default now(),
  kind text not null default 'auto',
  size int,
  data jsonb not null
);

-- تبني النسخة بنفس شكل ملف النسخة الاحتياطية في التطبيق، فتصلح للاستعادة منه مباشرة
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
    'settings',coalesce((select data from public.settings where id = 'company'), '{}'::jsonb));
  insert into public.backups (kind, size, data) values (p_kind, length(d::text), d) returning id into new_id;
  -- الاحتفاظ بآخر 30 نسخة تلقائية
  delete from public.backups where kind = 'auto' and id not in (select id from public.backups where kind = 'auto' order by at desc limit 30);
  return new_id;
end $$;
revoke all on function public.make_backup(text) from public, anon;
grant execute on function public.make_backup(text) to authenticated;

-- الحماية: لا يرى النسخ إلا أصحاب الصلاحيات الكاملة، ولا يعدّلها أحد من التطبيق
alter table public.backups enable row level security;
do $$ declare p record; begin
  for p in select policyname from pg_policies where schemaname = 'public' and tablename = 'backups' loop
    execute format('drop policy %I on public.backups', p.policyname);
  end loop;
end $$;
revoke all on public.backups from anon;
revoke insert, update, delete on public.backups from authenticated;
grant select on public.backups to authenticated;
create policy backups_read on public.backups for select to authenticated using (public.my_role() = 'admin');

-- الجدولة اليومية (pg_cron): 00:00 UTC = 4:00 فجراً بتوقيت الإمارات
create extension if not exists pg_cron;
select cron.schedule('aseel-daily-backup', '0 0 * * *', $$select public.make_backup('auto')$$);

-- أول نسخة الآن، ثم عرض النتيجة
select public.make_backup('auto') as "رقم أول نسخة";
select id as "رقم", at as "الوقت", kind as "النوع", size as "الحجم بالبايت",
       (select count(*) from jsonb_object_keys(data->'sites')) as "مواقع",
       (select count(*) from jsonb_object_keys(data->'custody')) as "عهدة"
from public.backups order by at desc limit 5;
