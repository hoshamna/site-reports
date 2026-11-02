-- Minimal stand-in for the parts of Supabase the setup scripts touch (roles, auth.uid(), storage,
-- realtime publication) plus the tables as they existed before security-setup.sql, with sample data.
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'anon') then create role anon nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'authenticated') then create role authenticated nologin; end if;
  if not exists (select 1 from pg_roles where rolname = 'service_role') then create role service_role nologin bypassrls; end if;
end $$;
grant usage on schema public to anon, authenticated, service_role;
create schema auth; grant usage on schema auth to anon, authenticated;
create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
create schema storage; grant usage on schema storage to anon, authenticated;
create table storage.buckets (id text primary key, public bool);
create table storage.objects (id serial, bucket_id text, name text);
alter table storage.objects enable row level security;
grant select, insert, update, delete on storage.objects to anon, authenticated;
insert into storage.buckets values ('media', true);
create policy "public media" on storage.objects for select using (bucket_id = 'media');
set client_min_messages = error;
create publication supabase_realtime;
reset client_min_messages;
create table sites (id text primary key, data jsonb, updated_at timestamptz);
create table marks (id text primary key, data jsonb, updated_at timestamptz);
create table custody (id text primary key, data jsonb, updated_at timestamptz);
create table settings (id text primary key, data jsonb, updated_at timestamptz);
create table push_subs (id text primary key, data jsonb);
create table push_keys (id text primary key, data jsonb);
alter table sites enable row level security;
create policy "allow all" on sites for all using (true) with check (true);
grant all on all tables in schema public to anon, authenticated, service_role;
insert into sites values
  ('s1', '{"id":"s1","name":"فيلا","engineer":"م","total":85000,"payments":[{"amount":10000}],"purchases":[{"amount":2}],"labor":[],"floors":[]}'),
  ('s2', '{"id":"s2","name":"بدون مالية"}');
insert into settings values ('company', '{"company":"أصيل","users":[{"id":"u1","name":"هشام","role":"admin","h":"abc"},{"id":"u2","name":"أحمد","role":"buyer","h":"def","mustChange":true}]}'), ('_migrated', '{}');
insert into custody values ('c1', '{"kind":"dep","amount":5000}'), ('c2', '{"kind":"exp","by":"أحمد","amount":20}'), ('c3', '{"kind":"xfer","to":"أحمد","amount":100}'), ('c4', '{"kind":"exp","by":"محمد","amount":30}');
insert into marks values ('m1', '{}');
