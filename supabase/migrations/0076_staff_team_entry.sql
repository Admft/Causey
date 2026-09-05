-- Staff team-entry: coaches and school admins can mark an invited student
-- going / not going. Audited via response_source = staff + responded_by.
-- Student and linked parents get an in-app rsvp_update. Assistants stay
-- read-only (can_operate_org_competitions / can_manage_competition).

alter table public.competition_entrants
  add column if not exists response_source text;

alter table public.competition_entrants
  drop constraint if exists competition_entrants_response_source_check;
alter table public.competition_entrants
  add constraint competition_entrants_response_source_check
  check (
    response_source is null
    or response_source in ('self', 'parent', 'staff')
  );

comment on column public.competition_entrants.response_source is
  'Who recorded the going / not-going answer: the student, a linked parent, or competition staff. Null while still invited or for legacy rows.';

-- Honest backfill: only rows where the student answered themselves.
update public.competition_entrants
set response_source = 'self'
where response_source is null
  and status in ('going', 'not_going', 'attended', 'did_not_attend')
  and responded_by is not null
  and responded_by = profile_id;

revoke update on public.competition_entrants from anon, authenticated;
grant update (
  status,
  responded_by,
  responded_at,
  response_source,
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

drop trigger if exists competition_entrants_guard_update
  on public.competition_entrants;
create trigger competition_entrants_guard_update
  before update on public.competition_entrants
  for each row execute function public.guard_competition_entrant_update();

revoke all on function public.guard_competition_entrant_update()
  from public, anon, authenticated;

create or replace function public.create_in_app_notification(
  p_recipient_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  prefs public.notification_preferences%rowtype;
  allowed_by_preference boolean := true;
  authorized boolean := false;
  entity_uuid uuid;
  new_id uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_recipient_id is null
     or nullif(btrim(p_kind), '') is null
     or nullif(btrim(p_title), '') is null
     or nullif(btrim(p_body), '') is null then
    raise exception 'missing_required_notification_fields'
      using errcode = '22023';
  end if;

  if char_length(p_title) > 200
     or char_length(p_body) > 1000
     or char_length(coalesce(p_href, '')) > 500
     or char_length(coalesce(p_entity_type, '')) > 80
     or char_length(coalesce(p_entity_id, '')) > 120
     or char_length(coalesce(p_dedupe_key, '')) > 240 then
    raise exception 'notification_field_too_long' using errcode = '22001';
  end if;

  if p_href is not null and (
    left(p_href, 1) <> '/'
    or left(p_href, 2) = '//'
    or position(chr(92) in p_href) > 0
    or p_href ~ '[[:space:][:cntrl:]]'
  ) then
    raise exception 'external_notification_href_not_allowed'
      using errcode = '22023';
  end if;

  if p_kind = 'account' then
    authorized :=
      p_recipient_id = actor
      and p_entity_type = 'account'
      and p_entity_id in (
        'password_updated',
        'email_change_pending',
        'password_reset_requested'
      )
      and p_href = '/account#signin'
      and p_dedupe_key like case p_entity_id
        when 'password_updated' then 'account:password-updated:%'
        when 'email_change_pending' then 'account:email-change:%'
        when 'password_reset_requested' then 'account:password-reset:%'
      end;

  elsif p_kind in ('invitation', 'rsvp_update') then
    if coalesce(p_entity_id, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
      raise exception 'invalid_notification_entity' using errcode = '22023';
    end if;
    entity_uuid := p_entity_id::uuid;

    if p_kind = 'invitation' then
      select exists (
        select 1
        from public.competition_entrants entrant
        join public.competitions competition
          on competition.id = entrant.competition_id
        where entrant.competition_id = entity_uuid
          and entrant.profile_id = p_recipient_id
          and entrant.invited_by = actor
          and p_entity_type = 'competition'
          and p_href = '/event/' || competition.slug
          and p_dedupe_key =
            'invitation:' || entity_uuid::text || ':' || p_recipient_id::text
      ) into authorized;
      if authorized is not true then
        select exists (
          select 1
          from public.competition_entrants entrant
          join public.household_links household
            on household.child_profile_id = entrant.profile_id
           and household.parent_profile_id = p_recipient_id
           and household.status = 'active'
          where entrant.competition_id = entity_uuid
            and entrant.invited_by = actor
            and p_entity_type = 'competition'
            and p_href = '/family#needs-response'
            and p_dedupe_key =
              'invitation:' || entity_uuid::text || ':'
              || entrant.profile_id::text || ':parent:' || p_recipient_id::text
        ) into authorized;
      end if;
    else
      select exists (
        select 1
        from public.competition_entrants entrant
        join public.competitions competition
          on competition.id = entrant.competition_id
        where entrant.competition_id = entity_uuid
          and entrant.invited_by = p_recipient_id
          and entrant.responded_by = actor
          and entrant.status in ('going', 'not_going')
          and p_entity_type = 'competition'
          and p_href in ('/event/' || competition.slug || '/manage', '/orgs')
          and p_dedupe_key =
            'rsvp:' || entity_uuid::text || ':' || entrant.profile_id::text
            || ':' || entrant.status
      ) into authorized;
      -- Staff team-entry: notify the student that a coach marked going / not going.
      if authorized is not true then
        select exists (
          select 1
          from public.competition_entrants entrant
          join public.competitions competition
            on competition.id = entrant.competition_id
          where entrant.competition_id = entity_uuid
            and entrant.profile_id = p_recipient_id
            and entrant.responded_by = actor
            and entrant.response_source = 'staff'
            and entrant.status in ('going', 'not_going')
            and (
              public.can_manage_competition(entity_uuid, actor)
              or public.can_invite_to_competition(
                entity_uuid,
                entrant.profile_id,
                actor
              )
            )
            and p_entity_type = 'competition'
            and p_href = '/event/' || competition.slug
            and p_dedupe_key =
              'staff-rsvp:' || entity_uuid::text || ':'
              || p_recipient_id::text || ':' || entrant.status
        ) into authorized;
      end if;
      -- Staff team-entry: notify linked parents on the family desk.
      if authorized is not true then
        select exists (
          select 1
          from public.competition_entrants entrant
          join public.household_links household
            on household.child_profile_id = entrant.profile_id
           and household.parent_profile_id = p_recipient_id
           and household.status = 'active'
          where entrant.competition_id = entity_uuid
            and entrant.responded_by = actor
            and entrant.response_source = 'staff'
            and entrant.status in ('going', 'not_going')
            and (
              public.can_manage_competition(entity_uuid, actor)
              or public.can_invite_to_competition(
                entity_uuid,
                entrant.profile_id,
                actor
              )
            )
            and p_entity_type = 'competition'
            and p_href = '/family'
            and p_dedupe_key =
              'staff-rsvp:' || entity_uuid::text || ':'
              || entrant.profile_id::text || ':parent:' || p_recipient_id::text
              || ':' || entrant.status
        ) into authorized;
      end if;
    end if;

  elsif p_kind = 'announcement' then
    if coalesce(p_entity_id, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
      raise exception 'invalid_notification_entity' using errcode = '22023';
    end if;
    entity_uuid := p_entity_id::uuid;

    select exists (
      select 1
      from public.org_announcements announcement
      join public.organizations organization
        on organization.id = announcement.org_id
      join public.org_memberships membership
        on membership.org_id = announcement.org_id
       and membership.profile_id = p_recipient_id
       and membership.status = 'active'
      where announcement.id = entity_uuid
        and announcement.created_by = actor
        and public.can_operate_org_competitions(
          announcement.org_id,
          actor
        )
        and p_entity_type = 'org_announcement'
        and p_href = '/orgs/' || organization.slug
        and p_dedupe_key =
          'announcement:' || entity_uuid::text || ':' || p_recipient_id::text
    ) into authorized;
    if authorized is not true then
      select exists (
        select 1
        from public.org_announcements announcement
        join public.org_memberships membership
          on membership.org_id = announcement.org_id
         and membership.status = 'active'
        join public.household_links household
          on household.child_profile_id = membership.profile_id
         and household.parent_profile_id = p_recipient_id
         and household.status = 'active'
        where announcement.id = entity_uuid
          and announcement.created_by = actor
          and public.can_operate_org_competitions(
            announcement.org_id,
            actor
          )
          and p_entity_type = 'org_announcement'
          and p_href = '/family'
          and p_dedupe_key =
            'announcement:' || entity_uuid::text || ':parent:'
            || p_recipient_id::text
      ) into authorized;
    end if;

  elsif p_kind = 'result' then
    if coalesce(p_entity_id, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
      raise exception 'invalid_notification_entity' using errcode = '22023';
    end if;
    entity_uuid := p_entity_id::uuid;

    select exists (
      select 1
      from public.competition_entrants entrant
      join public.competitions competition
        on competition.id = entrant.competition_id
      where entrant.competition_id = entity_uuid
        and entrant.profile_id = p_recipient_id
        and entrant.result_marked_by = actor
        and (
          public.can_manage_competition(entity_uuid, actor)
          or public.can_invite_to_competition(
            entity_uuid,
            entrant.profile_id,
            actor
          )
        )
        and p_entity_type = 'competition'
        and p_href = '/event/' || competition.slug
        and p_dedupe_key =
          'result:' || entity_uuid::text || ':' || p_recipient_id::text
    ) into authorized;
    if authorized is not true then
      select exists (
        select 1
        from public.competition_entrants entrant
        join public.household_links household
          on household.child_profile_id = entrant.profile_id
         and household.parent_profile_id = p_recipient_id
         and household.status = 'active'
        where entrant.competition_id = entity_uuid
          and entrant.result_marked_by = actor
          and (
            public.can_manage_competition(entity_uuid, actor)
            or public.can_invite_to_competition(
              entity_uuid,
              entrant.profile_id,
              actor
            )
          )
          and p_entity_type = 'competition'
          and p_href = '/family'
          and p_dedupe_key =
            'result:' || entity_uuid::text || ':'
            || entrant.profile_id::text || ':parent:' || p_recipient_id::text
      ) into authorized;
    end if;
  end if;

  if authorized is not true then
    raise exception 'notification_recipient_not_authorized'
      using errcode = '42501';
  end if;

  select *
    into prefs
  from public.notification_preferences
  where profile_id = p_recipient_id;

  if found then
    case p_kind
      when 'invitation' then
        allowed_by_preference := prefs.invitation;
      when 'rsvp_update' then
        allowed_by_preference := prefs.rsvp_update;
      when 'announcement' then
        allowed_by_preference := prefs.announcement;
      when 'result' then
        allowed_by_preference := prefs.result;
      when 'account' then
        allowed_by_preference := true;
    end case;
  end if;

  if not allowed_by_preference then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    kind,
    title,
    body,
    href,
    entity_type,
    entity_id,
    dedupe_key
  )
  values (
    p_recipient_id,
    p_kind,
    p_title,
    p_body,
    p_href,
    p_entity_type,
    p_entity_id,
    p_dedupe_key
  )
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null
  do nothing
  returning id into new_id;

  return new_id;
end;
$$;


comment on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) is
  'Creates local-link notifications only for an authenticated account, entrant, RSVP (including staff team-entry), announcement, result, or linked-parent relationship.';

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
  award_label text,
  origin_org_id uuid,
  origin_org_name text,
  response_source text
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
      origin_org.name,
      entrant.response_source
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
