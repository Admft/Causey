-- Security probes for 0015_escalation_lockdown.sql.
-- Run against a local Supabase: see scripts/verify-0015.sh
\set ON_ERROR_STOP off
\pset pager off

-- ---------------------------------------------------------------------------
-- Fixtures: three real auth users so the profiles trigger builds profiles.
-- ---------------------------------------------------------------------------
delete from auth.users where email like '%@probe.test';

insert into auth.users (id, instance_id, aud, role, email, encrypted_password,
                        email_confirmed_at, created_at, updated_at,
                        raw_user_meta_data, raw_app_meta_data)
values
  ('11111111-1111-1111-1111-111111111111', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'student@probe.test', 'x', now(), now(), now(),
   '{"role":"student","display_name":"Probe Student"}'::jsonb, '{}'::jsonb),
  ('22222222-2222-2222-2222-222222222222', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'coach@probe.test', 'x', now(), now(), now(),
   '{"role":"coach","display_name":"Probe Coach"}'::jsonb, '{}'::jsonb),
  ('33333333-3333-3333-3333-333333333333', '00000000-0000-0000-0000-000000000000',
   'authenticated', 'authenticated', 'outsider@probe.test', 'x', now(), now(), now(),
   '{"role":"student","display_name":"Probe Outsider"}'::jsonb, '{}'::jsonb);

insert into public.organizations (id, name, slug, type, state, created_by, join_code)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', 'Probe School', 'probe-school',
        'school', 'TX', '22222222-2222-2222-2222-222222222222', 'PROBE123')
on conflict (id) do nothing;

insert into public.org_memberships (org_id, profile_id, role, status)
values ('aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa',
        '22222222-2222-2222-2222-222222222222', 'coach', 'active')
on conflict (org_id, profile_id) do update set role = 'coach', status = 'active';

insert into public.competitions
  (id, slug, name, category, city, state, zip, lat, lng, start_date, status,
   visibility, source, org_id, created_by)
values ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb', 'probe-draft-event',
        'Probe Draft Event', 'chess', 'Dallas', 'TX', '75201', 32.7767, -96.7970,
        current_date + 30, 'draft', 'public', 'organizer',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

-- Published sibling of the draft above. Without it, the "public search still
-- works" probe has nothing to find and would pass on an empty table.
insert into public.competitions
  (id, slug, name, category, city, state, zip, lat, lng, start_date, status,
   visibility, source, org_id, created_by)
values ('cccccccc-cccc-cccc-cccc-cccccccccccc', 'probe-published-event',
        'Probe Published Event', 'chess', 'Dallas', 'TX', '75201', 32.7767, -96.7970,
        current_date + 30, 'published', 'public', 'organizer',
        'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa', '22222222-2222-2222-2222-222222222222')
on conflict (id) do nothing;

create or replace function pg_temp.report(p_name text, p_passed boolean, p_note text default '')
returns void language plpgsql as $$
begin
  raise notice '% | % %', case when p_passed then 'PASS' else 'FAIL' end, p_name, p_note;
end;
$$;

-- ---------------------------------------------------------------------------
-- SEC-01 / B001: profile role is frozen for the account itself.
-- ---------------------------------------------------------------------------
do $$
declare
  ok boolean := false;
  msg text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin
    update public.profiles set role = 'coach'
    where id = '11111111-1111-1111-1111-111111111111';
    ok := false; msg := 'update succeeded — STILL EXPLOITABLE';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  reset role;
  perform pg_temp.report('SEC-01 student cannot self-promote to coach', ok, msg);
end $$;

do $$
declare
  ok boolean := false;
  msg text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin
    update public.profiles set role_unlocked = true
    where id = '11111111-1111-1111-1111-111111111111';
    ok := false; msg := 'update succeeded — STILL EXPLOITABLE';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  reset role;
  perform pg_temp.report('SEC-01 student cannot flip role_unlocked', ok, msg);
end $$;

do $$
declare
  ok boolean := false;
  msg text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin
    update public.profiles set display_name = 'Renamed Probe'
    where id = '11111111-1111-1111-1111-111111111111';
    ok := true; msg := '';
  exception when others then
    ok := false; msg := 'REGRESSION: ' || sqlerrm;
  end;
  reset role;
  perform pg_temp.report('SEC-01 normal profile edits still work', ok, msg);
end $$;

-- Second layer: even if a future migration re-grants the table broadly, the
-- trigger must still refuse. Without this the fix is one stray GRANT from gone.
do $$
declare
  ok boolean := false;
  msg text;
begin
  grant update on public.profiles to authenticated;
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin
    update public.profiles set role = 'coach'
    where id = '11111111-1111-1111-1111-111111111111';
    ok := false; msg := 'update succeeded — trigger layer is NOT holding';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  reset role;
  revoke update on public.profiles from authenticated;
  grant update (display_name, date_of_birth, age_band, state, zip, interests, updated_at)
    on public.profiles to authenticated;
  perform pg_temp.report('SEC-01 trigger still blocks if table UPDATE is re-granted', ok, msg);
end $$;

-- ---------------------------------------------------------------------------
-- SEC-05 / B007: removed staff rejoin as students.
-- ---------------------------------------------------------------------------
do $$
declare
  ok boolean;
  got text;
begin
  update public.org_memberships set status = 'removed', role = 'coach'
  where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and profile_id = '22222222-2222-2222-2222-222222222222';

  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform public.join_org_with_code('PROBE123');
  reset role;

  select role into got from public.org_memberships
  where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and profile_id = '22222222-2222-2222-2222-222222222222';
  ok := got = 'student';
  perform pg_temp.report('SEC-05 removed coach rejoins as student', ok, '(role now ' || got || ')');
end $$;

do $$
declare
  ok boolean;
  got text;
begin
  update public.org_memberships set status = 'active', role = 'coach'
  where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and profile_id = '22222222-2222-2222-2222-222222222222';

  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  perform public.join_org_with_code('PROBE123');
  reset role;

  select role into got from public.org_memberships
  where org_id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa'
    and profile_id = '22222222-2222-2222-2222-222222222222';
  ok := got = 'coach';
  perform pg_temp.report('SEC-05 active coach scanning own code keeps role', ok, '(role now ' || got || ')');
end $$;

-- ---------------------------------------------------------------------------
-- SEC-06 / B005: drafts visible to their organizer, invisible to everyone else.
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"22222222-2222-2222-2222-222222222222","role":"authenticated"}', true);
  select count(*) into n from public.competitions where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  reset role;
  perform pg_temp.report('SEC-06 organizer sees own draft', n = 1, '(rows=' || n || ')');
end $$;

do $$
declare n int;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"33333333-3333-3333-3333-333333333333","role":"authenticated"}', true);
  select count(*) into n from public.competitions where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  reset role;
  perform pg_temp.report('SEC-06 unrelated user cannot see the draft', n = 0, '(rows=' || n || ')');
end $$;

do $$
declare n int;
begin
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.competitions where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  reset role;
  perform pg_temp.report('SEC-06 anonymous search cannot see the draft', n = 0, '(rows=' || n || ')');
end $$;

do $$
declare n int;
begin
  set local role anon;
  perform set_config('request.jwt.claims', '{"role":"anon"}', true);
  select count(*) into n from public.competitions
   where id = 'cccccccc-cccc-cccc-cccc-cccccccccccc';
  reset role;
  perform pg_temp.report('SEC-06 anonymous public search still works', n = 1, '(rows=' || n || ')');
end $$;

-- ---------------------------------------------------------------------------
-- B010: audit trail is written, unreadable to users, and append-only.
-- ---------------------------------------------------------------------------
do $$
declare n int;
begin
  select count(*) into n from public.audit_events where action = 'organization.created';
  perform pg_temp.report('B010 organization creation recorded', n >= 1, '(rows=' || n || ')');
end $$;

do $$
declare n int;
begin
  update public.competitions set status = 'published'
  where id = 'bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb';
  select count(*) into n from public.audit_events
  where action = 'competition.status_changed' and detail->>'to' = 'published';
  perform pg_temp.report('B010 publish transition recorded', n >= 1, '(rows=' || n || ')');
end $$;

do $$
declare ok boolean := false; msg text;
begin
  begin
    update public.audit_events set action = 'tampered' where id = (select min(id) from public.audit_events);
    ok := false; msg := 'update succeeded — NOT append-only';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  perform pg_temp.report('B010 audit rows cannot be updated', ok, msg);
end $$;

do $$
declare ok boolean := false; msg text;
begin
  begin
    delete from public.audit_events where id = (select min(id) from public.audit_events);
    ok := false; msg := 'delete succeeded — NOT append-only';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  perform pg_temp.report('B010 audit rows cannot be deleted', ok, msg);
end $$;

do $$
declare ok boolean := false; msg text;
begin
  set local role authenticated;
  perform set_config('request.jwt.claims',
    '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated"}', true);
  begin
    perform 1 from public.audit_events limit 1;
    ok := false; msg := 'read succeeded — audit log is exposed';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  reset role;
  perform pg_temp.report('B010 users cannot read the audit log', ok, msg);
end $$;

-- 0015 shipped admin_audit_log as a mutable table, so a platform admin could
-- rewrite the record of their own action. 0016 extends the append-only guard.
do $$
declare ok boolean := false; msg text; n int;
begin
  insert into public.admin_audit_log (actor_id, action, target_type, target_id)
  values ('22222222-2222-2222-2222-222222222222', 'probe', 'organizations',
          'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa');
  begin
    update public.admin_audit_log set action = 'tampered' where action = 'probe';
    ok := false; msg := 'update succeeded — NOT append-only';
  exception when others then
    ok := true; msg := '(' || sqlerrm || ')';
  end;
  perform pg_temp.report('B010 admin_audit_log is append-only too', ok, msg);
end $$;

-- Cleanup. admin_audit_log.actor_id is ON DELETE RESTRICT, so its probe rows
-- have to go before the profiles they reference.
alter table public.admin_audit_log disable trigger admin_audit_log_no_mutate;
delete from public.admin_audit_log
where actor_id in ('11111111-1111-1111-1111-111111111111',
                   '22222222-2222-2222-2222-222222222222',
                   '33333333-3333-3333-3333-333333333333');
alter table public.admin_audit_log enable trigger admin_audit_log_no_mutate;

delete from public.competitions
 where id in ('bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb',
              'cccccccc-cccc-cccc-cccc-cccccccccccc');
delete from public.organizations where id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
delete from auth.users where email like '%@probe.test';
