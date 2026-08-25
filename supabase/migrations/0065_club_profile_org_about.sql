-- Club coordination leftovers: grade + typed credential IDs on profiles,
-- member-only org website/meeting note, season attendance that includes
-- public events the club marked as attending.

alter table public.profiles
  add column if not exists grade integer;
alter table public.profiles
  add column if not exists credential_ids jsonb not null default '{}'::jsonb;

alter table public.profiles
  drop constraint if exists profiles_grade_check;
alter table public.profiles
  add constraint profiles_grade_check
  check (grade is null or grade between 0 and 12);

alter table public.profiles
  drop constraint if exists profiles_credential_ids_check;
alter table public.profiles
  add constraint profiles_credential_ids_check
  check (
    jsonb_typeof(credential_ids) = 'object'
    and not exists (
      select 1
      from jsonb_object_keys(credential_ids) as key
      where key not in ('uscf', 'nsda', 'other')
    )
    and not exists (
      select 1
      from jsonb_each(credential_ids) as entry
      where jsonb_typeof(entry.value) <> 'string'
         or char_length(btrim(entry.value #>> '{}')) > 40
    )
  );

comment on column public.profiles.grade is
  'Optional school grade 0 (K) through 12. Not a live eligibility lookup.';
comment on column public.profiles.credential_ids is
  'Typed membership numbers coaches can read on the roster. Keys: uscf, nsda, other. Not live MSA/Tabroom lookup.';

revoke update on public.profiles from anon, authenticated;
grant update (
  display_name,
  date_of_birth,
  age_band,
  state,
  zip,
  interests,
  preferred_competition_category,
  grade,
  credential_ids,
  updated_at
) on public.profiles to authenticated;

alter table public.organizations
  add column if not exists website_url text;
alter table public.organizations
  add column if not exists meeting_note text;

alter table public.organizations
  drop constraint if exists organizations_website_url_check;
alter table public.organizations
  add constraint organizations_website_url_check
  check (
    website_url is null
    or (
      char_length(website_url) between 8 and 200
      and website_url ~* '^https?://.+'
    )
  );

alter table public.organizations
  drop constraint if exists organizations_meeting_note_check;
alter table public.organizations
  add constraint organizations_meeting_note_check
  check (
    meeting_note is null
    or char_length(btrim(meeting_note)) between 1 and 280
  );

comment on column public.organizations.website_url is
  'Optional club website. Member-visible only — not a public directory.';
comment on column public.organizations.meeting_note is
  'Optional where/when the club meets. Member-visible only.';

drop function if exists public.get_org_roster(uuid);

create or replace function public.get_org_roster(p_org_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  age_band text,
  grade integer,
  credential_ids jsonb,
  member_role text,
  member_status text,
  joined_at timestamptz
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.is_org_staff(p_org_id, auth.uid())
       or public.can_administer_org(p_org_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      membership.profile_id,
      profile.display_name,
      profile.age_band,
      profile.grade,
      profile.credential_ids,
      membership.role,
      membership.status,
      membership.created_at
    from public.org_memberships membership
    join public.profiles profile
      on profile.id = membership.profile_id
    where membership.org_id = p_org_id
      and membership.status <> 'removed'
    order by lower(profile.display_name);
end;
$$;

revoke all on function public.get_org_roster(uuid) from public, anon;
grant execute on function public.get_org_roster(uuid) to authenticated;

create or replace function public.get_org_season_attendance(p_org_id uuid)
returns table (
  competition_id uuid,
  slug text,
  name text,
  start_date date,
  hosted boolean,
  profile_id uuid,
  display_name text,
  status text,
  attendance_marked_at timestamptz,
  section_name text,
  placement integer,
  award_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.is_org_staff(p_org_id, auth.uid())
       or public.can_administer_org(p_org_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      competition.id,
      competition.slug,
      competition.name,
      competition.start_date,
      competition.org_id = p_org_id,
      entrant.profile_id,
      profile.display_name,
      entrant.status,
      entrant.attendance_marked_at,
      section.name,
      entrant.placement,
      entrant.award_label
    from public.competition_entrants entrant
    join public.competitions competition
      on competition.id = entrant.competition_id
    join public.profiles profile
      on profile.id = entrant.profile_id
    left join public.sections section
      on section.id = entrant.section_id
    where entrant.status in ('attended', 'did_not_attend')
      and competition.start_date >= make_date(extract(year from current_date)::int, 1, 1)
      and (
        competition.org_id = p_org_id
        or exists (
          select 1
          from public.org_competition_attendance attendance
          where attendance.org_id = p_org_id
            and attendance.competition_id = competition.id
        )
      )
      and exists (
        select 1
        from public.org_memberships membership
        where membership.org_id = p_org_id
          and membership.profile_id = entrant.profile_id
          and membership.status = 'active'
      )
    order by
      competition.start_date desc,
      lower(profile.display_name);
end;
$$;

revoke all on function public.get_org_season_attendance(uuid)
  from public, anon;
grant execute on function public.get_org_season_attendance(uuid)
  to authenticated;

comment on function public.get_org_season_attendance(uuid) is
  'Season attendance for club members on hosted or club-attending events, including recorded place/award.';
