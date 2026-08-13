-- Create a child school and its initial district-operator membership in one
-- district-scoped transaction. Membership-only district administrators must
-- not need a global coach persona to provision their district.

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

  insert into public.org_memberships (
    org_id,
    profile_id,
    role,
    status
  )
  values (
    created_school.id,
    actor,
    'school_admin',
    'active'
  );

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
