-- District/school authority boundaries.
--
-- District administrators keep school provisioning and staff authority, but
-- student names stay inside each school. School coaches and assistants only
-- see groups assigned to them; assistants remain read-only. Club/team behavior
-- is intentionally unchanged.

-- ---------------------------------------------------------------------------
-- 1. Assign school coaches and assistants to explicit groups.
-- ---------------------------------------------------------------------------

create table if not exists public.org_group_staff_assignments (
  group_id uuid not null references public.org_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create index if not exists org_group_staff_profile_idx
  on public.org_group_staff_assignments (profile_id, group_id);

alter table public.org_group_staff_assignments enable row level security;
revoke all on public.org_group_staff_assignments from anon;
grant select on public.org_group_staff_assignments to authenticated;

comment on table public.org_group_staff_assignments is
  'School-admin managed coach/assistant assignments. A school coach or assistant may only see students in assigned groups.';

-- A district operator acting through a child school must never inherit named
-- student access merely because can_administer_org() is true.
create or replace function public.is_district_operator_for_school(
  p_school_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations school
    where school.id = p_school_id
      and school.type = 'school'
      and school.parent_org_id is not null
      and public.is_district_admin(school.parent_org_id, p_profile_id)
  );
$$;

revoke all on function public.is_district_operator_for_school(uuid, uuid)
  from public, anon;
grant execute on function public.is_district_operator_for_school(uuid, uuid)
  to authenticated;

create or replace function public.is_local_school_admin(
  p_school_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations school
    where school.id = p_school_id
      and school.type = 'school'
      and not public.is_district_operator_for_school(
        school.id,
        p_profile_id
      )
      and (
        school.owner_profile_id = p_profile_id
        or exists (
          select 1
          from public.org_memberships membership
          where membership.org_id = school.id
            and membership.profile_id = p_profile_id
            and membership.status = 'active'
            and membership.role in ('school_admin', 'admin')
        )
      )
  );
$$;

revoke all on function public.is_local_school_admin(uuid, uuid)
  from public, anon;
grant execute on function public.is_local_school_admin(uuid, uuid)
  to authenticated;

create or replace function public.is_assigned_group_staff(
  p_group_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_group_staff_assignments assignment
    join public.org_groups group_row
      on group_row.id = assignment.group_id
    join public.org_memberships membership
      on membership.org_id = group_row.org_id
     and membership.profile_id = assignment.profile_id
     and membership.status = 'active'
     and membership.role in ('coach', 'assistant_coach')
    where assignment.group_id = p_group_id
      and assignment.profile_id = p_profile_id
  );
$$;

revoke all on function public.is_assigned_group_staff(uuid, uuid)
  from public, anon;
grant execute on function public.is_assigned_group_staff(uuid, uuid)
  to authenticated;

create or replace function public.can_view_org_student(
  p_org_id uuid,
  p_student_id uuid,
  p_viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_viewer_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.organizations organization
      where organization.id = p_org_id
        and exists (
          select 1
          from public.org_memberships student_membership
          where student_membership.org_id = organization.id
            and student_membership.profile_id = p_student_id
            and student_membership.status = 'active'
            and student_membership.role = 'student'
        )
        and (
          (
            organization.type = 'school'
            and (
              public.is_local_school_admin(organization.id, p_viewer_id)
              or exists (
                select 1
                from public.org_group_staff_assignments assignment
                join public.org_group_members group_member
                  on group_member.group_id = assignment.group_id
                join public.org_groups group_row
                  on group_row.id = assignment.group_id
                 and group_row.org_id = organization.id
                join public.org_memberships staff_membership
                  on staff_membership.org_id = organization.id
                 and staff_membership.profile_id = assignment.profile_id
                 and staff_membership.status = 'active'
                 and staff_membership.role in ('coach', 'assistant_coach')
                where assignment.profile_id = p_viewer_id
                  and group_member.profile_id = p_student_id
              )
            )
          )
          or (
            organization.type in ('club', 'team')
            and public.is_org_staff(organization.id, p_viewer_id)
          )
        )
    );
$$;

revoke all on function public.can_view_org_student(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_view_org_student(uuid, uuid, uuid)
  to authenticated;

create or replace function public.can_operate_org_student(
  p_org_id uuid,
  p_student_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_actor_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.organizations organization
      where organization.id = p_org_id
        and exists (
          select 1
          from public.org_memberships student_membership
          where student_membership.org_id = organization.id
            and student_membership.profile_id = p_student_id
            and student_membership.status = 'active'
            and student_membership.role = 'student'
        )
        and (
          (
            organization.type = 'school'
            and (
              public.is_local_school_admin(organization.id, p_actor_id)
              or (
                exists (
                  select 1
                  from public.org_memberships staff_membership
                  where staff_membership.org_id = organization.id
                    and staff_membership.profile_id = p_actor_id
                    and staff_membership.status = 'active'
                    and staff_membership.role = 'coach'
                )
                and exists (
                  select 1
                  from public.org_group_staff_assignments assignment
                  join public.org_group_members group_member
                    on group_member.group_id = assignment.group_id
                  join public.org_groups group_row
                    on group_row.id = assignment.group_id
                   and group_row.org_id = organization.id
                  where assignment.profile_id = p_actor_id
                    and group_member.profile_id = p_student_id
                )
              )
            )
          )
          or (
            organization.type in ('club', 'team')
            and public.can_operate_org_competitions(
              organization.id,
              p_actor_id
            )
          )
        )
    );
$$;

revoke all on function public.can_operate_org_student(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_operate_org_student(uuid, uuid, uuid)
  to authenticated;

create or replace function public.can_view_named_org_roster(
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
    (
      p_profile_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.organizations organization
      where organization.id = p_org_id
        and (
          (
            organization.type = 'school'
            and not public.is_district_operator_for_school(
              organization.id,
              p_profile_id
            )
            and (
              public.is_local_school_admin(organization.id, p_profile_id)
              or exists (
                select 1
                from public.org_group_staff_assignments assignment
                join public.org_groups group_row
                  on group_row.id = assignment.group_id
                 and group_row.org_id = organization.id
                where assignment.profile_id = p_profile_id
              )
            )
          )
          or (
            organization.type in ('club', 'team')
            and public.is_org_staff(organization.id, p_profile_id)
          )
          or (
            organization.type = 'district'
            and public.is_org_staff(organization.id, p_profile_id)
          )
        )
    );
$$;

revoke all on function public.can_view_named_org_roster(uuid, uuid)
  from public, anon;
grant execute on function public.can_view_named_org_roster(uuid, uuid)
  to authenticated;

create or replace function public.can_manage_org_groups(
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
    (
      p_profile_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.organizations organization
      where organization.id = p_org_id
        and (
          (
            organization.type = 'school'
            and public.is_local_school_admin(organization.id, p_profile_id)
          )
          or (
            organization.type in ('club', 'team')
            and public.can_operate_org_competitions(
              organization.id,
              p_profile_id
            )
          )
        )
    );
$$;

revoke all on function public.can_manage_org_groups(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_org_groups(uuid, uuid)
  to authenticated;

create or replace function public.can_view_org_group(
  p_group_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.org_groups group_row
    join public.organizations organization
      on organization.id = group_row.org_id
    where group_row.id = p_group_id
      and (
        public.can_manage_org_groups(group_row.org_id, p_profile_id)
        or (
          organization.type = 'school'
          and public.is_assigned_group_staff(group_row.id, p_profile_id)
        )
        or (
          organization.type in ('club', 'team')
          and public.is_active_member(group_row.org_id, p_profile_id)
        )
        or exists (
          select 1
          from public.org_group_members own_group
          where own_group.group_id = group_row.id
            and own_group.profile_id = p_profile_id
        )
      )
  );
$$;

revoke all on function public.can_view_org_group(uuid, uuid)
  from public, anon;
grant execute on function public.can_view_org_group(uuid, uuid)
  to authenticated;

-- School group shape is controlled by school admins. Assigned coaches and
-- assistants can read their groups, but cannot expand their own scope.
drop policy if exists "groups_select_member" on public.org_groups;
create policy "groups_select_scoped"
  on public.org_groups for select
  to authenticated
  using (public.can_view_org_group(id, auth.uid()));

drop policy if exists "groups_insert_coach" on public.org_groups;
create policy "groups_insert_scoped_admin"
  on public.org_groups for insert
  to authenticated
  with check (public.can_manage_org_groups(org_id, auth.uid()));

drop policy if exists "groups_update_coach" on public.org_groups;
create policy "groups_update_scoped_admin"
  on public.org_groups for update
  to authenticated
  using (public.can_manage_org_groups(org_id, auth.uid()))
  with check (public.can_manage_org_groups(org_id, auth.uid()));

drop policy if exists "groups_delete_coach" on public.org_groups;
create policy "groups_delete_scoped_admin"
  on public.org_groups for delete
  to authenticated
  using (public.can_manage_org_groups(org_id, auth.uid()));

drop policy if exists "group_members_select_member"
  on public.org_group_members;
create policy "group_members_select_scoped"
  on public.org_group_members for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.can_view_org_group(group_id, auth.uid())
  );

drop policy if exists "group_members_insert_coach"
  on public.org_group_members;
create policy "group_members_insert_scoped_admin"
  on public.org_group_members for insert
  to authenticated
  with check (
    exists (
      select 1
      from public.org_groups group_row
      where group_row.id = org_group_members.group_id
        and public.can_manage_org_groups(group_row.org_id, auth.uid())
        and public.is_active_member(
          group_row.org_id,
          org_group_members.profile_id
        )
    )
  );

drop policy if exists "group_members_delete_coach"
  on public.org_group_members;
create policy "group_members_delete_scoped_admin"
  on public.org_group_members for delete
  to authenticated
  using (
    exists (
      select 1
      from public.org_groups group_row
      where group_row.id = org_group_members.group_id
        and public.can_manage_org_groups(group_row.org_id, auth.uid())
    )
  );

drop policy if exists "group_staff_select_scoped"
  on public.org_group_staff_assignments;
create policy "group_staff_select_scoped"
  on public.org_group_staff_assignments for select
  to authenticated
  using (
    profile_id = auth.uid()
    or exists (
      select 1
      from public.org_groups group_row
      where group_row.id = org_group_staff_assignments.group_id
        and public.can_manage_org_groups(group_row.org_id, auth.uid())
    )
    or public.is_platform_admin()
  );

create or replace function public.set_group_staff_assignments(
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

  if not public.can_manage_org_groups(target_org_id, auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select count(distinct profile_id)
    into requested_count
  from unnest(requested_ids) as requested(profile_id);

  if requested_count <> cardinality(requested_ids) then
    raise exception 'duplicate_group_staff' using errcode = '22023';
  end if;

  if exists (
    select 1
    from unnest(requested_ids) as requested(profile_id)
    where not exists (
      select 1
      from public.org_memberships membership
      where membership.org_id = target_org_id
        and membership.profile_id = requested.profile_id
        and membership.status = 'active'
        and membership.role in ('coach', 'assistant_coach')
    )
  ) then
    raise exception 'group_staff_not_active' using errcode = '22023';
  end if;

  delete from public.org_group_staff_assignments
  where group_id = p_group_id;

  insert into public.org_group_staff_assignments (
    group_id,
    profile_id,
    assigned_by
  )
  select
    p_group_id,
    requested.profile_id,
    auth.uid()
  from unnest(requested_ids) as requested(profile_id);

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    'organization.group_staff_changed',
    'organizations',
    target_org_id::text,
    jsonb_build_object(
      'org_id', target_org_id,
      'group_id', p_group_id,
      'assigned_count', requested_count
    )
  );

  return requested_count;
end;
$$;

revoke all on function public.set_group_staff_assignments(uuid, uuid[])
  from public, anon;
grant execute on function public.set_group_staff_assignments(uuid, uuid[])
  to authenticated;

-- Keep group membership replacement transactional, but use the stricter
-- school-admin boundary.
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

  if not public.can_manage_org_groups(target_org_id, auth.uid()) then
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
    where not exists (
      select 1
      from public.org_memberships membership
      where membership.org_id = target_org_id
        and membership.profile_id = requested.profile_id
        and membership.status = 'active'
        and membership.role = 'student'
    )
  ) then
    raise exception 'group_member_not_active_student' using errcode = '22023';
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

-- ---------------------------------------------------------------------------
-- 2. Separate event ownership from student-level event operations.
-- ---------------------------------------------------------------------------

-- District administrators host district events. School events stay with local
-- school staff rather than inheriting central-office event authority.
create or replace function public.can_operate_org_competitions(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.organizations organization
    where organization.id = p_org_id
      and (
        (
          organization.type = 'school'
          and not public.is_district_operator_for_school(
            organization.id,
            p_profile_id
          )
          and public.is_org_coach(organization.id, p_profile_id)
        )
        or (
          organization.type <> 'school'
          and public.is_org_coach(organization.id, p_profile_id)
        )
      )
  );
$$;

revoke all on function public.can_operate_org_competitions(uuid, uuid)
  from public, anon;
grant execute on function public.can_operate_org_competitions(uuid, uuid)
  to authenticated;

create or replace function public.can_view_competition_entrant(
  p_competition_id uuid,
  p_entrant_id uuid,
  p_viewer_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_viewer_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.competitions competition
      where competition.id = p_competition_id
        and (
          (
            competition.org_id is not null
            and public.can_view_org_student(
              competition.org_id,
              p_entrant_id,
              p_viewer_id
            )
          )
          or exists (
            select 1
            from public.org_competition_attendance attendance
            where attendance.competition_id = competition.id
              and public.can_view_org_student(
                attendance.org_id,
                p_entrant_id,
                p_viewer_id
              )
          )
          or exists (
            select 1
            from public.competition_entrants entrant
            where entrant.competition_id = competition.id
              and entrant.profile_id = p_entrant_id
              and entrant.origin_org_id is not null
              and public.can_view_org_student(
                entrant.origin_org_id,
                entrant.profile_id,
                p_viewer_id
              )
          )
        )
    );
$$;

revoke all on function public.can_view_competition_entrant(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_view_competition_entrant(uuid, uuid, uuid)
  to authenticated;

create or replace function public.can_operate_competition_entrant(
  p_competition_id uuid,
  p_entrant_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_actor_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.competitions competition
      where competition.id = p_competition_id
        and (
          (
            competition.org_id is not null
            and public.can_operate_org_student(
              competition.org_id,
              p_entrant_id,
              p_actor_id
            )
          )
          or exists (
            select 1
            from public.org_competition_attendance attendance
            where attendance.competition_id = competition.id
              and public.can_operate_org_student(
                attendance.org_id,
                p_entrant_id,
                p_actor_id
              )
          )
          or exists (
            select 1
            from public.competition_entrants entrant
            where entrant.competition_id = competition.id
              and entrant.profile_id = p_entrant_id
              and entrant.origin_org_id is not null
              and public.can_operate_org_student(
                entrant.origin_org_id,
                entrant.profile_id,
                p_actor_id
              )
          )
        )
    );
$$;

revoke all on function public.can_operate_competition_entrant(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_operate_competition_entrant(uuid, uuid, uuid)
  to authenticated;

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
    and public.can_operate_competition_entrant(
      p_competition_id,
      p_entrant_id,
      p_inviter_id
    );
$$;

revoke all on function public.can_invite_to_competition(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_invite_to_competition(uuid, uuid, uuid)
  to authenticated;

drop policy if exists "entrants_select_self_parent_manager"
  on public.competition_entrants;
create policy "entrants_select_self_parent_scoped_staff"
  on public.competition_entrants for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_view_competition_entrant(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

drop policy if exists "entrants_insert_manager"
  on public.competition_entrants;
create policy "entrants_insert_scoped_staff"
  on public.competition_entrants for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and (
      public.can_operate_competition_entrant(
        competition_id,
        profile_id,
        auth.uid()
      )
      or (
        status in ('going', 'not_going')
        and responded_by = auth.uid()
        and (
          (profile_id = auth.uid() and response_source = 'self')
          or (
            public.is_parent_of(auth.uid(), profile_id)
            and response_source = 'parent'
          )
        )
        and exists (
          select 1
          from public.competitions competition
          where competition.id = competition_entrants.competition_id
            and competition.status = 'published'
            and competition.visibility = 'public'
            and competition.audience = 'public'
        )
      )
    )
  );

drop policy if exists "entrants_update_self_parent_manager"
  on public.competition_entrants;
create policy "entrants_update_self_parent_scoped_staff"
  on public.competition_entrants for update
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_operate_competition_entrant(
      competition_id,
      profile_id,
      auth.uid()
    )
  )
  with check (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_operate_competition_entrant(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

drop policy if exists "entrants_delete_manager"
  on public.competition_entrants;
create policy "entrants_delete_scoped_staff"
  on public.competition_entrants for delete
  to authenticated
  using (
    public.can_operate_competition_entrant(
      competition_id,
      profile_id,
      auth.uid()
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Protect primary owners and delegated administrator grants/revokes.
-- ---------------------------------------------------------------------------

create or replace function public.can_manage_org_member(
  p_org_id uuid,
  p_member_id uuid,
  p_actor_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select
    (
      p_actor_id = auth.uid()
      and public.is_platform_admin()
    )
    or exists (
      select 1
      from public.org_memberships target
      join public.organizations organization
        on organization.id = target.org_id
      where target.org_id = p_org_id
        and target.profile_id = p_member_id
        and public.can_administer_org(p_org_id, p_actor_id)
        and (
          organization.type <> 'school'
          or not public.is_district_operator_for_school(
            organization.id,
            p_actor_id
          )
          or target.role <> 'student'
        )
    );
$$;

revoke all on function public.can_manage_org_member(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_org_member(uuid, uuid, uuid)
  to authenticated;

drop policy if exists "memberships_select_own_or_staff"
  on public.org_memberships;
create policy "memberships_select_scoped"
  on public.org_memberships for select
  to authenticated
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.is_platform_admin()
    or (
      role <> 'student'
      and public.can_administer_org(org_id, auth.uid())
    )
    or (
      role = 'student'
      and public.can_view_org_student(org_id, profile_id, auth.uid())
    )
  );

drop policy if exists "memberships_insert_operator"
  on public.org_memberships;
create policy "memberships_insert_scoped_admin"
  on public.org_memberships for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or public.can_administer_org(org_id, auth.uid())
  );

drop policy if exists "memberships_update_self_or_operator"
  on public.org_memberships;
create policy "memberships_update_self_or_scoped_admin"
  on public.org_memberships for update
  to authenticated
  using (
    (profile_id = auth.uid() and status <> 'removed')
    or public.can_manage_org_member(org_id, profile_id, auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or public.can_manage_org_member(org_id, profile_id, auth.uid())
  );

drop policy if exists "memberships_delete_operator"
  on public.org_memberships;
create policy "memberships_delete_scoped_admin"
  on public.org_memberships for delete
  to authenticated
  using (
    public.can_manage_org_member(org_id, profile_id, auth.uid())
  );

create or replace function public.guard_protected_org_administrator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_owner uuid;
  active_admin_count integer;
  actor_is_platform_admin boolean := public.is_platform_admin();
  old_is_admin boolean := old.role in (
    'district_admin',
    'school_admin',
    'admin'
  );
  loses_admin boolean;
begin
  if tg_op = 'DELETE' then
    loses_admin := old_is_admin;
  else
    loses_admin :=
      old_is_admin
      and (
        new.role not in ('district_admin', 'school_admin', 'admin')
        or new.status <> 'active'
      );
  end if;

  if not loses_admin then
    return case when tg_op = 'DELETE' then old else new end;
  end if;

  select organization.owner_profile_id
    into protected_owner
  from public.organizations organization
  where organization.id = old.org_id;

  if old.profile_id = protected_owner then
    raise exception 'protected_owner_cannot_be_revoked'
      using errcode = '42501';
  end if;

  if not actor_is_platform_admin and old.profile_id = auth.uid() then
    raise exception 'administrator_cannot_revoke_self'
      using errcode = '42501';
  end if;

  select count(*)
    into active_admin_count
  from public.org_memberships membership
  where membership.org_id = old.org_id
    and membership.status = 'active'
    and membership.role in ('district_admin', 'school_admin', 'admin');

  if not actor_is_platform_admin and active_admin_count <= 1 then
    raise exception 'last_administrator_cannot_be_revoked'
      using errcode = '42501';
  end if;

  return case when tg_op = 'DELETE' then old else new end;
end;
$$;

drop trigger if exists org_memberships_protect_administrators
  on public.org_memberships;
create trigger org_memberships_protect_administrators
  before update or delete on public.org_memberships
  for each row execute function public.guard_protected_org_administrator();

revoke all on function public.guard_protected_org_administrator()
  from public, anon, authenticated;

create or replace function public.set_organization_administrator(
  p_org_id uuid,
  p_profile_id uuid,
  p_make_admin boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_row public.organizations%rowtype;
  membership_row public.org_memberships%rowtype;
  next_role text;
  action_name text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select *
    into organization_row
  from public.organizations organization
  where organization.id = p_org_id
  for update;

  if not found or organization_row.type not in ('district', 'school') then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  if not (
    public.can_administer_org(p_org_id, auth.uid())
    or public.is_platform_admin()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select *
    into membership_row
  from public.org_memberships membership
  where membership.org_id = p_org_id
    and membership.profile_id = p_profile_id
    and membership.status = 'active'
  for update;

  if not found then
    raise exception 'active_member_required' using errcode = '22023';
  end if;

  if p_make_admin then
    if membership_row.role = 'student' then
      raise exception 'staff_member_required' using errcode = '22023';
    end if;
    next_role := case
      when organization_row.type = 'district' then 'district_admin'
      else 'school_admin'
    end;
    action_name := 'organization.admin_granted';
  else
    if p_profile_id = organization_row.owner_profile_id then
      raise exception 'protected_owner_cannot_be_revoked'
        using errcode = '42501';
    end if;
    if p_profile_id = auth.uid() and not public.is_platform_admin() then
      raise exception 'administrator_cannot_revoke_self'
        using errcode = '42501';
    end if;
    next_role := 'coach';
    action_name := 'organization.admin_revoked';
  end if;

  update public.org_memberships
  set role = next_role
  where org_id = p_org_id
    and profile_id = p_profile_id;

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    action_name,
    'organizations',
    p_org_id::text,
    jsonb_build_object(
      'org_id', p_org_id,
      'target_profile_id', p_profile_id,
      'from_role', membership_row.role,
      'to_role', next_role
    )
  );

  return next_role;
end;
$$;

revoke all on function public.set_organization_administrator(
  uuid,
  uuid,
  boolean
) from public, anon;
grant execute on function public.set_organization_administrator(
  uuid,
  uuid,
  boolean
) to authenticated;

create or replace function public.remove_organization_member(
  p_org_id uuid,
  p_profile_id uuid
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  previous_role text;
begin
  if auth.uid() is null
     or not public.can_manage_org_member(
       p_org_id,
       p_profile_id,
       auth.uid()
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  select membership.role
    into previous_role
  from public.org_memberships membership
  where membership.org_id = p_org_id
    and membership.profile_id = p_profile_id
    and membership.status <> 'removed'
  for update;

  if previous_role is null then
    raise exception 'member_not_found' using errcode = 'P0002';
  end if;

  update public.org_memberships
  set status = 'removed'
  where org_id = p_org_id
    and profile_id = p_profile_id;

  delete from public.org_group_members group_member
  using public.org_groups group_row
  where group_row.id = group_member.group_id
    and group_row.org_id = p_org_id
    and group_member.profile_id = p_profile_id;

  delete from public.org_group_staff_assignments assignment
  using public.org_groups group_row
  where group_row.id = assignment.group_id
    and group_row.org_id = p_org_id
    and assignment.profile_id = p_profile_id;

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    auth.uid(),
    'organization.member_removed',
    'organizations',
    p_org_id::text,
    jsonb_build_object(
      'org_id', p_org_id,
      'target_profile_id', p_profile_id,
      'role', previous_role
    )
  );

  return previous_role;
end;
$$;

revoke all on function public.remove_organization_member(uuid, uuid)
  from public, anon;
grant execute on function public.remove_organization_member(uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Named roster reads honor the same boundaries.
-- ---------------------------------------------------------------------------

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
declare
  organization_type text;
  viewer_is_platform_admin boolean := public.is_platform_admin();
  viewer_is_local_school_admin boolean;
begin
  select organization.type::text
    into organization_type
  from public.organizations organization
  where organization.id = p_org_id;

  if auth.uid() is null
     or organization_type is null
     or not public.can_view_named_org_roster(p_org_id, auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  viewer_is_local_school_admin :=
    organization_type = 'school'
    and public.is_local_school_admin(p_org_id, auth.uid());

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
      and (
        viewer_is_platform_admin
        or organization_type in ('club', 'team', 'district')
        or viewer_is_local_school_admin
        or membership.profile_id = auth.uid()
        or (
          membership.role = 'student'
          and public.can_view_org_student(
            p_org_id,
            membership.profile_id,
            auth.uid()
          )
        )
      )
    order by lower(profile.display_name);
end;
$$;

revoke all on function public.get_org_roster(uuid) from public, anon;
grant execute on function public.get_org_roster(uuid) to authenticated;

drop function if exists public.get_org_season_attendance(uuid);

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
     or not public.can_view_named_org_roster(p_org_id, auth.uid()) then
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
      and competition.start_date >=
        make_date(extract(year from current_date)::int, 1, 1)
      and (
        competition.org_id = p_org_id
        or exists (
          select 1
          from public.org_competition_attendance attendance
          where attendance.org_id = p_org_id
            and attendance.competition_id = competition.id
        )
      )
      and public.can_view_org_student(
        p_org_id,
        entrant.profile_id,
        auth.uid()
      )
    order by competition.start_date desc, lower(profile.display_name);
end;
$$;

revoke all on function public.get_org_season_attendance(uuid)
  from public, anon;
grant execute on function public.get_org_season_attendance(uuid)
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
    or public.can_view_org_student(p_org_id, p_profile_id, actor)
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
       public.can_manage_competition(p_competition_id, auth.uid())
       or exists (
         select 1
         from public.org_competition_attendance attendance
         where attendance.competition_id = p_competition_id
           and public.is_org_staff(attendance.org_id, auth.uid())
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
              where attendance.competition_id = entrant.competition_id
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
      and public.can_view_competition_entrant(
        p_competition_id,
        entrant.profile_id,
        auth.uid()
      )
    order by lower(profile.display_name);
end;
$$;

revoke all on function public.get_event_attendance(uuid)
  from public, anon;
grant execute on function public.get_event_attendance(uuid)
  to authenticated;
