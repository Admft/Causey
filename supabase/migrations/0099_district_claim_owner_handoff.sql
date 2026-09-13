-- The first district administrator claim completes the provisioning handoff.
-- A super admin is only the temporary owner while the invitation is pending.

create or replace function public.guard_organization_owner_transfer()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  eligible boolean := false;
  bootstrap_district_claim boolean := false;
  district_fallback_transfer boolean := false;
begin
  if new.owner_profile_id is not distinct from old.owner_profile_id then
    return new;
  end if;

  select
    old.type = 'district'
    and new.owner_profile_id = actor
    and old.owner_profile_id = old.created_by
    and exists (
      select 1
      from public.platform_admins platform
      where platform.profile_id = old.owner_profile_id
        and platform.super_admin
    )
    and exists (
      select 1
      from public.org_invitations invitation
      where invitation.org_id = old.id
        and invitation.role = 'district_admin'
        and invitation.status = 'claimed'
        and invitation.claimed_by = actor
    )
  into bootstrap_district_claim;

  select
    old.type = 'school'
    and old.parent_org_id is not null
    and pg_trigger_depth() > 1
    and exists (
      select 1
      from public.organizations district
      join public.org_memberships district_actor
        on district_actor.org_id = district.id
       and district_actor.profile_id = actor
       and district_actor.status = 'active'
       and district_actor.role in ('district_admin', 'admin')
      where district.id = old.parent_org_id
        and district.type = 'district'
        and new.owner_profile_id = district.owner_profile_id
    )
  into district_fallback_transfer;

  if session_user not in ('postgres', 'supabase_admin')
     and (
       actor is null
       or (
         actor is distinct from old.owner_profile_id
         and not public.is_platform_admin()
         and not bootstrap_district_claim
         and not district_fallback_transfer
       )
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
      and (
        (old.type = 'district'
          and membership.role in ('district_admin', 'admin'))
        or (old.type = 'school'
          and membership.role in ('school_admin', 'admin'))
        or (old.type in ('club', 'team')
          and membership.role in ('coach', 'admin'))
      )
    union all
    select 1
    from public.organizations district
    join public.org_memberships district_owner
      on district_owner.org_id = district.id
     and district_owner.profile_id = new.owner_profile_id
     and district_owner.status = 'active'
     and district_owner.role in ('district_admin', 'admin')
    where old.type = 'school'
      and district.id = old.parent_org_id
      and district.owner_profile_id = new.owner_profile_id
  ) into eligible;

  if not eligible then
    raise exception 'organization_owner_must_be_active_staff'
      using errcode = '22023';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_organization_owner_transfer()
  from public, anon, authenticated;

create or replace function public.handoff_provisioned_district_owner_on_claim()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.status is distinct from 'claimed'
     or new.role is distinct from 'district_admin'
     or new.claimed_by is null
     or (
       old.status is not distinct from new.status
       and old.claimed_by is not distinct from new.claimed_by
     ) then
    return new;
  end if;

  if not exists (
    select 1
    from auth.users auth_user
    where auth_user.id = new.claimed_by
      and lower(coalesce(auth_user.email, '')) = lower(new.email)
  ) or not exists (
    select 1
    from public.org_memberships membership
    where membership.org_id = new.org_id
      and membership.profile_id = new.claimed_by
      and membership.status = 'active'
      and membership.role = 'district_admin'
  ) then
    raise exception 'district_owner_handoff_claim_invalid'
      using errcode = '42501';
  end if;

  update public.organizations organization
  set owner_profile_id = new.claimed_by
  where organization.id = new.org_id
    and organization.type = 'district'
    and organization.owner_profile_id = organization.created_by
    and exists (
      select 1
      from public.platform_admins platform
      where platform.profile_id = organization.owner_profile_id
        and platform.super_admin
    );

  if exists (
    select 1
    from public.organizations organization
    join public.platform_admins platform
      on platform.profile_id = organization.owner_profile_id
     and platform.super_admin
    where organization.id = new.org_id
      and organization.type = 'district'
      and organization.owner_profile_id = organization.created_by
  ) then
    raise exception 'district_owner_handoff_incomplete'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

drop trigger if exists org_invitations_handoff_district_owner
  on public.org_invitations;
create trigger org_invitations_handoff_district_owner
  after update of status, claimed_by on public.org_invitations
  for each row execute function
    public.handoff_provisioned_district_owner_on_claim();

revoke all on function public.handoff_provisioned_district_owner_on_claim()
  from public, anon, authenticated;

with first_valid_claim as (
  select distinct on (invitation.org_id)
    invitation.org_id,
    invitation.claimed_by
  from public.org_invitations invitation
  join public.organizations organization
    on organization.id = invitation.org_id
   and organization.type = 'district'
  join public.platform_admins platform
    on platform.profile_id = organization.owner_profile_id
   and platform.super_admin
  join auth.users auth_user
    on auth_user.id = invitation.claimed_by
   and lower(coalesce(auth_user.email, '')) = lower(invitation.email)
  join public.org_memberships membership
    on membership.org_id = invitation.org_id
   and membership.profile_id = invitation.claimed_by
   and membership.status = 'active'
   and membership.role = 'district_admin'
  where invitation.status = 'claimed'
    and organization.owner_profile_id = organization.created_by
  order by
    invitation.org_id,
    invitation.claimed_at asc nulls last,
    invitation.created_at
)
update public.organizations organization
set owner_profile_id = claim.claimed_by
from first_valid_claim claim
where organization.id = claim.org_id
  and organization.owner_profile_id = organization.created_by;

comment on function public.handoff_provisioned_district_owner_on_claim() is
  'Transfers a newly claimed district from its temporary provisioning super admin to the matching first district administrator.';

-- Delegated administrator creation must go through an invitation claim or the
-- audited administrator RPC. Direct membership inserts may add ordinary
-- roster/staff roles, but cannot manufacture administrator authority.
alter table public.org_memberships
  add column if not exists prior_non_admin_role text;

create or replace function public.preserve_membership_role_across_admin_grant()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if old.role not in ('admin', 'school_admin', 'district_admin')
     and new.role in ('admin', 'school_admin', 'district_admin') then
    new.prior_non_admin_role := old.role;
  elsif old.role in ('admin', 'school_admin', 'district_admin')
     and new.role not in ('admin', 'school_admin', 'district_admin') then
    new.role := coalesce(
      nullif(old.prior_non_admin_role, ''),
      new.role
    );
    new.prior_non_admin_role := null;
  end if;

  return new;
end;
$$;

drop trigger if exists org_memberships_capture_prior_role
  on public.org_memberships;
create trigger org_memberships_capture_prior_role
  before update of role on public.org_memberships
  for each row execute function
    public.preserve_membership_role_across_admin_grant();

revoke all on function public.preserve_membership_role_across_admin_grant()
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
    if membership_row.role = next_role
       or membership_row.role = 'admin' then
      return membership_row.role;
    end if;
    action_name := 'organization.admin_granted';
  else
    if membership_row.role not in (
      'district_admin',
      'school_admin',
      'admin'
    ) then
      return membership_row.role;
    end if;
    if p_profile_id = organization_row.owner_profile_id then
      raise exception 'protected_owner_cannot_be_revoked'
        using errcode = '42501';
    end if;
    if p_profile_id = auth.uid() and not public.is_platform_admin() then
      raise exception 'administrator_cannot_revoke_self'
        using errcode = '42501';
    end if;
    next_role := case
      when membership_row.prior_non_admin_role in (
        'assistant_coach',
        'coach'
      ) then membership_row.prior_non_admin_role
      else 'coach'
    end;
    action_name := 'organization.admin_revoked';
  end if;

  update public.org_memberships
  set
    role = next_role,
    prior_non_admin_role = case
      when p_make_admin then membership_row.role
      else null
    end
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

drop policy if exists "memberships_insert_scoped_admin"
  on public.org_memberships;
create policy "memberships_insert_non_admin_or_platform"
  on public.org_memberships for insert
  to authenticated
  with check (
    public.is_platform_admin()
    or (
      public.can_administer_org(org_id, auth.uid())
      and role in ('student', 'assistant_coach', 'coach')
      and (
        role <> 'student'
        or not public.is_district_operator_for_school(org_id, auth.uid())
      )
    )
  );

drop policy if exists "orgs_update_operator"
  on public.organizations;
create policy "orgs_update_operator"
  on public.organizations for update
  to authenticated
  using (
    public.can_administer_org(id, auth.uid())
    or public.is_platform_admin()
  )
  with check (true);

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
drop policy if exists "announcements_select_scoped_member"
  on public.org_announcements;
create policy "announcements_select_member"
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
drop policy if exists "announcements_insert_scoped_staff"
  on public.org_announcements;
create policy "announcements_insert_staff"
  on public.org_announcements for insert
  to authenticated
  with check (
    created_by = auth.uid()
    and public.can_publish_org_announcement(org_id, auth.uid())
  );

drop policy if exists "announcements_update_staff"
  on public.org_announcements;
drop policy if exists "announcements_update_scoped_staff"
  on public.org_announcements;
create policy "announcements_update_staff"
  on public.org_announcements for update
  to authenticated
  using (public.can_publish_org_announcement(org_id, auth.uid()))
  with check (public.can_publish_org_announcement(org_id, auth.uid()));

create or replace function public.guard_membership_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_type text;
  target_parent uuid;
begin
  select organization.type, organization.parent_org_id
    into target_type, target_parent
  from public.organizations organization
  where organization.id = new.org_id;

  if target_type = 'district'
     and new.role in ('student', 'school_admin') then
    raise exception 'district_membership_role_not_allowed';
  end if;
  if target_type <> 'district'
     and new.role = 'district_admin' then
    raise exception 'district_admin_requires_district';
  end if;
  if target_type = 'school'
     and target_parent is not null
     and new.status = 'active'
     and exists (
       select 1
       from public.org_memberships district_membership
       where district_membership.org_id = target_parent
         and district_membership.profile_id = new.profile_id
         and district_membership.status = 'active'
         and district_membership.role in ('district_admin', 'admin')
     ) then
    raise exception 'district_operator_cannot_hold_school_membership'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists org_memberships_guard_scope
  on public.org_memberships;
create trigger org_memberships_guard_scope
  before insert or update of org_id, role, status
  on public.org_memberships
  for each row execute function public.guard_membership_scope();

-- Membership role and status changes are RPC-only. The former self-update
-- policy could not distinguish "leave" from changing one's own role.
drop policy if exists "memberships_update_self_or_scoped_admin"
  on public.org_memberships;
drop policy if exists "memberships_delete_scoped_admin"
  on public.org_memberships;

-- Owners must transfer ownership before leaving or losing administrator
-- authority. When another district administrator is revoked, any child school
-- they provisioned but never handed off returns to the protected district
-- owner so district access is actually removed end to end.
create or replace function public.guard_protected_org_administrator()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  protected_owner uuid;
  organization_type text;
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

  select organization.owner_profile_id, organization.type
    into protected_owner, organization_type
  from public.organizations organization
  where organization.id = old.org_id;

  if old.profile_id = protected_owner then
    raise exception 'protected_owner_cannot_be_revoked'
      using errcode = '42501';
  end if;

  -- Legacy district-created schools could stamp the district operator as a
  -- local school admin. That duplicate identity is not a protected school
  -- administrator and must be removable when district authority ends.
  if organization_type = 'school'
     and public.is_district_operator_for_school(
       old.org_id,
       old.profile_id
     ) then
    return case when tg_op = 'DELETE' then old else new end;
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

create or replace function public.guard_org_membership_authority_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  organization_row public.organizations%rowtype;
  loses_admin_authority boolean;
begin
  select *
    into organization_row
  from public.organizations organization
  where organization.id = old.org_id;

  loses_admin_authority :=
    old.status = 'active'
    and old.role in ('admin', 'school_admin', 'district_admin')
    and (
      new.status is distinct from 'active'
      or new.role not in ('admin', 'school_admin', 'district_admin')
    );

  if organization_row.owner_profile_id = old.profile_id
     and (
       (old.status = 'active' and new.status is distinct from 'active')
       or loses_admin_authority
     ) then
    raise exception 'protected_owner_cannot_be_revoked'
      using errcode = '42501';
  end if;

  if organization_row.type = 'district'
     and loses_admin_authority
     and old.profile_id is distinct from organization_row.owner_profile_id then
    update public.organizations school
    set owner_profile_id = organization_row.owner_profile_id
    where school.parent_org_id = organization_row.id
      and school.type = 'school'
      and school.owner_profile_id = old.profile_id;

    update public.org_memberships child_membership
    set status = 'removed'
    where child_membership.profile_id = old.profile_id
      and child_membership.status <> 'removed'
      and exists (
        select 1
        from public.organizations school
        where school.id = child_membership.org_id
          and school.parent_org_id = organization_row.id
          and school.type = 'school'
      );

    delete from public.org_group_staff_assignments assignment
    using public.org_groups group_row, public.organizations school
    where group_row.id = assignment.group_id
      and school.id = group_row.org_id
      and school.parent_org_id = organization_row.id
      and school.type = 'school'
      and assignment.profile_id = old.profile_id;

    delete from public.org_group_members group_member
    using public.org_groups group_row, public.organizations school
    where group_row.id = group_member.group_id
      and school.id = group_row.org_id
      and school.parent_org_id = organization_row.id
      and school.type = 'school'
      and group_member.profile_id = old.profile_id;

    update public.org_invitations invitation
    set status = 'revoked', revoked_at = now()
    where invitation.status = 'pending'
      and exists (
        select 1
        from public.organizations school
        where school.id = invitation.org_id
          and school.parent_org_id = organization_row.id
          and school.type = 'school'
      )
      and lower(invitation.email) = (
        select lower(auth_user.email)
        from auth.users auth_user
        where auth_user.id = old.profile_id
      );
  end if;

  return new;
end;
$$;

drop trigger if exists org_memberships_guard_authority_change
  on public.org_memberships;
create trigger org_memberships_guard_authority_change
  before update of role, status on public.org_memberships
  for each row execute function
    public.guard_org_membership_authority_change();

revoke all on function public.guard_org_membership_authority_change()
  from public, anon, authenticated;

create or replace function public.leave_organization(p_org_id uuid)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  previous_role text;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  select membership.role
    into previous_role
  from public.org_memberships membership
  where membership.org_id = p_org_id
    and membership.profile_id = actor
    and membership.status = 'active'
  for update;

  if previous_role is null then
    raise exception 'active_member_required' using errcode = 'P0002';
  end if;

  update public.org_memberships
  set status = 'removed'
  where org_id = p_org_id
    and profile_id = actor;

  delete from public.org_group_members group_member
  using public.org_groups group_row
  where group_row.id = group_member.group_id
    and group_row.org_id = p_org_id
    and group_member.profile_id = actor;

  delete from public.org_group_staff_assignments assignment
  using public.org_groups group_row
  where group_row.id = assignment.group_id
    and group_row.org_id = p_org_id
    and assignment.profile_id = actor;

  insert into public.audit_events (
    actor_id,
    action,
    entity_type,
    entity_id,
    detail
  )
  values (
    actor,
    'organization.member_left',
    'organizations',
    p_org_id::text,
    jsonb_build_object(
      'org_id', p_org_id,
      'target_profile_id', actor,
      'role', previous_role
    )
  );

  return previous_role;
end;
$$;

revoke all on function public.leave_organization(uuid)
  from public, anon;
grant execute on function public.leave_organization(uuid)
  to authenticated;

-- District operators can delegate school staff, but individual student
-- provisioning stays with the school. This also covers security-definer invite
-- functions that bypass table RLS.
create or replace function public.guard_district_student_invitation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.role = 'student'
     and not public.is_platform_admin()
     and public.is_district_operator_for_school(new.org_id, auth.uid()) then
    raise exception 'school_student_invitation_requires_local_staff'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists org_invitations_guard_district_student
  on public.org_invitations;
create trigger org_invitations_guard_district_student
  before insert on public.org_invitations
  for each row execute function
    public.guard_district_student_invitation();

revoke all on function public.guard_district_student_invitation()
  from public, anon, authenticated;

create or replace function public.get_active_guardians_for_profiles(
  p_child_ids uuid[]
)
returns table (
  child_id uuid,
  parent_id uuid,
  child_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    household.child_profile_id,
    household.parent_profile_id,
    coalesce(nullif(btrim(child.display_name), ''), 'Your student')
  from public.household_links household
  join public.profiles child
    on child.id = household.child_profile_id
  where household.status = 'active'
    and p_child_ids is not null
    and household.child_profile_id = any(p_child_ids)
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.household_links self
        where self.parent_profile_id = auth.uid()
          and self.child_profile_id = household.child_profile_id
          and self.status = 'active'
      )
      or exists (
        select 1
        from public.org_memberships membership
        where membership.profile_id = household.child_profile_id
          and membership.status = 'active'
          and public.can_operate_org_student(
            membership.org_id,
            household.child_profile_id,
            auth.uid()
          )
      )
      or exists (
        select 1
        from public.competition_entrants entrant
        where entrant.profile_id = household.child_profile_id
          and public.can_operate_competition_entrant(
            entrant.competition_id,
            entrant.profile_id,
            auth.uid()
          )
      )
    );
$$;

revoke all on function public.get_active_guardians_for_profiles(uuid[])
  from public, anon;
grant execute on function public.get_active_guardians_for_profiles(uuid[])
  to authenticated;

-- Creating a child school gives its district creator temporary protected
-- ownership, but not a second local school-admin identity. The district
-- authority is inherited until ownership is handed to a claimed school admin.
create or replace function public.create_district_school(
  p_district_id uuid,
  p_name text,
  p_slug text,
  p_state text
)
returns table (school_id uuid, school_slug text)
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_slug text := lower(trim(coalesce(p_slug, '')));
  normalized_state text := upper(trim(coalesce(p_state, '')));
  created_school public.organizations%rowtype;
begin
  if actor is null
     or not public.is_district_admin(p_district_id, actor) then
    raise exception 'district_admin_required' using errcode = '42501';
  end if;

  if char_length(normalized_name) < 2
     or char_length(normalized_name) > 80 then
    raise exception 'invalid_school_name' using errcode = '22023';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(normalized_slug) > 120 then
    raise exception 'invalid_school_slug' using errcode = '22023';
  end if;
  if normalized_state !~ '^[A-Z]{2}$' then
    raise exception 'invalid_school_state' using errcode = '22023';
  end if;

  insert into public.organizations (
    name,
    slug,
    type,
    state,
    parent_org_id,
    created_by,
    owner_profile_id,
    verification_status
  )
  values (
    normalized_name,
    normalized_slug,
    'school',
    normalized_state,
    p_district_id,
    actor,
    actor,
    'pending'
  )
  returning * into created_school;

  return query
  select created_school.id, created_school.slug;
end;
$$;

revoke all on function public.create_district_school(
  uuid,
  text,
  text,
  text
) from public, anon;
grant execute on function public.create_district_school(
  uuid,
  text,
  text,
  text
) to authenticated;
