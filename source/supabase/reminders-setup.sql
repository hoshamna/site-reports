-- =====================================================================
-- أصيل — تذكير المرتبات يوم 25 من كل شهر (إشعار على الجوال)
-- يُنفَّذ مرة واحدة: SQL Editor ← New query ← الصق ← Run
-- قبله: حدّث دالة push بالكود الجديد (source/supabase/push.ts).
-- يصل الإشعار لكل مستخدم مفعّل له «🔔 يستقبل تنبيه انخفاض رصيد العهدة» وفعّل الإشعارات على جواله.
-- =====================================================================

-- مفتاح سري يعرفه المجدول ودالة push فقط (لا يقرؤه أحد من التطبيق)
create table if not exists public.app_secrets (id text primary key, value text not null);
alter table public.app_secrets enable row level security;
revoke all on public.app_secrets from anon, authenticated;
insert into public.app_secrets (id, value) values ('cron', replace(gen_random_uuid()::text, '-', '') || replace(gen_random_uuid()::text, '-', '')) on conflict (id) do nothing;

create extension if not exists pg_net;
create extension if not exists pg_cron;

-- يوم 25 من كل شهر الساعة 10 صباحاً بتوقيت الإمارات (06:00 UTC)
select cron.schedule('aseel-salary-reminder', '0 6 25 * *', $job$
  select net.http_post(
    url     := 'https://stbwyyhttjzfhdwsnrws.supabase.co/functions/v1/push',
    headers := '{"content-type":"application/json"}'::jsonb,
    body    := jsonb_build_object('action', 'salary-reminder', 'key', (select value from public.app_secrets where id = 'cron'))
  )
$job$);

-- للتجربة الآن (اختياري): احذف -- من السطر التالي وشغّله وحده، فيصل الإشعار خلال ثوانٍ
-- select net.http_post(url := 'https://stbwyyhttjzfhdwsnrws.supabase.co/functions/v1/push', headers := '{"content-type":"application/json"}'::jsonb, body := jsonb_build_object('action','salary-reminder','key',(select value from public.app_secrets where id='cron')));

select jobname as "المهمة", schedule as "الموعد" from cron.job where jobname like 'aseel-%' order by 1;
