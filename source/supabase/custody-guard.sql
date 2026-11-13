-- =====================================================================
-- أصيل — حماية بيانات العهدة داخل قاعدة البيانات
-- يُنفَّذ مرة واحدة: SQL Editor ← New query ← الصق ← Run   (آمن للتكرار)
-- الفواتير يعدّلها ويحذفها ويراجعها هشام وGM فقط (بحسابيهما، لا بالاسم).
-- غيرهما (أصحاب صلاحيات كاملة آخرون، والمهندس، ومسؤول المشتريات):
--   • يرفع فاتورته ويكملها حتى يضغط «✓ حفظ»، أو حتى تمر ٢٤ ساعة على رفعها. بعدها تُقفل.
--   • لا يحذف أي فاتورة، ولا يضع علامة المراجعة.
--   • «دُفعت من» تحددها قاعدة البيانات: عهدته إن كان ممن لهم عهدة، وإلا العهدة الرئيسية.
--   • الفاتورة تُسجَّل باسمه هو.
-- التوريدات وتحويلات العهدة كما هي: يسجّلها أصحاب الصلاحيات الكاملة. والخادم لا يتأثر.
-- =====================================================================

-- من يعدّل الفواتير: حسابا هشام وGM (يُضافان هنا مرة واحدة؛ تغيير الاسم لاحقاً لا يغيّر الصلاحية)
create table if not exists public.cu_editors (profile_id text primary key);
alter table public.cu_editors enable row level security;
revoke all on public.cu_editors from anon, authenticated;
insert into public.cu_editors (profile_id) select id from public.profiles where name in ('هشام', 'GM') on conflict do nothing;

create or replace function public.is_cu_editor() returns boolean
language sql stable security definer set search_path = public as
$fn$ select exists (select 1 from public.cu_editors e join public.profiles p on p.id = e.profile_id where p.auth_id = auth.uid()) $fn$;
revoke all on function public.is_cu_editor() from public, anon;
grant execute on function public.is_cu_editor() to authenticated;

create or replace function public.custody_guard() returns trigger
language plpgsql set search_path = public as $fn$
declare r text; me text; holds boolean; k text; fresh boolean;
begin
  if auth.uid() is null then return coalesce(new, old); end if;
  if public.is_cu_editor() then return coalesce(new, old); end if;
  r := public.my_role();
  me := public.my_name();
  if tg_op = 'INSERT' then k := coalesce(new.data->>'kind', 'exp'); else k := coalesce(old.data->>'kind', 'exp'); end if;

  if k <> 'exp' then
    if tg_op = 'DELETE' then return old; end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    raise exception 'locked: only Hesham or GM can delete an invoice' using errcode = '42501';
  end if;

  if tg_op = 'UPDATE' then
    fresh := (old.data->>'createdAt') ~ '^[0-9]+$'
      and (old.data->>'createdAt')::bigint > (extract(epoch from now()) * 1000)::bigint - 86400000;
    if old.created_by is distinct from auth.uid() or coalesce(old.data->>'ok', '') = 'true'
       or old.data ? 'rev' or not coalesce(fresh, false) then
      raise exception 'locked: only Hesham or GM can change a saved invoice' using errcode = '42501';
    end if;
    new.data := (new.data - 'rev' - 'holder' - 'hv' - 'hvm' - 'by')
      || jsonb_strip_nulls(jsonb_build_object('holder', old.data->'holder', 'hv', old.data->'hv', 'hvm', old.data->'hvm', 'by', old.data->'by'));
    return new;
  end if;

  holds := coalesce((select (s.data->'cuHolders') ? me from public.settings s where s.id = 'company'), false);
  new.data := (new.data - 'rev' - 'hvm')
    || jsonb_build_object('by', me, 'holder', case when coalesce(holds, false) then me else 'main' end, 'hv', 2);
  return new;
end $fn$;

drop trigger if exists custody_guard on public.custody;
create trigger custody_guard before insert or update or delete on public.custody
  for each row execute function public.custody_guard();

-- فحص: يجب أن يظهر اسما هشام وGM
select p.name as "يعدّل الفواتير" from public.cu_editors e join public.profiles p on p.id = e.profile_id order by 1;
