\set ON_ERROR_STOP on

begin;

insert into auth.users (
  id,
  instance_id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  created_at,
  updated_at,
  raw_user_meta_data,
  raw_app_meta_data
)
values
  (
    '11111111-1111-4111-8111-111111111111',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'owner@example.test',
    'x',
    now(),
    now(),
    now(),
    '{"role":"coach","display_name":"Owner"}',
    '{}'
  ),
  (
    '22222222-2222-4222-8222-222222222222',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'coach@example.test',
    'x',
    now(),
    now(),
    now(),
    '{"role":"coach","display_name":"Coach"}',
    '{}'
  ),
  (
    '33333333-3333-4333-8333-333333333333',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'student@example.test',
    'x',
    now(),
    now(),
    now(),
    '{"role":"student","display_name":"Student"}',
    '{}'
  ),
  (
    '44444444-4444-4444-8444-444444444444',
    '00000000-0000-0000-0000-000000000000',
    'authenticated',
    'authenticated',
    'attacker@example.test',
    'x',
    now(),
    now(),
    now(),
    '{"role":"student","display_name":"Attacker"}',
    '{}'
  );

update public.profiles
set role_unlocked = true
where id in (
  '11111111-1111-4111-8111-111111111111',
  '22222222-2222-4222-8222-222222222222'
);

insert into public.organizations (
  id,
  name,
  slug,
  type,
  state,
  created_by,
  owner_profile_id,
  join_code
)
values (
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Security Test School',
  'security-test-school',
  'school',
  'TX',
  '11111111-1111-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'S3CUR3AA'
);

insert into public.org_memberships (org_id, profile_id, role, status)
values
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '11111111-1111-4111-8111-111111111111',
    'coach',
    'active'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '22222222-2222-4222-8222-222222222222',
    'coach',
    'active'
  ),
  (
    'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
    '33333333-3333-4333-8333-333333333333',
    'coach',
    'removed'
  );

select set_config(
  'request.jwt.claim.sub',
  '33333333-3333-4333-8333-333333333333',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"33333333-3333-4333-8333-333333333333","role":"authenticated"}',
  true
);
set local role authenticated;

select * from public.join_org_with_code('S3CUR3AA');

reset role;

do $$
begin
  if not exists (
    select 1
    from public.org_memberships
    where org_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and profile_id = '33333333-3333-4333-8333-333333333333'
      and role = 'student'
      and status = 'active'
  ) then
    raise exception 'join-code reactivation did not demote removed staff';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"44444444-4444-4444-8444-444444444444","role":"authenticated"}',
  true
);
set local role authenticated;

do $$
begin
  perform public.create_in_app_notification(
    '33333333-3333-4333-8333-333333333333',
    'account',
    'Injected',
    'Injected',
    '/account#signin',
    'account',
    'password_updated',
    'account:password-updated:attack'
  );
  raise exception 'arbitrary recipient notification unexpectedly succeeded';
exception
  when insufficient_privilege then null;
end;
$$;

do $$
begin
  perform public.create_in_app_notification(
    '44444444-4444-4444-8444-444444444444',
    'account',
    'Injected link',
    'Injected link',
    'https://example.test/phish',
    'account',
    'password_updated',
    'account:password-updated:external'
  );
  raise exception 'external notification href unexpectedly succeeded';
exception
  when invalid_parameter_value then null;
end;
$$;

select public.create_in_app_notification(
  '44444444-4444-4444-8444-444444444444',
  'account',
  'Password updated',
  'Your password changed.',
  '/account#signin',
  'account',
  'password_updated',
  'account:password-updated:self'
);

reset role;

do $$
begin
  if not exists (
    select 1
    from public.notifications
    where recipient_id = '44444444-4444-4444-8444-444444444444'
      and dedupe_key = 'account:password-updated:self'
  ) then
    raise exception 'account self-alert was not created';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '44444444-4444-4444-8444-444444444444',
  true
);
set local role authenticated;

update public.organizations
set owner_profile_id = '22222222-2222-4222-8222-222222222222'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

reset role;

do $$
begin
  if not exists (
    select 1
    from public.organizations
    where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'
      and owner_profile_id = '11111111-1111-4111-8111-111111111111'
  ) then
    raise exception 'non-owner transferred organization ownership';
  end if;
end;
$$;

select set_config(
  'request.jwt.claim.sub',
  '11111111-1111-4111-8111-111111111111',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"11111111-1111-4111-8111-111111111111","role":"authenticated"}',
  true
);
set local role authenticated;

update public.organizations
set owner_profile_id = '22222222-2222-4222-8222-222222222222'
where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

insert into public.competitions (
  id,
  slug,
  name,
  category,
  participation_mode,
  organizer_name,
  city,
  state,
  zip,
  lat,
  lng,
  start_date,
  reg_url,
  source,
  status,
  visibility,
  audience,
  created_by
)
values (
  'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb',
  'standalone-security-test',
  'Standalone Security Test',
  'chess',
  'in_person',
  'Owner',
  'Austin',
  'TX',
  '78701',
  30.2672,
  -97.7431,
  current_date + 30,
  null,
  'organizer',
  'published',
  'public',
  'public',
  '11111111-1111-4111-8111-111111111111'
);

reset role;

do $$
begin
  if not exists (
    select 1
    from public.competitions
    where id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'
      and org_id is null
      and status = 'pending_review'
      and submitted_for_review_at is not null
  ) then
    raise exception 'standalone public organizer event bypassed moderation';
  end if;
end;
$$;

insert into public.competitions (
  id,
  slug,
  name,
  category,
  participation_mode,
  organizer_name,
  city,
  state,
  zip,
  lat,
  lng,
  start_date,
  reg_url,
  source,
  status,
  visibility,
  audience,
  org_id,
  created_by
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'attendance-security-test',
  'Attendance Security Test',
  'chess',
  'in_person',
  'Security Test School',
  'Austin',
  'TX',
  '78701',
  30.2672,
  -97.7431,
  current_date - 1,
  null,
  'organizer',
  'draft',
  'private',
  'school',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  '11111111-1111-4111-8111-111111111111'
);

insert into public.competition_entrants (
  competition_id,
  profile_id,
  status,
  invited_by,
  responded_by,
  responded_at
)
values (
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '33333333-3333-4333-8333-333333333333',
  'going',
  '22222222-2222-4222-8222-222222222222',
  '33333333-3333-4333-8333-333333333333',
  now()
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

update public.competition_entrants
set status = 'attended',
    attendance_marked_by = '22222222-2222-4222-8222-222222222222',
    attendance_marked_at = now()
where competition_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
  and profile_id = '33333333-3333-4333-8333-333333333333';

do $$
begin
  update public.competition_entrants
  set responded_by = '22222222-2222-4222-8222-222222222222'
  where competition_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
    and profile_id = '33333333-3333-4333-8333-333333333333';
  raise exception 'manager overwrote RSVP responder';
exception
  when insufficient_privilege then null;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.competition_entrants
    where competition_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and profile_id = '33333333-3333-4333-8333-333333333333'
      and status = 'attended'
      and responded_by = '33333333-3333-4333-8333-333333333333'
      and attendance_marked_by =
        '22222222-2222-4222-8222-222222222222'
  ) then
    raise exception 'manager attendance update did not preserve RSVP integrity';
  end if;
end;
$$;

insert into public.org_groups (id, org_id, name)
values (
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  'Atomic roster test'
);

select set_config(
  'request.jwt.claim.sub',
  '22222222-2222-4222-8222-222222222222',
  true
);
select set_config(
  'request.jwt.claims',
  '{"sub":"22222222-2222-4222-8222-222222222222","role":"authenticated"}',
  true
);
set local role authenticated;

select public.set_group_members(
  'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
  array['33333333-3333-4333-8333-333333333333'::uuid]
);

do $$
begin
  perform public.set_group_members(
    'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee',
    array['44444444-4444-4444-8444-444444444444'::uuid]
  );
  raise exception 'inactive organization member replaced the group roster';
exception
  when invalid_parameter_value then null;
end;
$$;

reset role;

do $$
begin
  if not exists (
    select 1
    from public.org_group_members
    where group_id = 'eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee'
      and profile_id = '33333333-3333-4333-8333-333333333333'
  ) then
    raise exception 'failed group replacement changed the existing roster';
  end if;
end;
$$;

insert into public.email_outbox (
  id,
  recipient_email,
  template,
  payload,
  send_after,
  status,
  attempts,
  locked_at
)
values (
  'dddddddd-dddd-4ddd-8ddd-dddddddddddd',
  'lease@example.test',
  'test',
  '{}',
  now() - interval '1 hour',
  'sending',
  1,
  now() - interval '16 minutes'
);

select set_config(
  'request.jwt.claims',
  '{"role":"service_role"}',
  true
);
set local role service_role;

select public.ingestion_replace_competition_sections(
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  '[{"name":"Open","min_rating":null,"max_rating":null,"min_grade":null,"max_grade":null,"entry_fee_cents":2500}]'::jsonb
);

select id
from public.claim_email_outbox_batch(1)
where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd';
reset role;

do $$
begin
  if not exists (
    select 1
    from public.sections
    where competition_id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'
      and name = 'Open'
      and entry_fee_cents = 2500
  ) then
    raise exception 'atomic ingestion section replacement failed';
  end if;

  if not exists (
    select 1
    from public.email_outbox
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'
      and status = 'sending'
      and attempts = 2
      and locked_at > now() - interval '1 minute'
  ) then
    raise exception 'stale email lease was not reclaimed';
  end if;
end;
$$;

rollback;
