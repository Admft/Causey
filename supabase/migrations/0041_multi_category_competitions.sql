-- Organization-hosted competition types beyond chess.
-- Public category directories remain an application-level readiness decision.

alter table public.competitions
  add column if not exists custom_category_name text,
  add column if not exists participation_mode text not null default 'in_person';

update public.competitions
set category = 'chess'
where category is null or btrim(category) = '';

update public.competitions
set participation_mode = 'in_person'
where participation_mode is null;

alter table public.competitions
  drop constraint if exists competitions_category_check;
alter table public.competitions
  add constraint competitions_category_check
  check (category in ('chess', 'stem', 'debate', 'arts', 'writing', 'other'));

alter table public.competitions
  drop constraint if exists competitions_custom_category_name_check;
alter table public.competitions
  add constraint competitions_custom_category_name_check
  check (
    (category = 'other' and nullif(btrim(custom_category_name), '') is not null)
    or (category <> 'other' and custom_category_name is null)
  );

alter table public.competitions
  drop constraint if exists competitions_participation_mode_check;
alter table public.competitions
  add constraint competitions_participation_mode_check
  check (participation_mode in ('in_person', 'online', 'hybrid'));

-- Online competitions do not need a physical location. Existing rows retain
-- their location, and in-person/hybrid records remain location-complete.
alter table public.competitions
  alter column city drop not null,
  alter column state drop not null,
  alter column zip drop not null,
  alter column lat drop not null,
  alter column lng drop not null,
  alter column rating_system drop not null;

alter table public.competitions
  drop constraint if exists competitions_location_by_mode_check;
alter table public.competitions
  add constraint competitions_location_by_mode_check
  check (
    participation_mode = 'online'
    or (
      nullif(btrim(city), '') is not null
      and state ~ '^[A-Z]{2}$'
      and zip ~ '^[0-9]{5}$'
      and lat is not null
      and lng is not null
    )
  );

create index if not exists competitions_category_status_start_idx
  on public.competitions (category, status, start_date);

-- District administrators may operate competitions for their district or a
-- child school. Assistant coaches remain read-only.
create or replace function public.can_operate_org_competitions(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_coach(p_org_id, p_profile_id)
  or exists (
    select 1
    from organizations child
    where child.id = p_org_id
      and child.parent_org_id is not null
      and public.is_district_admin(child.parent_org_id, p_profile_id)
  );
$$;

revoke execute on function public.can_operate_org_competitions(uuid, uuid)
  from public, anon;
grant execute on function public.can_operate_org_competitions(uuid, uuid)
  to authenticated;

create or replace function public.can_manage_competition(
  p_competition_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (
    p_profile_id = auth.uid()
    and public.is_platform_admin()
  )
  or exists (
    select 1
    from competitions c
    where c.id = p_competition_id
      and (
        (c.org_id is null and c.created_by = p_profile_id)
        or (
          c.org_id is not null
          and public.can_operate_org_competitions(c.org_id, p_profile_id)
        )
      )
  );
$$;

create or replace function public.replace_competition_sections(
  p_competition_id uuid,
  p_sections jsonb
)
returns void
language plpgsql security definer set search_path = public
as $$
begin
  if not public.can_manage_competition(p_competition_id, auth.uid()) then
    raise exception 'Competition management access required'
      using errcode = '42501';
  end if;
  if jsonb_typeof(p_sections) <> 'array'
    or jsonb_array_length(p_sections) < 1
    or jsonb_array_length(p_sections) > 20 then
    raise exception 'One to twenty divisions are required'
      using errcode = '22023';
  end if;

  delete from sections where competition_id = p_competition_id;
  insert into sections (
    competition_id,
    name,
    min_rating,
    max_rating,
    min_grade,
    max_grade,
    entry_fee_cents
  )
  select
    p_competition_id,
    division.name,
    division.min_rating,
    division.max_rating,
    division.min_grade,
    division.max_grade,
    division.entry_fee_cents
  from jsonb_to_recordset(p_sections) as division(
    name text,
    min_rating integer,
    max_rating integer,
    min_grade integer,
    max_grade integer,
    entry_fee_cents integer
  )
  where nullif(btrim(division.name), '') is not null;

  if not found then
    raise exception 'At least one named division is required'
      using errcode = '22023';
  end if;
end;
$$;

revoke execute on function public.replace_competition_sections(uuid, jsonb)
  from public, anon;
grant execute on function public.replace_competition_sections(uuid, jsonb)
  to authenticated;

create or replace function public.update_competition_with_sections(
  p_competition_id uuid,
  p_values jsonb,
  p_sections jsonb default null
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  updated_slug text;
begin
  if not public.can_manage_competition(p_competition_id, auth.uid()) then
    raise exception 'Competition management access required'
      using errcode = '42501';
  end if;

  update competitions
  set
    category = p_values->>'category',
    custom_category_name = nullif(p_values->>'custom_category_name', ''),
    participation_mode = p_values->>'participation_mode',
    name = p_values->>'name',
    venue_name = nullif(p_values->>'venue_name', ''),
    address = nullif(p_values->>'address', ''),
    city = nullif(p_values->>'city', ''),
    state = nullif(p_values->>'state', ''),
    zip = nullif(p_values->>'zip', ''),
    lat = nullif(p_values->>'lat', '')::double precision,
    lng = nullif(p_values->>'lng', '')::double precision,
    start_date = (p_values->>'start_date')::date,
    end_date = nullif(p_values->>'end_date', '')::date,
    reg_deadline = nullif(p_values->>'reg_deadline', '')::date,
    reg_url = nullif(p_values->>'reg_url', ''),
    entry_fee_cents = nullif(p_values->>'entry_fee_cents', '')::integer,
    rated = (p_values->>'rated')::boolean,
    rating_system = nullif(p_values->>'rating_system', ''),
    visibility = p_values->>'visibility',
    audience = p_values->>'audience',
    updated_at = now()
  where id = p_competition_id
  returning slug into updated_slug;

  if updated_slug is null then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;

  if p_sections is not null then
    perform public.replace_competition_sections(
      p_competition_id,
      p_sections
    );
  elsif p_values->>'category' <> 'chess' then
    update sections
    set min_rating = null, max_rating = null
    where competition_id = p_competition_id;
  end if;

  return updated_slug;
end;
$$;

revoke execute on function public.update_competition_with_sections(
  uuid,
  jsonb,
  jsonb
) from public, anon;
grant execute on function public.update_competition_with_sections(
  uuid,
  jsonb,
  jsonb
) to authenticated;

drop policy if exists "competitions_insert_coach" on public.competitions;
create policy "competitions_insert_coach"
  on public.competitions for insert
  with check (
    created_by = auth.uid()
    and source = 'organizer'
    and (
      (org_id is null and public.is_unlocked_coach(auth.uid()))
      or (
        org_id is not null
        and public.can_operate_org_competitions(org_id, auth.uid())
      )
    )
  );

drop policy if exists "competitions_update_manager" on public.competitions;
create policy "competitions_update_manager"
  on public.competitions for update
  using (
    public.can_manage_competition(id, auth.uid())
  )
  with check (
    public.can_manage_competition(id, auth.uid())
  );

drop policy if exists "competitions_select_unpublished_manager"
  on public.competitions;
create policy "competitions_select_unpublished_manager"
  on public.competitions for select
  to authenticated
  using (
    status <> 'published'
    and (
      (org_id is null and created_by = auth.uid())
      or (
        org_id is not null
        and public.can_operate_org_competitions(org_id, auth.uid())
      )
      or public.is_platform_admin()
    )
  );

drop policy if exists "sections_select_unpublished_manager"
  on public.sections;
create policy "sections_select_unpublished_manager"
  on public.sections for select
  to authenticated
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = sections.competition_id
        and c.status <> 'published'
        and (
          (c.org_id is null and c.created_by = auth.uid())
          or (
            c.org_id is not null
            and public.can_operate_org_competitions(c.org_id, auth.uid())
          )
          or public.is_platform_admin()
        )
    )
  );

-- Draft rows use the same operator boundary as published competition records.
drop policy if exists "tournament_drafts_select_coach"
  on public.tournament_drafts;
create policy "tournament_drafts_select_coach"
  on public.tournament_drafts for select
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "tournament_drafts_insert_coach"
  on public.tournament_drafts;
create policy "tournament_drafts_insert_coach"
  on public.tournament_drafts for insert
  with check (
    created_by = auth.uid()
    and (
      public.can_operate_org_competitions(org_id, auth.uid())
      or public.is_platform_admin()
    )
  );

drop policy if exists "tournament_drafts_update_coach"
  on public.tournament_drafts;
create policy "tournament_drafts_update_coach"
  on public.tournament_drafts for update
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  )
  with check (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "tournament_drafts_delete_coach"
  on public.tournament_drafts;
create policy "tournament_drafts_delete_coach"
  on public.tournament_drafts for delete
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );
