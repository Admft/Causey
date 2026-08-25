-- Club-scoped competition results: division, placement, and a short award
-- label on competition_entrants. Managers record outcomes; students and
-- parents may read their own rows. No public people directory.

alter table public.competition_entrants
  add column if not exists section_id uuid
    references public.sections (id) on delete set null;
alter table public.competition_entrants
  add column if not exists placement integer;
alter table public.competition_entrants
  add column if not exists award_label text;
alter table public.competition_entrants
  add column if not exists result_marked_by uuid
    references public.profiles (id) on delete set null;
alter table public.competition_entrants
  add column if not exists result_marked_at timestamptz;

alter table public.competition_entrants
  drop constraint if exists competition_entrants_placement_check;
alter table public.competition_entrants
  add constraint competition_entrants_placement_check
  check (placement is null or placement between 1 and 999);

alter table public.competition_entrants
  drop constraint if exists competition_entrants_award_label_check;
alter table public.competition_entrants
  add constraint competition_entrants_award_label_check
  check (
    award_label is null
    or char_length(btrim(award_label)) between 1 and 80
  );

create index if not exists competition_entrants_section_idx
  on public.competition_entrants (section_id)
  where section_id is not null;

comment on column public.competition_entrants.section_id is
  'Optional division for this person at this event. Must belong to the same competition.';
comment on column public.competition_entrants.placement is
  'Optional recorded place (1 = first). Null means not recorded, not “did not place”.';
comment on column public.competition_entrants.award_label is
  'Optional type-agnostic award note (broke to elims, VASE gold, team trophy).';

revoke update on public.competition_entrants from anon, authenticated;
grant update (
  status,
  responded_by,
  responded_at,
  attendance_marked_by,
  attendance_marked_at,
  section_id,
  placement,
  award_label,
  result_marked_by,
  result_marked_at
) on public.competition_entrants to authenticated;

create or replace function public.guard_competition_entrant_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  self_or_parent boolean;
  manager boolean;
  response_changed boolean;
  attendance_changed boolean;
  result_changed boolean;
  result_payload_present boolean;
  section_competition uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if new.competition_id is distinct from old.competition_id
     or new.profile_id is distinct from old.profile_id
     or new.invited_by is distinct from old.invited_by
     or new.created_at is distinct from old.created_at then
    raise exception 'entrant_identity_fields_locked'
      using errcode = '42501';
  end if;

  self_or_parent :=
    actor = old.profile_id
    or public.is_parent_of(actor, old.profile_id);
  manager :=
    public.can_manage_competition(old.competition_id, actor)
    or public.can_invite_to_competition(
      old.competition_id,
      old.profile_id,
      actor
    );

  response_changed :=
    new.responded_by is distinct from old.responded_by
    or new.responded_at is distinct from old.responded_at;
  attendance_changed :=
    new.attendance_marked_by is distinct from old.attendance_marked_by
    or new.attendance_marked_at is distinct from old.attendance_marked_at;
  result_changed :=
    new.section_id is distinct from old.section_id
    or new.placement is distinct from old.placement
    or new.award_label is distinct from old.award_label
    or new.result_marked_by is distinct from old.result_marked_by
    or new.result_marked_at is distinct from old.result_marked_at;
  result_payload_present :=
    new.section_id is not null
    or new.placement is not null
    or nullif(btrim(coalesce(new.award_label, '')), '') is not null;

  if new.award_label is not null then
    new.award_label := btrim(new.award_label);
    if new.award_label = '' then
      new.award_label := null;
    end if;
  end if;

  if new.status is distinct from old.status then
    if new.status in ('going', 'not_going') then
      if not self_or_parent
         or old.status in ('attended', 'did_not_attend')
         or new.responded_by is distinct from actor
         or new.responded_at is null
         or attendance_changed
         or result_changed then
        raise exception 'entrant_rsvp_update_not_authorized'
          using errcode = '42501';
      end if;
    elsif new.status in ('attended', 'did_not_attend') then
      if not manager
         or response_changed
         or new.attendance_marked_by is distinct from actor
         or new.attendance_marked_at is null then
        raise exception 'entrant_attendance_update_not_authorized'
          using errcode = '42501';
      end if;
    else
      raise exception 'entrant_status_transition_not_allowed'
        using errcode = '42501';
    end if;
  else
    if response_changed and (
      not self_or_parent
      or new.status not in ('going', 'not_going')
      or new.responded_by is distinct from actor
      or new.responded_at is null
    ) then
      raise exception 'entrant_response_integrity_violation'
        using errcode = '42501';
    end if;

    if attendance_changed and (
      not manager
      or new.status not in ('attended', 'did_not_attend')
      or new.attendance_marked_by is distinct from actor
      or new.attendance_marked_at is null
    ) then
      raise exception 'entrant_attendance_integrity_violation'
        using errcode = '42501';
    end if;
  end if;

  if result_changed then
    if not manager then
      raise exception 'entrant_result_update_not_authorized'
        using errcode = '42501';
    end if;
    if new.section_id is not null then
      select section.competition_id
        into section_competition
      from public.sections section
      where section.id = new.section_id;
      if section_competition is distinct from old.competition_id then
        raise exception 'entrant_section_not_in_competition'
          using errcode = '42501';
      end if;
    end if;
    if result_payload_present then
      if new.result_marked_by is distinct from actor
         or new.result_marked_at is null then
        raise exception 'entrant_result_integrity_violation'
          using errcode = '42501';
      end if;
    else
      new.result_marked_by := null;
      new.result_marked_at := null;
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists competition_entrants_guard_update
  on public.competition_entrants;
create trigger competition_entrants_guard_update
  before update on public.competition_entrants
  for each row execute function public.guard_competition_entrant_update();

revoke all on function public.guard_competition_entrant_update()
  from public, anon, authenticated;

drop function if exists public.get_event_attendance(uuid);

create or replace function public.get_event_attendance(
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
      entrant.award_label
    from public.competition_entrants entrant
    join public.profiles profile
      on profile.id = entrant.profile_id
    left join public.sections section
      on section.id = entrant.section_id
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

create or replace function public.get_org_member_competition_history(
  p_org_id uuid,
  p_profile_id uuid
)
returns table (
  competition_id uuid,
  slug text,
  name text,
  category text,
  start_date date,
  end_date date,
  status text,
  section_name text,
  placement integer,
  award_label text
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if not (
    actor = p_profile_id
    or public.is_parent_of(actor, p_profile_id)
    or public.is_org_staff(p_org_id, actor)
    or public.can_administer_org(p_org_id, actor)
    or public.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      competition.id,
      competition.slug,
      competition.name,
      competition.category,
      competition.start_date,
      competition.end_date,
      entrant.status,
      section.name,
      entrant.placement,
      entrant.award_label
    from public.competition_entrants entrant
    join public.competitions competition
      on competition.id = entrant.competition_id
    left join public.sections section
      on section.id = entrant.section_id
    where entrant.profile_id = p_profile_id
      and (
        competition.org_id = p_org_id
        or exists (
          select 1
          from public.org_competition_attendance attendance
          where attendance.org_id = p_org_id
            and attendance.competition_id = competition.id
        )
      )
    order by competition.start_date desc, lower(competition.name);
end;
$$;

revoke all on function public.get_org_member_competition_history(uuid, uuid)
  from public, anon;
grant execute on function public.get_org_member_competition_history(uuid, uuid)
  to authenticated;

comment on function public.get_org_member_competition_history(uuid, uuid) is
  'Club-scoped event history for one member: hosted or club-attending events only. Display fields, no DOB/zip/email.';
