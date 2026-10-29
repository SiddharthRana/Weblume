-- Verifies row level security. Runs after migrations; any failed assertion aborts with an error.
\set ON_ERROR_STOP on
begin;

insert into auth.users (id, email) values
  ('00000000-0000-0000-0000-00000000000a', 'a@example.test'),
  ('00000000-0000-0000-0000-00000000000b', 'b@example.test');

do $$ begin
  assert (select count(*) from public.profiles) = 2, 'profile trigger should create a profile per user';
end $$;

insert into public.scans (id, user_id, target_url, normalized_url, expires_at) values
  ('10000000-0000-0000-0000-00000000000a', '00000000-0000-0000-0000-00000000000a', 'https://a.example', 'https://a.example/', now() + interval '30 days'),
  ('10000000-0000-0000-0000-00000000000b', '00000000-0000-0000-0000-00000000000b', 'https://b.example', 'https://b.example/', now() + interval '30 days');
insert into public.findings (scan_id, check_id, category, severity, kind, source) values
  ('10000000-0000-0000-0000-00000000000a', 'seo.title.missing', 'seo', 'high', 'detected', 'page_fetch'),
  ('10000000-0000-0000-0000-00000000000b', 'seo.title.missing', 'seo', 'high', 'detected', 'page_fetch');

-- Act as user A.
set local role authenticated;
select set_config('request.jwt.claim.sub', '00000000-0000-0000-0000-00000000000a', true);

do $$ begin
  assert (select count(*) from public.scans) = 1, 'user A must only see their own scan';
  assert (select count(*) from public.findings) = 1, 'user A must only see findings of their own scans';
  assert (select count(*) from public.profiles) = 1, 'user A must only see their own profile';
  assert (select count(*) from public.feature_flags) = 0, 'feature flags are not readable by users';
  assert (select count(*) from public.webhook_events) = 0, 'webhook events are not readable by users';
end $$;

-- Users cannot insert scans directly (API only).
do $$ begin
  begin
    insert into public.scans (user_id, target_url, normalized_url, expires_at)
      values ('00000000-0000-0000-0000-00000000000a', 'https://x.example', 'https://x.example/', now());
    raise exception 'insert into scans should have been rejected by RLS';
  exception when insufficient_privilege then null;
  end;
end $$;

-- Updating another user's profile affects no rows.
update public.profiles set display_name = 'hacked' where id = '00000000-0000-0000-0000-00000000000b';
reset role;
do $$ begin
  assert (select display_name from public.profiles where id = '00000000-0000-0000-0000-00000000000b') is null,
    'user A must not be able to update user B''s profile';
end $$;

-- Anonymous role sees nothing.
set local role anon;
do $$ begin
  assert (select count(*) from public.scans) = 0, 'anon must not see scans';
end $$;
reset role;

-- Deleting an auth user cascades to their data.
delete from auth.users where id = '00000000-0000-0000-0000-00000000000b';
do $$ begin
  assert (select count(*) from public.scans where user_id = '00000000-0000-0000-0000-00000000000b') = 0,
    'scans must be deleted with the user';
  assert (select count(*) from public.findings) = 1, 'findings must cascade with scans';
end $$;

rollback;
\echo 'RLS tests passed'
