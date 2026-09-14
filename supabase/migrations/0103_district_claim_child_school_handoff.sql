-- District claim already transferred the district row (0099). Child schools
-- provisioned in the same admin session were still owned by the temporary
-- super admin, so the district administrator could not complete school handoff.

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

  -- Nested school updates run at trigger depth > 1 so the owner-transfer
  -- guard treats them as district fallback transfers to the new owner.
  update public.organizations school
  set owner_profile_id = new.claimed_by
  where school.parent_org_id = new.org_id
    and school.type = 'school'
    and school.owner_profile_id is distinct from new.claimed_by
    and exists (
      select 1
      from public.platform_admins platform
      where platform.profile_id = school.owner_profile_id
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
  ) or exists (
    select 1
    from public.organizations school
    join public.platform_admins platform
      on platform.profile_id = school.owner_profile_id
     and platform.super_admin
    where school.parent_org_id = new.org_id
      and school.type = 'school'
  ) then
    raise exception 'district_owner_handoff_incomplete'
      using errcode = 'P0001';
  end if;

  return new;
end;
$$;

revoke all on function public.handoff_provisioned_district_owner_on_claim()
  from public, anon, authenticated;

comment on function public.handoff_provisioned_district_owner_on_claim() is
  'Transfers a newly claimed district and its still-super-admin-owned child schools from the temporary provisioning owner to the matching first district administrator.';

-- Districts already claimed while child schools stayed on the super admin.
update public.organizations school
set owner_profile_id = district.owner_profile_id
from public.organizations district
where school.parent_org_id = district.id
  and school.type = 'school'
  and district.type = 'district'
  and school.owner_profile_id is distinct from district.owner_profile_id
  and exists (
    select 1
    from public.platform_admins platform
    where platform.profile_id = school.owner_profile_id
      and platform.super_admin
  )
  and not exists (
    select 1
    from public.platform_admins platform
    where platform.profile_id = district.owner_profile_id
      and platform.super_admin
  );
