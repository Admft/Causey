-- P1 scale/isolation: unauthorized district hitchhike, bound email
-- enqueue, invitation-priority outbox drain, district rollup without a
-- cartesian join, connected-school student ids in one query, rate-limit
-- actor binding, and comment report/hide plus under-13 posting.

-- ---------------------------------------------------------------------------
-- 1. Child-school parent_org_id is a district-admin (or platform) write.
--    Unlocked coaches can still create standalone schools/clubs/teams.
-- ---------------------------------------------------------------------------
create or replace function public.validate_organization_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_type text;
begin
  if new.parent_org_id is null then
    return new;
  end if;
  if new.type <> 'school' then
    raise exception 'Only schools can belong to a district.';
  end if;
  select type into parent_type
  from organizations
  where id = new.parent_org_id;
  if parent_type is distinct from 'district' then
    raise exception 'A school parent must be a district.';
  end if;

  if tg_op = 'INSERT'
     and not public.is_platform_admin()
     and not public.is_district_admin(new.parent_org_id, auth.uid()) then
    raise exception 'school_parent_requires_district_admin' using errcode = '42501';
  end if;

  return new;
end;
$$;

comment on function public.validate_organization_parent() is
  'Schools may attach to a district only when the writer administers that district or is a platform admin.';

-- ---------------------------------------------------------------------------
-- 2. District school rollup: grouped subqueries, not membership ⨯ events ⨯
--    entrants in one FROM.
-- ---------------------------------------------------------------------------
create or replace function public.get_district_school_rollup(p_district_id uuid)
returns table (
  school_id uuid,
  school_name text,
  active_students bigint,
  upcoming_tournaments bigint,
  invitations_pending bigint,
  going_count bigint,
  attended_this_season bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.is_district_admin(p_district_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    school.id,
    school.name,
    coalesce(students.n, 0) as active_students,
    coalesce(tourneys.n, 0) as upcoming_tournaments,
    coalesce(entrants.invited, 0) as invitations_pending,
    coalesce(entrants.going, 0) as going_count,
    coalesce(entrants.attended, 0) as attended_this_season
  from organizations school
  left join lateral (
    select count(*)::bigint as n
    from org_memberships m
    where m.org_id = school.id
      and m.status = 'active'
      and m.role = 'student'
  ) students on true
  left join lateral (
    select count(*)::bigint as n
    from competitions c
    where c.org_id = school.id
      and c.start_date >= current_date
      and c.status in ('published', 'pending_review')
  ) tourneys on true
  left join lateral (
    select
      count(*) filter (where e.status = 'invited')::bigint as invited,
      count(*) filter (where e.status = 'going')::bigint as going,
      count(*) filter (
        where e.status = 'attended'
          and c.start_date >= date_trunc('year', current_date)::date
      )::bigint as attended
    from competitions c
    join competition_entrants e on e.competition_id = c.id
    where c.org_id = school.id
  ) entrants on true
  where school.parent_org_id = p_district_id
    and school.type = 'school'
  order by lower(school.name);
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. One-shot connected-school student ids for district-hosted invite-all.
-- ---------------------------------------------------------------------------
create or replace function public.list_connected_school_student_ids(
  p_district_id uuid
)
returns table (profile_id uuid)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.is_district_admin(p_district_id, auth.uid())
       or public.is_org_coach(p_district_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select distinct m.profile_id
  from organizations school
  join org_memberships m on m.org_id = school.id
  where school.parent_org_id = p_district_id
    and school.type = 'school'
    and m.role = 'student'
    and m.status = 'active';
end;
$$;

revoke all on function public.list_connected_school_student_ids(uuid)
  from public, anon;
grant execute on function public.list_connected_school_student_ids(uuid)
  to authenticated;

comment on function public.list_connected_school_student_ids(uuid) is
  'Distinct active student profile ids on schools connected to one district.';

-- ---------------------------------------------------------------------------
-- 4. Bound reminder / notification enqueue. Invitation claims skip the
--    mixed reminder sweep.
-- ---------------------------------------------------------------------------
drop function if exists public.get_email_reminder_candidates();
drop function if exists public.get_email_reminder_candidates(integer);
create function public.get_email_reminder_candidates(
  p_limit integer default 500
)
returns table (
  profile_id uuid,
  recipient_email text,
  display_name text,
  profile_role text,
  timezone text,
  email_enabled boolean,
  guardian_routing boolean,
  invitation boolean,
  registration_deadline boolean,
  reminder_7_day boolean,
  reminder_1_day boolean,
  schedule_change boolean,
  cancellation boolean,
  rsvp_update boolean,
  announcement boolean,
  competition_id uuid,
  competition_slug text,
  competition_name text,
  start_date date,
  end_date date,
  reg_deadline date,
  reg_url text,
  relation text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with tracked as (
    select e.profile_id, e.competition_id, e.status::text as relation
    from public.competition_entrants e
    where e.status in ('invited', 'going')

    union all

    select s.user_id, s.competition_id, 'saved'
    from public.saved_competitions s

    union all

    select r.user_id, r.competition_id,
      case
        when r.status = 'opened' then 'registration_opened'
        else 'registration_needed'
      end
    from public.external_registrations r
    where r.status in ('opened', 'not_registered')
  )
  select
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    coalesce(pref.timezone, 'America/Chicago'),
    coalesce(pref.email_enabled, true),
    coalesce(pref.guardian_routing, true),
    coalesce(pref.invitation, true),
    coalesce(pref.registration_deadline, true),
    coalesce(pref.reminder_7_day, true),
    coalesce(pref.reminder_1_day, true),
    coalesce(pref.schedule_change, true),
    coalesce(pref.cancellation, true),
    coalesce(pref.rsvp_update, true),
    coalesce(pref.announcement, true),
    c.id,
    c.slug,
    c.name,
    c.start_date,
    c.end_date,
    c.reg_deadline,
    c.reg_url,
    tracked.relation
  from tracked
  join public.profiles p on p.id = tracked.profile_id
  join auth.users u on u.id = p.id
  join public.competitions c on c.id = tracked.competition_id
  left join public.notification_preferences pref on pref.profile_id = p.id
  where u.email is not null
    and c.status = 'published'
    and coalesce(c.end_date, c.start_date) >= current_date - 1
  order by p.id, c.start_date, c.id
  limit least(greatest(coalesce(p_limit, 500), 1), 2000);
$$;

revoke execute on function public.get_email_reminder_candidates(integer)
  from public, anon, authenticated;
grant execute on function public.get_email_reminder_candidates(integer)
  to service_role;

drop function if exists public.get_pending_notification_emails();
drop function if exists public.get_pending_notification_emails(integer);
create function public.get_pending_notification_emails(
  p_limit integer default 200
)
returns table (
  notification_id uuid,
  profile_id uuid,
  recipient_email text,
  display_name text,
  profile_role text,
  timezone text,
  email_enabled boolean,
  guardian_routing boolean,
  invitation boolean,
  registration_deadline boolean,
  reminder_7_day boolean,
  reminder_1_day boolean,
  schedule_change boolean,
  cancellation boolean,
  rsvp_update boolean,
  announcement boolean,
  result boolean,
  kind text,
  title text,
  body text,
  href text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    n.id,
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    coalesce(pref.timezone, 'America/Chicago'),
    coalesce(pref.email_enabled, true),
    coalesce(pref.guardian_routing, true),
    coalesce(pref.invitation, true),
    coalesce(pref.registration_deadline, true),
    coalesce(pref.reminder_7_day, true),
    coalesce(pref.reminder_1_day, true),
    coalesce(pref.schedule_change, true),
    coalesce(pref.cancellation, true),
    coalesce(pref.rsvp_update, true),
    coalesce(pref.announcement, true),
    coalesce(pref.result, true),
    n.kind,
    n.title,
    n.body,
    n.href
  from public.notifications n
  join public.profiles p on p.id = n.recipient_id
  join auth.users u on u.id = p.id
  left join public.notification_preferences pref on pref.profile_id = p.id
  where n.emailed_at is null
    and u.email is not null
    and n.kind in (
      'schedule_change', 'cancellation', 'rsvp_update', 'announcement',
      'account', 'result'
    )
  order by n.created_at, n.id
  limit least(greatest(coalesce(p_limit, 200), 1), 500);
$$;

revoke execute on function public.get_pending_notification_emails(integer)
  from public, anon, authenticated;
grant execute on function public.get_pending_notification_emails(integer)
  to service_role;

create or replace function public.count_ready_email_outbox()
returns integer
language sql
stable
security definer
set search_path = public
as $$
  select count(*)::integer
  from public.email_outbox outbox
  where (
      outbox.status in ('pending', 'failed')
      or (
        outbox.status = 'sending'
        and (
          outbox.locked_at is null
          or outbox.locked_at <= now() - interval '15 minutes'
        )
      )
    )
    and outbox.attempts < 4
    and outbox.send_after <= now();
$$;

revoke all on function public.count_ready_email_outbox()
  from public, anon, authenticated;
grant execute on function public.count_ready_email_outbox()
  to service_role;

create or replace function public.claim_email_outbox_invitations(
  p_limit integer default 25
)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select outbox.id
    from public.email_outbox outbox
    where outbox.template = 'organization_invitation'
      and (
        outbox.status in ('pending', 'failed')
        or (
          outbox.status = 'sending'
          and (
            outbox.locked_at is null
            or outbox.locked_at <= now() - interval '15 minutes'
          )
        )
      )
      and outbox.attempts < 4
      and outbox.send_after <= now()
    order by outbox.send_after, outbox.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  )
  update public.email_outbox outbox
  set status = 'sending',
      attempts = outbox.attempts + 1,
      locked_at = now(),
      last_error = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_email_outbox_invitations(integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_outbox_invitations(integer)
  to service_role;

create index if not exists email_outbox_pending_invitations_idx
  on public.email_outbox (send_after, created_at)
  where template = 'organization_invitation'
    and status in ('pending', 'failed', 'sending');

-- ---------------------------------------------------------------------------
-- 5. Rate-limit actor is JWT uid or a server-hashed IP, never a chosen key.
-- ---------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_actor_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  window_seconds integer := least(greatest(coalesce(p_window_seconds, 60), 1), 3600);
  max_hits integer := least(greatest(coalesce(p_max, 1), 1), 200);
  window_ts timestamptz;
  current_count integer;
  resolved_actor text;
begin
  if p_bucket not in (
    'search',
    'signup',
    'join_code',
    'claim',
    'csv_import',
    'comment',
    'geo'
  ) then
    raise exception 'invalid_rate_limit_bucket';
  end if;

  if auth.uid() is not null then
    resolved_actor := 'user:' || auth.uid()::text;
  else
    if p_actor_key is null or p_actor_key !~ '^ip:[a-f0-9]{64}$' then
      raise exception 'invalid_rate_limit_actor';
    end if;
    resolved_actor := p_actor_key;
  end if;

  window_ts := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  delete from public.rate_limit_buckets
  where bucket = p_bucket
    and rate_limit_buckets.actor_key = resolved_actor
    and window_start < window_ts;

  insert into public.rate_limit_buckets as bucket
    (bucket, actor_key, window_start, hit_count)
  values (p_bucket, resolved_actor, window_ts, 1)
  on conflict (bucket, actor_key, window_start)
  do update set hit_count = bucket.hit_count + 1
  returning bucket.hit_count into current_count;

  return current_count <= max_hits;
end;
$$;

comment on function public.consume_rate_limit(text, text, integer, integer) is
  'Increments an allowlisted bucket. Authenticated callers are keyed by auth.uid(); anonymous callers must pass ip:<64 hex>.';

-- ---------------------------------------------------------------------------
-- 6. Comments: hide after report; under-13 (and students without a DOB) cannot
--    post.
-- ---------------------------------------------------------------------------
alter table public.competition_comments
  add column if not exists hidden_at timestamptz;

create table if not exists public.competition_comment_reports (
  comment_id uuid not null references public.competition_comments (id) on delete cascade,
  reporter_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (comment_id, reporter_id)
);

comment on table public.competition_comment_reports is
  'One report per person per comment. First report hides the comment from public pages.';

alter table public.competition_comment_reports enable row level security;

revoke all on table public.competition_comment_reports from public, anon, authenticated;
grant select, insert on table public.competition_comment_reports to authenticated;

drop policy if exists "comment_reports_select_own_or_admin"
  on public.competition_comment_reports;
create policy "comment_reports_select_own_or_admin"
  on public.competition_comment_reports for select
  to authenticated
  using (
    reporter_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "comment_reports_insert_own"
  on public.competition_comment_reports;
create policy "comment_reports_insert_own"
  on public.competition_comment_reports for insert
  to authenticated
  with check (reporter_id = auth.uid());

create or replace function public.stamp_competition_comment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  label text;
  dob date;
  account_role text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'comment_author_mismatch' using errcode = '42501';
  end if;

  select date_of_birth, role
    into dob, account_role
  from public.profiles
  where id = new.user_id;

  if dob is not null and age(current_date, dob) < interval '13 years' then
    raise exception 'comment_under_13' using errcode = 'P0001';
  end if;
  if dob is null and account_role = 'student' then
    raise exception 'comment_age_required' using errcode = 'P0001';
  end if;

  new.body := btrim(new.body);
  if new.body is null or char_length(new.body) < 1 then
    raise exception 'comment_body_required' using errcode = '23514';
  end if;
  if char_length(new.body) > 800 then
    raise exception 'comment_body_too_long' using errcode = '23514';
  end if;

  select nullif(btrim(display_name), '')
    into label
  from public.profiles
  where id = new.user_id;

  new.author_label := left(coalesce(label, 'Member'), 80);
  new.created_at := now();
  new.hidden_at := null;
  return new;
end;
$$;

drop policy if exists "comments_select_if_competition_visible"
  on public.competition_comments;
create policy "comments_select_if_competition_visible"
  on public.competition_comments for select
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = competition_id
    )
    and (
      hidden_at is null
      or auth.uid() = user_id
      or public.is_platform_admin()
    )
  );

drop policy if exists "comments_insert_own"
  on public.competition_comments;
create policy "comments_insert_own"
  on public.competition_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.competitions c
      where c.id = competition_id
    )
    and exists (
      select 1
      from public.profiles p
      where p.id = auth.uid()
        and (
          (
            p.date_of_birth is not null
            and age(current_date, p.date_of_birth) >= interval '13 years'
          )
          or (
            p.date_of_birth is null
            and p.role <> 'student'
          )
        )
    )
  );

create or replace function public.report_competition_comment(p_comment_id uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  target public.competition_comments%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select * into target
  from public.competition_comments
  where id = p_comment_id;

  if target.id is null then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;
  if target.user_id = auth.uid() then
    raise exception 'comment_report_own' using errcode = 'P0001';
  end if;
  if not exists (
    select 1
    from public.competitions c
    where c.id = target.competition_id
      and (
        c.status = 'published'
        or public.can_manage_competition(c.id, auth.uid())
        or public.is_platform_admin()
      )
  ) then
    raise exception 'comment_not_found' using errcode = 'P0002';
  end if;

  insert into public.competition_comment_reports (comment_id, reporter_id)
  values (p_comment_id, auth.uid())
  on conflict (comment_id, reporter_id) do nothing;

  update public.competition_comments
  set hidden_at = coalesce(hidden_at, now())
  where id = p_comment_id
    and hidden_at is null;
end;
$$;

revoke all on function public.report_competition_comment(uuid)
  from public, anon;
grant execute on function public.report_competition_comment(uuid)
  to authenticated;

comment on function public.report_competition_comment(uuid) is
  'Records a report and hides the comment from public event pages.';
