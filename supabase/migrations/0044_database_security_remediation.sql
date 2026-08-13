-- Database/security remediation wave.
-- This migration intentionally replaces effective definitions from earlier
-- migrations instead of rewriting migration history.

-- ---------------------------------------------------------------------------
-- 1. Join-code reactivation is always student-level after removal.
-- ---------------------------------------------------------------------------
create or replace function public.join_org_with_code(p_code text)
returns table (org_id uuid, org_slug text, org_name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  normalized text := upper(
    regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')
  );
  target record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  perform pg_sleep(0.15);

  select o.id, o.slug, o.name
    into target
  from public.organizations o
  where o.join_code = normalized
    and o.type <> 'district';

  if target is null then
    raise exception 'invalid_code';
  end if;

  insert into public.org_memberships as membership (
    org_id,
    profile_id,
    role,
    status
  )
  values (target.id, auth.uid(), 'student', 'active')
  on conflict (org_id, profile_id) do update
    set status = 'active',
        role = case
          when membership.status = 'removed' then 'student'
          else membership.role
        end;

  return query select target.id, target.slug, target.name;
end;
$$;

revoke all on function public.join_org_with_code(text) from public, anon;
grant execute on function public.join_org_with_code(text) to authenticated;

comment on function public.join_org_with_code(text) is
  'Reactivates removed join-code memberships as students; active staff keep their role.';

-- ---------------------------------------------------------------------------
-- 2. Notification creation is relationship-aware and accepts local hrefs only.
--    Trigger/service notification fanout writes notifications directly and is
--    unaffected. The authenticated RPC supports the four current app flows.
-- ---------------------------------------------------------------------------
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

  -- A notification link must be an app-local absolute path. In particular,
  -- reject protocol-relative paths, backslashes, whitespace, and controls.
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

revoke all on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) from public, anon;
grant execute on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) to authenticated;

comment on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) is
  'Creates local-link notifications only for an authenticated account, entrant, RSVP, or announcement relationship.';

-- ---------------------------------------------------------------------------
-- 3. Ownership transfer is guarded below RLS.
-- ---------------------------------------------------------------------------
create or replace function public.guard_organization_owner_transfer()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  eligible boolean := false;
begin
  if new.owner_profile_id is not distinct from old.owner_profile_id then
    return new;
  end if;

  if actor is null
     or (
       actor is distinct from old.owner_profile_id
       and not public.is_platform_admin()
     ) then
    raise exception 'organization_owner_transfer_not_authorized'
      using errcode = '42501';
  end if;

  select exists (
    select 1
    from public.org_memberships membership
    where membership.org_id = old.id
      and membership.profile_id = new.owner_profile_id
      and membership.status = 'active'
      and membership.role in (
        'coach',
        'admin',
        'school_admin',
        'district_admin'
      )
  ) into eligible;

  if not eligible then
    raise exception 'organization_owner_must_be_active_staff'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_guard_owner_transfer
  on public.organizations;
create trigger organizations_guard_owner_transfer
  before update of owner_profile_id on public.organizations
  for each row execute function public.guard_organization_owner_transfer();

revoke all on function public.guard_organization_owner_transfer()
  from public, anon, authenticated;

create or replace function public.guard_organization_identity_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.id is distinct from old.id
     or new.created_by is distinct from old.created_by then
    raise exception 'organization_identity_fields_locked'
      using errcode = '42501';
  end if;

  -- Browser callers rotate join codes through the authorization-aware RPC.
  -- Its SECURITY DEFINER owner, migrations, and service operations retain the
  -- ability to write these columns.
  if (
      new.join_code is distinct from old.join_code
      or new.join_code_rotated_at is distinct from old.join_code_rotated_at
    )
    and current_user not in (
      'postgres',
      'supabase_admin',
      'service_role'
    ) then
    raise exception 'organization_join_code_fields_locked'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists organizations_guard_identity_fields
  on public.organizations;
create trigger organizations_guard_identity_fields
  before update of id, created_by, join_code, join_code_rotated_at
  on public.organizations
  for each row execute function public.guard_organization_identity_fields();

revoke all on function public.guard_organization_identity_fields()
  from public, anon, authenticated;

-- WITH CHECK cannot safely re-evaluate old-owner authority after a successful
-- owner handoff because the new row no longer names the caller. The USING arm
-- scopes the old row; field-specific triggers protect every governed column.
drop policy if exists "orgs_update_coach" on public.organizations;
drop policy if exists "orgs_update_operator" on public.organizations;
create policy "orgs_update_operator"
  on public.organizations for update
  to authenticated
  using (
    public.is_org_coach(id, auth.uid())
    or public.can_administer_org(id, auth.uid())
    or public.is_platform_admin()
  )
  with check (true);

-- ---------------------------------------------------------------------------
-- 4. Every organizer-created public event enters moderation, including
--    standalone events. Self-serve coaches may still create private/draft
--    records and submit public records for review.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_public_event_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'organizer'
     and coalesce(new.audience, 'public') = 'public'
     and new.status = 'published'
     and not public.is_platform_admin() then
    new.status := 'pending_review';
    new.submitted_for_review_at :=
      coalesce(new.submitted_for_review_at, now());
    new.reviewed_at := null;
    new.reviewed_by := null;
  end if;
  return new;
end;
$$;

drop trigger if exists competitions_public_moderation
  on public.competitions;
create trigger competitions_public_moderation
  before insert or update of status, audience on public.competitions
  for each row execute function public.enforce_public_event_moderation();

revoke all on function public.enforce_public_event_moderation()
  from public, anon, authenticated;

create or replace function public.guard_competition_moderation_fields()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if public.is_platform_admin() then
    return new;
  end if;

  if new.submitted_for_review_at is distinct from old.submitted_for_review_at
     or new.reviewed_at is distinct from old.reviewed_at
     or new.reviewed_by is distinct from old.reviewed_by
     or new.moderation_note is distinct from old.moderation_note then
    -- The organizer edit flow may clear a prior review while resubmitting a
    -- rejected record. The moderation trigger that runs after this guard
    -- converts the requested published state back to pending_review.
    if not (
      old.status = 'rejected'
      and new.status = 'published'
      and new.submitted_for_review_at is not null
      and new.reviewed_at is null
      and new.reviewed_by is null
      and new.moderation_note is not distinct from old.moderation_note
    ) then
      raise exception 'competition_moderation_fields_locked'
        using errcode = '42501';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists competitions_guard_moderation_fields
  on public.competitions;
create trigger competitions_guard_moderation_fields
  before update of
    status,
    submitted_for_review_at,
    reviewed_at,
    reviewed_by,
    moderation_note
  on public.competitions
  for each row execute function public.guard_competition_moderation_fields();

revoke all on function public.guard_competition_moderation_fields()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 5. Align organization operations with effective district-aware authority.
-- ---------------------------------------------------------------------------
drop policy if exists "groups_select_member" on public.org_groups;
create policy "groups_select_member"
  on public.org_groups for select
  to authenticated
  using (
    public.is_active_member(org_id, auth.uid())
    or public.is_org_staff(org_id, auth.uid())
    or public.can_administer_org(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "groups_insert_coach" on public.org_groups;
create policy "groups_insert_coach"
  on public.org_groups for insert
  to authenticated
  with check (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "groups_update_coach" on public.org_groups;
create policy "groups_update_coach"
  on public.org_groups for update
  to authenticated
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  )
  with check (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "groups_delete_coach" on public.org_groups;
create policy "groups_delete_coach"
  on public.org_groups for delete
  to authenticated
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "group_members_select_member"
  on public.org_group_members;
create policy "group_members_select_member"
  on public.org_group_members for select
  to authenticated
  using (
    exists (
      select 1
      from public.org_groups group_row
      where group_row.id = org_group_members.group_id
        and (
          public.is_org_staff(group_row.org_id, auth.uid())
          or public.can_administer_org(group_row.org_id, auth.uid())
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "group_members_insert_coach"
  on public.org_group_members;
create policy "group_members_insert_coach"
  on public.org_group_members for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.org_groups group_row
      where group_row.id = org_group_members.group_id
        and (
          public.can_operate_org_competitions(
            group_row.org_id,
            auth.uid()
          )
          or public.is_platform_admin()
        )
        and public.is_active_member(
          group_row.org_id,
          org_group_members.profile_id
        )
    )
  );

drop policy if exists "group_members_delete_coach"
  on public.org_group_members;
create policy "group_members_delete_coach"
  on public.org_group_members for delete
  to authenticated
  using (
    exists (
      select 1
      from public.org_groups group_row
      where group_row.id = org_group_members.group_id
        and (
          public.can_operate_org_competitions(
            group_row.org_id,
            auth.uid()
          )
          or public.is_platform_admin()
        )
    )
  );

-- Replace a group's complete membership in one transaction. The function
-- validates the caller and every requested profile before deleting any rows.
create or replace function public.set_group_members(
  p_group_id uuid,
  p_profile_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  target_org_id uuid;
  requested_ids uuid[] := coalesce(p_profile_ids, array[]::uuid[]);
  requested_count integer;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select group_row.org_id
    into target_org_id
  from public.org_groups group_row
  where group_row.id = p_group_id;

  if target_org_id is null then
    raise exception 'group_not_found' using errcode = 'P0002';
  end if;

  if not (
    public.can_operate_org_competitions(target_org_id, auth.uid())
    or public.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(distinct profile_id)
    into requested_count
  from unnest(requested_ids) as requested(profile_id);

  if requested_count <> cardinality(requested_ids) then
    raise exception 'duplicate_group_members' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(requested_ids) as requested(profile_id)
    where not public.is_active_member(target_org_id, requested.profile_id)
  ) then
    raise exception 'group_member_not_active' using errcode = '22023';
  end if;

  delete from public.org_group_members
  where group_id = p_group_id;

  insert into public.org_group_members (group_id, profile_id)
  select p_group_id, requested.profile_id
  from unnest(requested_ids) as requested(profile_id);

  return requested_count;
end;
$$;

revoke all on function public.set_group_members(uuid, uuid[])
  from public, anon;
grant execute on function public.set_group_members(uuid, uuid[])
  to authenticated;

drop policy if exists "attendance_select_member"
  on public.org_competition_attendance;
create policy "attendance_select_member"
  on public.org_competition_attendance for select
  to authenticated
  using (
    public.is_active_member(org_id, auth.uid())
    or public.is_parent_of_org_member(org_id, auth.uid())
    or public.is_org_staff(org_id, auth.uid())
    or public.can_administer_org(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "attendance_insert_coach"
  on public.org_competition_attendance;
create policy "attendance_insert_coach"
  on public.org_competition_attendance for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and (
      public.can_operate_org_competitions(org_id, auth.uid())
      or public.is_platform_admin()
    )
    and exists (
      select 1
      from public.competitions competition
      where competition.id =
        org_competition_attendance.competition_id
        and competition.status = 'published'
    )
  );

drop policy if exists "attendance_delete_coach"
  on public.org_competition_attendance;
create policy "attendance_delete_coach"
  on public.org_competition_attendance for delete
  to authenticated
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

create or replace function public.can_invite_to_competition(
  p_competition_id uuid,
  p_entrant_id uuid,
  p_inviter_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select p_inviter_id = auth.uid()
  and exists (
    select 1
    from public.organizations organization
    where (
        public.can_operate_org_competitions(
          organization.id,
          p_inviter_id
        )
        or public.is_platform_admin()
      )
      and public.is_active_member(
        organization.id,
        p_entrant_id
      )
      and (
        exists (
          select 1
          from public.competitions competition
          where competition.id = p_competition_id
            and competition.org_id = organization.id
        )
        or exists (
          select 1
          from public.org_competition_attendance attendance
          where attendance.org_id = organization.id
            and attendance.competition_id = p_competition_id
        )
      )
  );
$$;

revoke all on function public.can_invite_to_competition(
  uuid, uuid, uuid
) from public, anon;
grant execute on function public.can_invite_to_competition(
  uuid, uuid, uuid
) to authenticated;

create or replace function public.get_event_attendance(
  p_competition_id uuid
)
returns table (
  profile_id uuid,
  display_name text,
  status text,
  responded_at timestamptz,
  member_status text
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
      ) then 'active' else 'removed' end
    from public.competition_entrants entrant
    join public.profiles profile
      on profile.id = entrant.profile_id
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

create or replace function public.get_org_roster(p_org_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  age_band text,
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

create or replace function public.rotate_join_code(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  code text;
begin
  if auth.uid() is null
     or not (
       public.can_administer_org(p_org_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  loop
    code := public.generate_join_code();
    exit when not exists (
      select 1
      from public.organizations organization
      where organization.join_code = code
    );
  end loop;

  update public.organizations
  set join_code = code,
      join_code_rotated_at = now(),
      updated_at = now()
  where id = p_org_id;

  return code;
end;
$$;

revoke all on function public.rotate_join_code(uuid) from public, anon;
grant execute on function public.rotate_join_code(uuid) to authenticated;

drop policy if exists "memberships_select_own_or_member"
  on public.org_memberships;
drop policy if exists "memberships_select_own_or_staff"
  on public.org_memberships;
create policy "memberships_select_own_or_staff"
  on public.org_memberships for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.is_org_staff(org_id, auth.uid())
    or public.can_administer_org(org_id, auth.uid())
    or public.is_platform_admin()
  );

-- Older names may exist on partially applied databases.
drop policy if exists "memberships_select_own_org"
  on public.org_memberships;

drop policy if exists "memberships_insert_coach"
  on public.org_memberships;
drop policy if exists "memberships_insert_operator"
  on public.org_memberships;
create policy "memberships_insert_operator"
  on public.org_memberships for insert
  to authenticated
  with check (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "memberships_update_self_or_coach"
  on public.org_memberships;
drop policy if exists "memberships_update_self_or_operator"
  on public.org_memberships;
create policy "memberships_update_self_or_operator"
  on public.org_memberships for update
  to authenticated
  using (
    (profile_id = auth.uid() and status <> 'removed')
    or public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  )
  with check (
    profile_id = auth.uid()
    or public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "memberships_delete_coach"
  on public.org_memberships;
drop policy if exists "memberships_delete_operator"
  on public.org_memberships;
create policy "memberships_delete_operator"
  on public.org_memberships for delete
  to authenticated
  using (
    public.can_operate_org_competitions(org_id, auth.uid())
    or public.is_platform_admin()
  );

-- ---------------------------------------------------------------------------
-- 6. Managers may mark attendance without taking ownership of a student's or
--    parent's RSVP. A trigger compares OLD/NEW, which RLS alone cannot do.
-- ---------------------------------------------------------------------------
create or replace function public.guard_competition_entrant_update()
returns trigger
language plpgsql
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  self_or_parent boolean;
  manager boolean;
  response_changed boolean;
  attendance_changed boolean;
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

  if new.status is distinct from old.status then
    if new.status in ('going', 'not_going') then
      if not self_or_parent
         or old.status in ('attended', 'did_not_attend')
         or new.responded_by is distinct from actor
         or new.responded_at is null
         or attendance_changed then
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

drop policy if exists "entrants_select_self_parent_manager"
  on public.competition_entrants;
create policy "entrants_select_self_parent_manager"
  on public.competition_entrants for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

drop policy if exists "entrants_insert_manager"
  on public.competition_entrants;
create policy "entrants_insert_manager"
  on public.competition_entrants for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and public.can_invite_to_competition(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

drop policy if exists "entrants_update_self_parent_manager"
  on public.competition_entrants;
create policy "entrants_update_self_parent_manager"
  on public.competition_entrants for update
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(
      competition_id,
      profile_id,
      auth.uid()
    )
  )
  with check (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

drop policy if exists "entrants_delete_manager"
  on public.competition_entrants;
create policy "entrants_delete_manager"
  on public.competition_entrants for delete
  to authenticated
  using (
    public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

revoke update on public.competition_entrants from anon, authenticated;
grant update (
  status,
  responded_by,
  responded_at,
  attendance_marked_by,
  attendance_marked_at
) on public.competition_entrants to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Refresh the organizer/admin competition UPDATE column allowlist.
--    RLS and moderation/governance triggers still decide which rows/values.
-- ---------------------------------------------------------------------------
revoke update on public.competitions from anon, authenticated;
grant update (
  slug,
  name,
  category,
  custom_category_name,
  participation_mode,
  organizer_name,
  venue_name,
  address,
  city,
  state,
  zip,
  lat,
  lng,
  start_date,
  end_date,
  reg_deadline,
  reg_url,
  entry_fee_cents,
  rated,
  rating_system,
  series_id,
  status,
  image_url,
  visibility,
  audience,
  org_id,
  details,
  submitted_for_review_at,
  reviewed_at,
  reviewed_by,
  moderation_note
) on public.competitions to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Tournament covers must follow org/draft/file and target a real draft.
--    Delete remains draft-independent because the app deletes the draft row
--    before removing its object.
-- ---------------------------------------------------------------------------
alter table public.tournament_drafts
  drop constraint if exists tournament_drafts_cover_path_check;
alter table public.tournament_drafts
  add constraint tournament_drafts_cover_path_check
  check (
    cover_image_path is null
    or cover_image_path ~ (
      '^' || org_id::text || '/' || id::text || '/[^/]+$'
    )
  ) not valid;

create or replace function public.can_manage_tournament_cover_path(
  p_name text,
  p_profile_id uuid,
  p_require_draft boolean default true
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  org_id_from_path uuid;
  draft_id_from_path uuid;
begin
  if auth.uid() is null
     or p_profile_id is distinct from auth.uid()
     or coalesce(p_name, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/[^/]+$' then
    return false;
  end if;

  org_id_from_path := split_part(p_name, '/', 1)::uuid;
  draft_id_from_path := split_part(p_name, '/', 2)::uuid;

  if not (
    public.can_operate_org_competitions(
      org_id_from_path,
      p_profile_id
    )
    or public.is_platform_admin()
  ) then
    return false;
  end if;

  if not p_require_draft then
    return true;
  end if;

  return exists (
    select 1
    from public.tournament_drafts draft
    where draft.id = draft_id_from_path
      and draft.org_id = org_id_from_path
  );
end;
$$;

revoke all on function public.can_manage_tournament_cover_path(
  text, uuid, boolean
) from public, anon;
grant execute on function public.can_manage_tournament_cover_path(
  text, uuid, boolean
) to authenticated;

drop policy if exists "tournament_covers_insert_coach"
  on storage.objects;
create policy "tournament_covers_insert_coach"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'tournament-covers'
    and public.can_manage_tournament_cover_path(
      name,
      auth.uid(),
      true
    )
  );

drop policy if exists "tournament_covers_update_coach"
  on storage.objects;
create policy "tournament_covers_update_coach"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'tournament-covers'
    and public.can_manage_tournament_cover_path(
      name,
      auth.uid(),
      true
    )
  )
  with check (
    bucket_id = 'tournament-covers'
    and public.can_manage_tournament_cover_path(
      name,
      auth.uid(),
      true
    )
  );

drop policy if exists "tournament_covers_delete_coach"
  on storage.objects;
create policy "tournament_covers_delete_coach"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'tournament-covers'
    and public.can_manage_tournament_cover_path(
      name,
      auth.uid(),
      false
    )
  );

-- ---------------------------------------------------------------------------
-- 9. Replace ingestion-owned sections atomically through a service-only RPC.
-- ---------------------------------------------------------------------------
create or replace function public.ingestion_replace_competition_sections(
  p_competition_id uuid,
  p_sections jsonb
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.role() <> 'service_role' then
    raise exception 'service_role_required' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.competitions
    where id = p_competition_id
  ) then
    raise exception 'competition_not_found' using errcode = 'P0002';
  end if;

  if jsonb_typeof(p_sections) <> 'array'
     or jsonb_array_length(p_sections) < 1
     or jsonb_array_length(p_sections) > 20 then
    raise exception 'one_to_twenty_sections_required'
      using errcode = '22023';
  end if;

  if exists (
    select 1
    from jsonb_to_recordset(p_sections) as section(name text)
    where nullif(btrim(section.name), '') is null
  ) then
    raise exception 'section_name_required' using errcode = '22023';
  end if;

  delete from public.sections
  where competition_id = p_competition_id;

  insert into public.sections (
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
    btrim(section.name),
    section.min_rating,
    section.max_rating,
    section.min_grade,
    section.max_grade,
    section.entry_fee_cents
  from jsonb_to_recordset(p_sections) as section(
    name text,
    min_rating integer,
    max_rating integer,
    min_grade integer,
    max_grade integer,
    entry_fee_cents integer
  );
end;
$$;

revoke all on function public.ingestion_replace_competition_sections(uuid, jsonb)
  from public, anon, authenticated;
grant execute on function public.ingestion_replace_competition_sections(uuid, jsonb)
  to service_role;

-- ---------------------------------------------------------------------------
-- 10. Reclaim stale email leases. A reclaimed row consumes another attempt so
--    poison jobs still stop after the existing four-attempt cap.
-- ---------------------------------------------------------------------------
drop index if exists public.email_outbox_pending_send_idx;
create index email_outbox_pending_send_idx
  on public.email_outbox (send_after, created_at)
  where status in ('pending', 'failed', 'sending');

create or replace function public.claim_email_outbox_batch(
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

revoke all on function public.claim_email_outbox_batch(integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_outbox_batch(integer)
  to service_role;

comment on function public.claim_email_outbox_batch(integer) is
  'Service-role only claim; safely retries sending leases stale for 15 minutes.';
