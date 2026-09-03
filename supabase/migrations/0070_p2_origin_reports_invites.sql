-- P2: participating-school origin on district-hosted invites, type-sliced
-- district rollups, invitation role fit at the database, set-based CSV
-- invites, and origin on get_event_attendance.

-- ---------------------------------------------------------------------------
-- 1. Durable school-of-origin on competition_entrants.
-- ---------------------------------------------------------------------------
alter table public.competition_entrants
  add column if not exists origin_org_id uuid
    references public.organizations (id) on delete set null;

create index if not exists competition_entrants_origin_org_idx
  on public.competition_entrants (origin_org_id)
  where origin_org_id is not null;

comment on column public.competition_entrants.origin_org_id is
  'Organization the student was invited from (connected school on a district-hosted event; host org on a school/club/team event). Null means not recorded.';

-- ---------------------------------------------------------------------------
-- 2. Invitation roles must match the organization type.
-- ---------------------------------------------------------------------------
create or replace function public.invitation_role_fits_organization(
  p_org_type text,
  p_role text
)
returns boolean
language sql
immutable
as $$
  select case
    when p_org_type = 'district' then
      p_role is not null
      and p_role not in ('student', 'school_admin')
    when p_org_type in ('club', 'team') then
      p_role is not null
      and p_role not in ('district_admin', 'school_admin')
    else
      p_role is not null
      and p_role is distinct from 'district_admin'
  end;
$$;

revoke all on function public.invitation_role_fits_organization(text, text)
  from public, anon;
grant execute on function public.invitation_role_fits_organization(text, text)
  to authenticated;

comment on function public.invitation_role_fits_organization(text, text) is
  'District staff roles only on districts; school_admin only on schools; district_admin never on school/club/team.';

create or replace function public.create_org_invitation(
  p_org_id uuid,
  p_email text,
  p_role text,
  p_display_name text default null,
  p_batch_id uuid default null
)
returns table (invitation_id uuid, claim_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  new_id uuid;
  expiry timestamptz := now() + interval '7 days';
  org_type text;
begin
  if auth.uid() is null
     or not public.can_administer_org(p_org_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if p_role not in (
    'student', 'assistant_coach', 'coach', 'school_admin', 'district_admin'
  ) then
    raise exception 'invalid_role';
  end if;

  select type into org_type
  from public.organizations
  where id = p_org_id;
  if org_type is null then
    raise exception 'not_authorized';
  end if;
  if not public.invitation_role_fits_organization(org_type, p_role) then
    raise exception 'invalid_role';
  end if;

  update org_invitations
  set status = 'revoked', revoked_at = now()
  where org_id = p_org_id
    and lower(email) = normalized_email
    and role = p_role
    and status = 'pending';

  insert into org_invitations (
    org_id, batch_id, email, display_name, role,
    token_hash, invited_by, expires_at
  )
  values (
    p_org_id, p_batch_id, normalized_email, nullif(trim(p_display_name), ''),
    p_role, encode(digest(raw_token, 'sha256'), 'hex'), auth.uid(), expiry
  )
  returning id into new_id;

  insert into email_outbox (
    recipient_email, template, payload, dedupe_key
  )
  values (
    normalized_email,
    'organization_invitation',
    jsonb_build_object(
      'invitation_id', new_id,
      'claim_token', raw_token,
      'org_id', p_org_id,
      'role', p_role,
      'expires_at', expiry
    ),
    'organization-invitation:' || new_id::text
  );

  return query select new_id, raw_token, expiry;
end;
$$;

-- One round-trip for CSV imports. Still loops internally so each row gets a
-- unique claim token; the app does not N-call create_org_invitation.
create or replace function public.create_org_invitations(
  p_org_id uuid,
  p_emails text[],
  p_roles text[],
  p_display_names text[],
  p_batch_id uuid default null
)
returns table (
  email text,
  invitation_id uuid,
  claim_token text,
  expires_at timestamptz,
  error_text text
)
language plpgsql
security definer
set search_path = public
as $$
declare
  email_count integer := coalesce(array_length(p_emails, 1), 0);
  i integer;
  created record;
begin
  if auth.uid() is null
     or not public.can_administer_org(p_org_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;
  if email_count = 0 then
    return;
  end if;
  if email_count > 500 then
    raise exception 'too_many_invitations';
  end if;
  if coalesce(array_length(p_roles, 1), 0) <> email_count then
    raise exception 'invalid_invitation_batch';
  end if;

  for i in 1..email_count loop
    begin
      select *
      into created
      from public.create_org_invitation(
        p_org_id,
        p_emails[i],
        p_roles[i],
        case
          when p_display_names is null then null
          when i > coalesce(array_length(p_display_names, 1), 0) then null
          else p_display_names[i]
        end,
        p_batch_id
      );
      email := lower(trim(p_emails[i]));
      invitation_id := created.invitation_id;
      claim_token := created.claim_token;
      expires_at := created.expires_at;
      error_text := null;
      return next;
    exception
      when others then
        email := lower(trim(coalesce(p_emails[i], '')));
        invitation_id := null;
        claim_token := null;
        expires_at := null;
        error_text := case
          when sqlerrm = 'invalid_email' then 'Invalid email'
          when sqlerrm = 'invalid_role' then 'Invalid role'
          when sqlerrm = 'not_authorized' then 'Not authorized'
          else 'Could not create this invitation'
        end;
        return next;
    end;
  end loop;
end;
$$;

revoke all on function public.create_org_invitations(uuid, text[], text[], text[], uuid)
  from public, anon;
grant execute on function public.create_org_invitations(uuid, text[], text[], text[], uuid)
  to authenticated;

comment on function public.create_org_invitations(uuid, text[], text[], text[], uuid) is
  'Create up to 500 organization invitations in one call. Failed rows return error_text and no token.';

-- ---------------------------------------------------------------------------
-- 3. Connected-school student ids include the school for origin stamping.
-- ---------------------------------------------------------------------------
drop function if exists public.list_connected_school_student_ids(uuid);

create function public.list_connected_school_student_ids(
  p_district_id uuid
)
returns table (profile_id uuid, school_id uuid)
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
  select distinct on (m.profile_id)
    m.profile_id,
    school.id as school_id
  from organizations school
  join org_memberships m on m.org_id = school.id
  where school.parent_org_id = p_district_id
    and school.type = 'school'
    and m.role = 'student'
    and m.status = 'active'
  order by m.profile_id, lower(school.name);
end;
$$;

revoke all on function public.list_connected_school_student_ids(uuid)
  from public, anon;
grant execute on function public.list_connected_school_student_ids(uuid)
  to authenticated;

comment on function public.list_connected_school_student_ids(uuid) is
  'Active students on connected schools, with one school_id per student (first school name).';

-- ---------------------------------------------------------------------------
-- 4. Type-sliced district rollups. p_category null = all types.
-- ---------------------------------------------------------------------------
drop function if exists public.get_district_school_rollup(uuid);

create function public.get_district_school_rollup(
  p_district_id uuid,
  p_category text default null
)
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
  if p_category is not null
     and p_category not in (
       'chess', 'stem', 'debate', 'arts', 'writing', 'other'
     ) then
    raise exception 'invalid_category';
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
      and (p_category is null or c.category = p_category)
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
      and (p_category is null or c.category = p_category)
  ) entrants on true
  where school.parent_org_id = p_district_id
    and school.type = 'school'
  order by lower(school.name);
end;
$$;

revoke all on function public.get_district_school_rollup(uuid, text)
  from public, anon;
grant execute on function public.get_district_school_rollup(uuid, text)
  to authenticated;

drop function if exists public.get_district_hosted_rollup(uuid);

create function public.get_district_hosted_rollup(
  p_district_id uuid,
  p_category text default null
)
returns table (
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
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_category is not null
     and p_category not in (
       'chess', 'stem', 'debate', 'arts', 'writing', 'other'
     ) then
    raise exception 'invalid_category';
  end if;

  return query
  select
    count(distinct competition.id) filter (
      where competition.start_date >= current_date
        and competition.status in ('published', 'pending_review')
    ) as upcoming_tournaments,
    count(distinct (entrant.competition_id, entrant.profile_id)) filter (
      where entrant.status = 'invited'
    ) as invitations_pending,
    count(distinct (entrant.competition_id, entrant.profile_id)) filter (
      where entrant.status = 'going'
    ) as going_count,
    count(distinct (entrant.competition_id, entrant.profile_id)) filter (
      where entrant.status = 'attended'
        and competition.start_date >=
          date_trunc('year', current_date)::date
    ) as attended_this_season
  from public.competitions competition
  left join public.competition_entrants entrant
    on entrant.competition_id = competition.id
  where competition.org_id = p_district_id
    and (p_category is null or competition.category = p_category);
end;
$$;

revoke all on function public.get_district_hosted_rollup(uuid, text)
  from public, anon;
grant execute on function public.get_district_hosted_rollup(uuid, text)
  to authenticated;

create or replace function public.get_district_hosted_origin_rollup(
  p_district_id uuid,
  p_category text default null
)
returns table (
  school_id uuid,
  school_name text,
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
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_category is not null
     and p_category not in (
       'chess', 'stem', 'debate', 'arts', 'writing', 'other'
     ) then
    raise exception 'invalid_category';
  end if;

  return query
  select
    origin.id,
    origin.name,
    count(*) filter (where entrant.status = 'invited')::bigint,
    count(*) filter (where entrant.status = 'going')::bigint,
    count(*) filter (
      where entrant.status = 'attended'
        and competition.start_date >=
          date_trunc('year', current_date)::date
    )::bigint
  from public.competitions competition
  join public.competition_entrants entrant
    on entrant.competition_id = competition.id
  join public.organizations origin
    on origin.id = entrant.origin_org_id
  where competition.org_id = p_district_id
    and origin.type = 'school'
    and origin.parent_org_id = p_district_id
    and (p_category is null or competition.category = p_category)
  group by origin.id, origin.name
  order by lower(origin.name);
end;
$$;

revoke all on function public.get_district_hosted_origin_rollup(uuid, text)
  from public, anon;
grant execute on function public.get_district_hosted_origin_rollup(uuid, text)
  to authenticated;

comment on function public.get_district_hosted_origin_rollup(uuid, text) is
  'District-hosted invitation counts grouped by recorded origin school. Students with no origin_org_id are omitted.';

-- ---------------------------------------------------------------------------
-- 5. Attendance rows include origin school when recorded.
-- ---------------------------------------------------------------------------
drop function if exists public.get_event_attendance(uuid);

create function public.get_event_attendance(
  p_competition_id uuid
)
returns table (
  profile_id uuid,
  display_name text,
  status text,
  responded_at timestamptz,
  member_status text,
  section_id uuid,
  section_name text,
  placement integer,
  award_label text,
  origin_org_id uuid,
  origin_org_name text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.can_manage_competition(
         p_competition_id,
         auth.uid()
       )
       or exists (
         select 1
         from public.org_competition_attendance attendance
         where attendance.competition_id = p_competition_id
           and (
             public.can_operate_org_competitions(
               attendance.org_id,
               auth.uid()
             )
             or public.is_platform_admin()
           )
       )
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      entrant.profile_id,
      profile.display_name,
      entrant.status,
      entrant.responded_at,
      case when exists (
        select 1
        from public.org_memberships membership
        join public.competitions competition
          on competition.id = entrant.competition_id
        where membership.profile_id = entrant.profile_id
          and membership.status = 'active'
          and (
            membership.org_id = competition.org_id
            or membership.org_id in (
              select attendance.org_id
              from public.org_competition_attendance attendance
              where attendance.competition_id =
                entrant.competition_id
            )
          )
      ) then 'active' else 'removed' end,
      entrant.section_id,
      section.name,
      entrant.placement,
      entrant.award_label,
      entrant.origin_org_id,
      origin_org.name
    from public.competition_entrants entrant
    join public.profiles profile
      on profile.id = entrant.profile_id
    left join public.sections section
      on section.id = entrant.section_id
    left join public.organizations origin_org
      on origin_org.id = entrant.origin_org_id
    where entrant.competition_id = p_competition_id
      and (
        public.can_manage_competition(
          p_competition_id,
          auth.uid()
        )
        or public.can_invite_to_competition(
          p_competition_id,
          entrant.profile_id,
          auth.uid()
        )
      )
    order by lower(profile.display_name);
end;
$$;

revoke all on function public.get_event_attendance(uuid)
  from public, anon;
grant execute on function public.get_event_attendance(uuid)
  to authenticated;
