-- Privacy-minimized reads and writes used by district and school role consoles.

-- ---------------------------------------------------------------------------
-- 1. Staff directories never return student rows.
-- ---------------------------------------------------------------------------

create or replace function public.get_org_staff_directory(p_org_id uuid)
returns table (
  org_id uuid,
  org_name text,
  org_slug text,
  org_type text,
  profile_id uuid,
  display_name text,
  member_role text,
  member_status text,
  joined_at timestamptz,
  is_owner boolean,
  assigned_group_ids uuid[],
  assigned_group_names text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.can_administer_org(p_org_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      organization.id,
      organization.name,
      organization.slug,
      organization.type::text,
      membership.profile_id,
      profile.display_name,
      membership.role,
      membership.status,
      membership.created_at,
      organization.owner_profile_id = membership.profile_id,
      coalesce(assignments.group_ids, array[]::uuid[]),
      coalesce(assignments.group_names, array[]::text[])
    from public.organizations organization
    join public.org_memberships membership
      on membership.org_id = organization.id
    join public.profiles profile
      on profile.id = membership.profile_id
    left join lateral (
      select
        array_agg(group_row.id order by lower(group_row.name)) as group_ids,
        array_agg(group_row.name order by lower(group_row.name)) as group_names
      from public.org_group_staff_assignments assignment
      join public.org_groups group_row
        on group_row.id = assignment.group_id
      where assignment.profile_id = membership.profile_id
        and group_row.org_id = organization.id
    ) assignments on true
    where organization.id = p_org_id
      and membership.status <> 'removed'
      and membership.role <> 'student'
      and not (
        organization.type = 'school'
        and organization.parent_org_id is not null
        and exists (
          select 1
          from public.org_memberships district_membership
          where district_membership.org_id = organization.parent_org_id
            and district_membership.profile_id = membership.profile_id
            and district_membership.status = 'active'
            and district_membership.role in ('district_admin', 'admin')
        )
      )
    order by
      case when organization.owner_profile_id = membership.profile_id then 0 else 1 end,
      lower(profile.display_name);
end;
$$;

revoke all on function public.get_org_staff_directory(uuid)
  from public, anon;
grant execute on function public.get_org_staff_directory(uuid)
  to authenticated;

create or replace function public.get_district_staff_directory(
  p_district_id uuid
)
returns table (
  org_id uuid,
  org_name text,
  org_slug text,
  org_type text,
  profile_id uuid,
  display_name text,
  member_role text,
  member_status text,
  joined_at timestamptz,
  is_owner boolean,
  assigned_group_ids uuid[],
  assigned_group_names text[]
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.is_district_admin(p_district_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if not exists (
    select 1
    from public.organizations district
    where district.id = p_district_id
      and district.type = 'district'
  ) then
    raise exception 'district_not_found' using errcode = 'P0002';
  end if;

  return query
    select
      organization.id,
      organization.name,
      organization.slug,
      organization.type::text,
      membership.profile_id,
      profile.display_name,
      membership.role,
      membership.status,
      membership.created_at,
      organization.owner_profile_id = membership.profile_id,
      coalesce(assignments.group_ids, array[]::uuid[]),
      coalesce(assignments.group_names, array[]::text[])
    from public.organizations organization
    join public.org_memberships membership
      on membership.org_id = organization.id
    join public.profiles profile
      on profile.id = membership.profile_id
    left join lateral (
      select
        array_agg(group_row.id order by lower(group_row.name)) as group_ids,
        array_agg(group_row.name order by lower(group_row.name)) as group_names
      from public.org_group_staff_assignments assignment
      join public.org_groups group_row
        on group_row.id = assignment.group_id
      where assignment.profile_id = membership.profile_id
        and group_row.org_id = organization.id
    ) assignments on true
    where (
        organization.id = p_district_id
        or (
          organization.parent_org_id = p_district_id
          and organization.type = 'school'
        )
      )
      and membership.status <> 'removed'
      and membership.role <> 'student'
      and not (
        organization.type = 'school'
        and exists (
          select 1
          from public.org_memberships district_membership
          where district_membership.org_id = p_district_id
            and district_membership.profile_id = membership.profile_id
            and district_membership.status = 'active'
            and district_membership.role in ('district_admin', 'admin')
        )
      )
    order by
      case when organization.id = p_district_id then 0 else 1 end,
      lower(organization.name),
      case when organization.owner_profile_id = membership.profile_id then 0 else 1 end,
      lower(profile.display_name);
end;
$$;

revoke all on function public.get_district_staff_directory(uuid)
  from public, anon;
grant execute on function public.get_district_staff_directory(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. School administrators get a school-scoped administrative feed.
-- ---------------------------------------------------------------------------

create or replace function public.get_org_admin_activity(
  p_org_id uuid,
  p_limit integer default 50
)
returns table (
  id bigint,
  occurred_at timestamptz,
  action text,
  scope_org_id uuid,
  scope_org_name text,
  scope_org_type text,
  actor_display_name text,
  summary jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.uid() is null
     or not (
       public.can_administer_org(p_org_id, auth.uid())
       or public.is_platform_admin()
     )
     or not exists (
       select 1
       from public.organizations organization
       where organization.id = p_org_id
         and organization.type in ('school', 'club', 'team')
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      event.id,
      event.occurred_at,
      event.action,
      organization.id,
      organization.name,
      organization.type::text,
      actor.display_name,
      jsonb_strip_nulls(
        jsonb_build_object(
          'role', event.detail->>'role',
          'from_role', event.detail->>'from_role',
          'to_role', event.detail->>'to_role',
          'from', event.detail->>'from',
          'to', event.detail->>'to',
          'visibility', event.detail->>'visibility',
          'title', event.detail->>'title',
          'name', event.detail->>'name',
          'type', event.detail->>'type',
          'status', event.detail->>'status',
          'assigned_count', event.detail->>'assigned_count',
          'owner_changed', event.detail->'owner_changed',
          'parent_changed', event.detail->'parent_changed'
        )
      )
    from public.audit_events event
    join public.organizations organization
      on organization.id = p_org_id
    left join public.competitions competition
      on event.entity_type = 'competitions'
     and competition.id::text = event.entity_id
    left join public.profiles actor
      on actor.id = event.actor_id
    where event.action in (
      'organization.settings_changed',
      'organization.invitation_created',
      'organization.invitation_claimed',
      'organization.invitation_revoked',
      'organization.invitation_expired',
      'organization.announcement_published',
      'organization.admin_granted',
      'organization.admin_revoked',
      'organization.group_staff_changed',
      'competition.created',
      'competition.status_changed'
    )
      and (
        (
          event.entity_type = 'organizations'
          and event.entity_id = p_org_id::text
        )
        or (
          event.entity_type in ('org_invitations', 'org_announcements')
          and event.detail->>'org_id' = p_org_id::text
        )
        or (
          event.entity_type = 'competitions'
          and competition.org_id = p_org_id
        )
      )
    order by event.occurred_at desc, event.id desc
    limit v_limit;
end;
$$;

revoke all on function public.get_org_admin_activity(uuid, integer)
  from public, anon;
grant execute on function public.get_org_admin_activity(uuid, integer)
  to authenticated;

-- Include delegated-admin and group-assignment changes in the district feed.
create or replace function public.get_district_admin_activity(
  p_district_id uuid,
  p_limit integer default 50
)
returns table (
  id bigint,
  occurred_at timestamptz,
  action text,
  scope_org_id uuid,
  scope_org_name text,
  scope_org_type text,
  actor_display_name text,
  summary jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.uid() is null
     or not public.is_district_admin(p_district_id, auth.uid())
     or not exists (
       select 1
       from public.organizations district
       where district.id = p_district_id
         and district.type = 'district'
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  with scoped_orgs as (
    select district.id, district.name, district.type::text as org_type
    from public.organizations district
    where district.id = p_district_id
      and district.type = 'district'
    union all
    select school.id, school.name, school.type::text as org_type
    from public.organizations school
    where school.parent_org_id = p_district_id
      and school.type = 'school'
  ),
  scoped_events as (
    select
      event.id,
      event.occurred_at,
      event.action,
      event.actor_id,
      case
        when event.entity_type = 'organizations'
          and event.entity_id ~ '^[0-9a-fA-F-]{36}$'
          then event.entity_id::uuid
        when event.entity_type in ('org_invitations', 'org_announcements')
          and coalesce(event.detail->>'org_id', '') ~ '^[0-9a-fA-F-]{36}$'
          then (event.detail->>'org_id')::uuid
        when event.entity_type = 'competitions'
          then competition.org_id
        else null
      end as resolved_org_id,
      jsonb_strip_nulls(
        jsonb_build_object(
          'role', event.detail->>'role',
          'from_role', event.detail->>'from_role',
          'to_role', event.detail->>'to_role',
          'from', event.detail->>'from',
          'to', event.detail->>'to',
          'visibility', event.detail->>'visibility',
          'title', event.detail->>'title',
          'name', event.detail->>'name',
          'type', event.detail->>'type',
          'status', event.detail->>'status',
          'assigned_count', event.detail->>'assigned_count',
          'owner_changed', event.detail->'owner_changed',
          'parent_changed', event.detail->'parent_changed'
        )
      ) as summary
    from public.audit_events event
    left join public.competitions competition
      on event.entity_type = 'competitions'
     and competition.id::text = event.entity_id
    where event.action in (
      'organization.created',
      'organization.settings_changed',
      'organization.invitation_created',
      'organization.invitation_claimed',
      'organization.invitation_revoked',
      'organization.invitation_expired',
      'organization.announcement_published',
      'organization.admin_granted',
      'organization.admin_revoked',
      'organization.group_staff_changed',
      'competition.created',
      'competition.status_changed'
    )
  )
  select
    scoped.id,
    scoped.occurred_at,
    scoped.action,
    org.id,
    org.name,
    org.org_type,
    actor.display_name,
    scoped.summary
  from scoped_events scoped
  join scoped_orgs org
    on org.id = scoped.resolved_org_id
  left join public.profiles actor
    on actor.id = scoped.actor_id
  order by scoped.occurred_at desc, scoped.id desc
  limit v_limit;
end;
$$;

revoke all on function public.get_district_admin_activity(uuid, integer)
  from public, anon;
grant execute on function public.get_district_admin_activity(uuid, integer)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 3. District event operations expose school totals, never student names.
-- ---------------------------------------------------------------------------

create or replace function public.get_district_event_school_summary(
  p_competition_id uuid
)
returns table (
  school_id uuid,
  school_name text,
  active_students bigint,
  not_invited bigint,
  awaiting_reply bigint,
  going_count bigint,
  not_going_count bigint,
  attended_count bigint,
  did_not_attend_count bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  district_id uuid;
begin
  select competition.org_id
    into district_id
  from public.competitions competition
  join public.organizations district
    on district.id = competition.org_id
   and district.type = 'district'
  where competition.id = p_competition_id;

  if district_id is null
     or auth.uid() is null
     or not (
       public.is_district_admin(district_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
    select
      school.id,
      school.name,
      count(distinct membership.profile_id)
        filter (
          where membership.status = 'active'
            and membership.role = 'student'
        )::bigint,
      count(distinct membership.profile_id)
        filter (
          where membership.status = 'active'
            and membership.role = 'student'
            and entrant.profile_id is null
        )::bigint,
      count(distinct entrant.profile_id)
        filter (where entrant.status = 'invited')::bigint,
      count(distinct entrant.profile_id)
        filter (where entrant.status = 'going')::bigint,
      count(distinct entrant.profile_id)
        filter (where entrant.status = 'not_going')::bigint,
      count(distinct entrant.profile_id)
        filter (where entrant.status = 'attended')::bigint,
      count(distinct entrant.profile_id)
        filter (where entrant.status = 'did_not_attend')::bigint
    from public.organizations school
    left join public.org_memberships membership
      on membership.org_id = school.id
     and membership.status = 'active'
     and membership.role = 'student'
    left join public.competition_entrants entrant
      on entrant.competition_id = p_competition_id
     and entrant.profile_id = membership.profile_id
    where school.parent_org_id = district_id
      and school.type = 'school'
    group by school.id, school.name
    order by lower(school.name);
end;
$$;

revoke all on function public.get_district_event_school_summary(uuid)
  from public, anon;
grant execute on function public.get_district_event_school_summary(uuid)
  to authenticated;

create or replace function public.invite_connected_school_rosters(
  p_competition_id uuid
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  district_id uuid;
  competition_name text;
  competition_slug text;
  invited_count integer := 0;
  inserted record;
  guardian record;
begin
  select
    competition.org_id,
    competition.name,
    competition.slug
    into district_id, competition_name, competition_slug
  from public.competitions competition
  join public.organizations district
    on district.id = competition.org_id
   and district.type = 'district'
  where competition.id = p_competition_id
    and competition.status in ('pending_review', 'published');

  if district_id is null
     or auth.uid() is null
     or not (
       public.is_district_admin(district_id, auth.uid())
       or public.is_platform_admin()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  for inserted in
    insert into public.competition_entrants (
      competition_id,
      profile_id,
      status,
      invited_by,
      origin_org_id
    )
    select distinct on (membership.profile_id)
      p_competition_id,
      membership.profile_id,
      'invited',
      auth.uid(),
      school.id
    from public.organizations school
    join public.org_memberships membership
      on membership.org_id = school.id
     and membership.status = 'active'
     and membership.role = 'student'
    where school.parent_org_id = district_id
      and school.type = 'school'
    order by membership.profile_id, school.id
    on conflict (competition_id, profile_id) do nothing
    returning profile_id
  loop
    invited_count := invited_count + 1;

    begin
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
      select
        inserted.profile_id,
        'invitation',
        'Invitation: ' || competition_name,
        'Your district invited you. Respond going or not going on the event page.',
        '/event/' || competition_slug,
        'competition',
        p_competition_id::text,
        'invitation:' || p_competition_id::text || ':' || inserted.profile_id::text
      from public.profiles recipient
      left join public.notification_preferences preference
        on preference.profile_id = recipient.id
      where recipient.id = inserted.profile_id
        and coalesce(preference.invitation, true)
      on conflict (recipient_id, dedupe_key) where dedupe_key is not null
      do nothing;
    exception when others then
      null;
    end;

    for guardian in
      select household.parent_profile_id
      from public.household_links household
      where household.child_profile_id = inserted.profile_id
        and household.status = 'active'
    loop
      begin
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
        select
          guardian.parent_profile_id,
          'invitation',
          'District event invitation: ' || competition_name,
          'A linked student was invited. Open the family desk to answer.',
          '/family#needs-response',
          'competition',
          p_competition_id::text,
          'invitation:' || p_competition_id::text || ':'
            || inserted.profile_id::text || ':parent:'
            || guardian.parent_profile_id::text
        from public.profiles recipient
        left join public.notification_preferences preference
          on preference.profile_id = recipient.id
        where recipient.id = guardian.parent_profile_id
          and coalesce(preference.invitation, true)
        on conflict (recipient_id, dedupe_key) where dedupe_key is not null
        do nothing;
      exception when others then
        null;
      end;
    end loop;
  end loop;

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    'competition.connected_schools_invited',
    'competitions',
    p_competition_id::text,
    jsonb_build_object(
      'org_id', district_id,
      'invited_count', invited_count
    )
  );

  return invited_count;
end;
$$;

revoke all on function public.invite_connected_school_rosters(uuid)
  from public, anon;
grant execute on function public.invite_connected_school_rosters(uuid)
  to authenticated;

-- District announcements may be copied into child-school workspaces without
-- granting the district office named roster access.
create or replace function public.can_publish_org_announcement(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    public.can_administer_org(p_org_id, p_profile_id)
    or exists (
      select 1
      from public.organizations organization
      where organization.id = p_org_id
        and organization.type in ('club', 'team')
        and public.can_operate_org_competitions(
          organization.id,
          p_profile_id
        )
    );
$$;

revoke all on function public.can_publish_org_announcement(uuid, uuid)
  from public, anon;
grant execute on function public.can_publish_org_announcement(uuid, uuid)
  to authenticated;

drop policy if exists "announcements_select_member"
  on public.org_announcements;
create policy "announcements_select_scoped_member"
  on public.org_announcements for select
  to authenticated
  using (
    archived_at is null
    and (
      public.is_active_member(org_id, auth.uid())
      or public.is_parent_of_org_member(org_id, auth.uid())
      or public.is_org_staff(org_id, auth.uid())
      or public.can_publish_org_announcement(org_id, auth.uid())
      or public.is_platform_admin()
    )
  );

drop policy if exists "announcements_insert_staff"
  on public.org_announcements;
create policy "announcements_insert_scoped_staff"
  on public.org_announcements for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_publish_org_announcement(org_id, auth.uid())
  );

drop policy if exists "announcements_update_staff"
  on public.org_announcements;
create policy "announcements_update_scoped_staff"
  on public.org_announcements for update
  to authenticated
  using (public.can_publish_org_announcement(org_id, auth.uid()))
  with check (public.can_publish_org_announcement(org_id, auth.uid()));

create or replace function public.notify_org_announcement_recipients(
  p_announcement_id uuid,
  p_notify_staff boolean,
  p_notify_students boolean
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  announcement_row public.org_announcements%rowtype;
  organization_slug text;
  created_count integer := 0;
  affected_count integer;
begin
  select announcement.*
    into announcement_row
  from public.org_announcements announcement
  where announcement.id = p_announcement_id;

  if announcement_row.id is null
     or auth.uid() is null
     or announcement_row.created_by <> auth.uid()
     or not public.can_publish_org_announcement(
       announcement_row.org_id,
       auth.uid()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select organization.slug
    into organization_slug
  from public.organizations organization
  where organization.id = announcement_row.org_id;

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
  select
    membership.profile_id,
    'announcement',
    announcement_row.title,
    left(announcement_row.body, 240),
    '/orgs/' || organization_slug,
    'org_announcement',
    announcement_row.id::text,
    'announcement:' || announcement_row.id::text || ':'
      || membership.profile_id::text
  from public.org_memberships membership
  left join public.notification_preferences preference
    on preference.profile_id = membership.profile_id
  where membership.org_id = announcement_row.org_id
    and membership.status = 'active'
    and membership.profile_id <> auth.uid()
    and coalesce(preference.announcement, true)
    and (
      (membership.role = 'student' and coalesce(p_notify_students, false))
      or (
        membership.role <> 'student'
        and coalesce(p_notify_staff, false)
      )
    )
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null
  do nothing;

  get diagnostics affected_count = row_count;
  created_count := created_count + affected_count;

  if coalesce(p_notify_students, false) then
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
    select distinct
      household.parent_profile_id,
      'announcement',
      announcement_row.title,
      left(announcement_row.body, 240),
      '/family',
      'org_announcement',
      announcement_row.id::text,
      'announcement:' || announcement_row.id::text || ':parent:'
        || household.parent_profile_id::text
    from public.org_memberships membership
    join public.household_links household
      on household.child_profile_id = membership.profile_id
     and household.status = 'active'
    left join public.notification_preferences preference
      on preference.profile_id = household.parent_profile_id
    where membership.org_id = announcement_row.org_id
      and membership.status = 'active'
      and membership.role = 'student'
      and household.parent_profile_id <> auth.uid()
      and coalesce(preference.announcement, true)
    on conflict (recipient_id, dedupe_key) where dedupe_key is not null
    do nothing;

    get diagnostics affected_count = row_count;
    created_count := created_count + affected_count;
  end if;

  return created_count;
end;
$$;

revoke all on function public.notify_org_announcement_recipients(
  uuid,
  boolean,
  boolean
) from public, anon;
grant execute on function public.notify_org_announcement_recipients(
  uuid,
  boolean,
  boolean
) to authenticated;

-- The old helper returned stable student identifiers to district callers.
-- The aggregate summary and atomic invite function replace that exposure.
revoke all on function public.list_connected_school_student_ids(uuid)
  from public, anon, authenticated;
