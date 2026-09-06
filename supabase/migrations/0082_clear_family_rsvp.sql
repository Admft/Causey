-- Families can unmark Going / Can't go back to no answer.
-- Coach invites reset to invited (the invite still stands). Family-discovery
-- rows the parent or student created are deleted, which is unanswered.
-- Run after 0081_support_reports.sql.

drop policy if exists "entrants_delete_own_family_rsvp"
  on public.competition_entrants;
create policy "entrants_delete_own_family_rsvp"
  on public.competition_entrants for delete
  to authenticated
  using (
    status in ('going', 'not_going')
    and (
      profile_id = auth.uid()
      or public.is_parent_of(auth.uid(), profile_id)
    )
    and (
      invited_by = auth.uid()
      or invited_by = profile_id
    )
  );

comment on policy "entrants_delete_own_family_rsvp" on public.competition_entrants is
  'A student or linked parent may delete a going/not_going row they created on a public listing, returning to no answer.';

grant delete on public.competition_entrants to authenticated;

drop trigger if exists competition_entrants_guard_update
  on public.competition_entrants;

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
  expected_source text;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if new.competition_id is distinct from old.competition_id
     or new.profile_id is distinct from old.profile_id
     or new.invited_by is distinct from old.invited_by
     or new.created_at is distinct from old.created_at
     or new.origin_org_id is distinct from old.origin_org_id then
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
    or new.responded_at is distinct from old.responded_at
    or new.response_source is distinct from old.response_source;
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
      if old.status in ('attended', 'did_not_attend')
         or attendance_changed
         or result_changed
         or new.responded_by is distinct from actor
         or new.responded_at is null then
        raise exception 'entrant_rsvp_update_not_authorized'
          using errcode = '42501';
      end if;

      if self_or_parent then
        expected_source := case
          when actor = old.profile_id then 'self'
          else 'parent'
        end;
        if new.response_source is distinct from expected_source then
          raise exception 'entrant_rsvp_update_not_authorized'
            using errcode = '42501';
        end if;
      elsif manager then
        if new.response_source is distinct from 'staff' then
          raise exception 'entrant_rsvp_update_not_authorized'
            using errcode = '42501';
        end if;
      else
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
    elsif new.status = 'invited' then
      if old.status not in ('going', 'not_going')
         or not self_or_parent
         or attendance_changed
         or result_changed then
        raise exception 'entrant_status_transition_not_allowed'
          using errcode = '42501';
      end if;
      new.responded_by := null;
      new.responded_at := null;
      new.response_source := null;
    else
      raise exception 'entrant_status_transition_not_allowed'
        using errcode = '42501';
    end if;
  else
    if response_changed then
      if not self_or_parent
         or new.status not in ('going', 'not_going')
         or new.responded_by is distinct from actor
         or new.responded_at is null then
        raise exception 'entrant_response_integrity_violation'
          using errcode = '42501';
      end if;
      expected_source := case
        when actor = old.profile_id then 'self'
        else 'parent'
      end;
      if new.response_source is distinct from expected_source then
        raise exception 'entrant_response_integrity_violation'
          using errcode = '42501';
      end if;
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

create trigger competition_entrants_guard_update
  before update on public.competition_entrants
  for each row execute function public.guard_competition_entrant_update();

revoke all on function public.guard_competition_entrant_update()
  from public, anon, authenticated;
