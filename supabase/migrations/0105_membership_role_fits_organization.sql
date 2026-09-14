-- Membership writes must use the same org-type role fit as People invites.
-- Platform admin could previously grant school_admin on a club/team because
-- guard_membership_scope and admin_upsert_org_membership only blocked
-- district↔student/school_admin and district_admin off-district.

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
  if not public.invitation_role_fits_organization(target_type, new.role) then
    raise exception 'membership_role_does_not_fit_organization';
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

create or replace function public.admin_upsert_org_membership(
  p_profile_id uuid,
  p_org_id uuid,
  p_role text,
  p_status text default 'active'
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  org_row public.organizations%rowtype;
  previous_role text;
  previous_status text;
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;

  if p_role not in (
    'student',
    'assistant_coach',
    'coach',
    'school_admin',
    'district_admin',
    'admin'
  ) then
    raise exception 'invalid_membership_role' using errcode = '22023';
  end if;

  if p_status not in ('active', 'invited', 'removed') then
    raise exception 'invalid_membership_status' using errcode = '22023';
  end if;

  if not exists (select 1 from public.profiles where id = p_profile_id) then
    raise exception 'profile_not_found' using errcode = 'P0002';
  end if;

  select * into org_row
  from public.organizations
  where id = p_org_id;
  if org_row.id is null then
    raise exception 'organization_not_found' using errcode = 'P0002';
  end if;

  if org_row.type = 'district'
     and p_role in ('student', 'school_admin') then
    raise exception 'district_membership_role_not_allowed'
      using errcode = '22023';
  end if;
  if org_row.type <> 'district'
     and p_role = 'district_admin' then
    raise exception 'district_admin_requires_district'
      using errcode = '22023';
  end if;
  if not public.invitation_role_fits_organization(org_row.type, p_role) then
    raise exception 'membership_role_does_not_fit_organization'
      using errcode = '22023';
  end if;

  select role, status into previous_role, previous_status
  from public.org_memberships
  where org_id = p_org_id and profile_id = p_profile_id;

  insert into public.org_memberships (org_id, profile_id, role, status)
  values (p_org_id, p_profile_id, p_role, p_status)
  on conflict (org_id, profile_id) do update
    set role = excluded.role,
        status = excluded.status;

  insert into public.admin_audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    actor,
    'upsert_org_membership',
    'profile',
    p_profile_id,
    jsonb_build_object(
      'org_id', p_org_id,
      'org_slug', org_row.slug,
      'org_name', org_row.name,
      'org_type', org_row.type,
      'role', p_role,
      'status', p_status,
      'previous_role', previous_role,
      'previous_status', previous_status
    )
  );

  return jsonb_build_object(
    'org_id', org_row.id,
    'org_slug', org_row.slug,
    'org_name', org_row.name,
    'role', p_role,
    'status', p_status
  );
end;
$$;

revoke execute on function public.admin_upsert_org_membership(
  uuid,
  uuid,
  text,
  text
) from public, anon;
grant execute on function public.admin_upsert_org_membership(
  uuid,
  uuid,
  text,
  text
) to authenticated;

comment on function public.guard_membership_scope() is
  'Org-type role fit (same as invitation_role_fits_organization) plus district-office isolation from child-school memberships.';
