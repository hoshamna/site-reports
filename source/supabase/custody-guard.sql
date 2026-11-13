-- =====================================================================
-- أصيل — حماية بيانات العهدة داخل قاعدة البيانات
-- يُنفَّذ مرة واحدة: SQL Editor ← New query ← الصق ← Run   (آمن للتكرار)
-- لغير أصحاب الصلاحيات الكاملة (المهندس ومسؤول المشتريات):
--   • «دُفعت من» تحددها قاعدة البيانات: عهدته إن كان ممن لهم عهدة، وإلا العهدة الرئيسية. لا يستطيع تغييرها.
--   • لا يستطيع وضع علامة المراجعة (✓ رُوجعت) ولا إزالتها.
--   • الفاتورة تُسجَّل باسمه هو، ولا يستطيع نسبتها لغيره.
--   • بعد المراجعة لا يستطيع تعديل الفاتورة ولا حذفها. التصحيح بعدها لأصحاب الصلاحيات الكاملة.
-- أصحاب الصلاحيات الكاملة والخادم (النسخ الاحتياطي والجدولة) لا يتأثرون.
-- =====================================================================

create or replace function public.custody_guard() returns trigger
language plpgsql set search_path = public as $$
declare r text; me text; holds boolean;
begin
  if auth.uid() is null then return coalesce(new, old); end if;   -- الخادم
  r := public.my_role();
  if r = 'admin' then return coalesce(new, old); end if;
  me := public.my_name();

  if tg_op = 'DELETE' then
    if old.data ? 'rev' then raise exception 'reviewed: only a full-access user can delete a reviewed invoice' using errcode = '42501'; end if;
    return old;
  end if;

  if tg_op = 'UPDATE' then
    if old.data ? 'rev' then raise exception 'reviewed: only a full-access user can change a reviewed invoice' using errcode = '42501'; end if;
    -- يبقى ما حدده غيره كما هو: العهدة، ومن رفعها، وعلامة المراجعة
    new.data := (new.data - 'rev' - 'holder' - 'hv' - 'hvm' - 'by')
      || jsonb_strip_nulls(jsonb_build_object('holder', old.data->'holder', 'hv', old.data->'hv', 'hvm', old.data->'hvm', 'by', old.data->'by'));
    return new;
  end if;

  -- INSERT: الفاتورة باسمه، وعهدته تحددها قائمة «الموظفون الذين لهم عهدة» في صفحة العهدة
  select coalesce((data->'cuHolders') ? me, false) into holds from public.settings where id = 'company';
  new.data := (new.data - 'rev' - 'hvm')
    || jsonb_build_object('by', me, 'holder', case when coalesce(holds, false) then me else 'main' end, 'hv', 2);
  return new;
end $$;

drop trigger if exists custody_guard on public.custody;
create trigger custody_guard before insert or update or delete on public.custody
  for each row execute function public.custody_guard();

-- فحص: يجب أن يظهر سطر واحد باسم custody_guard
select tgname as "الحماية" from pg_trigger where tgrelid = 'public.custody'::regclass and tgname = 'custody_guard';
