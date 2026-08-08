-- Atomic, platform-only verification for pending schools under one verified
-- district. Individual rejection/correction notes still use migration 0027.

create or replace function public.bulk_verify_district_schools(
  p_district_id uuid,
  p_school_ids uuid[]
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  selected_count integer;
  matched_count integer;
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  selected_count := coalesce(cardinality(p_school_ids), 0);
  if selected_count < 1 or selected_count > 50 then
    raise exception 'invalid_school_count';
  end if;
  if (
    select count(distinct selected.school_id)
    from unnest(p_school_ids) as selected(school_id)
  ) <> selected_count then
    raise exception 'duplicate_school_ids';
  end if;

  if not exists (
    select 1
    from public.organizations district
    where district.id = p_district_id
      and district.type = 'district'
      and district.verification_status = 'verified'
  ) then
    raise exception 'verified_parent_district_required';
  end if;

  select count(*) into matched_count
  from public.organizations school
  where school.id = any(p_school_ids)
    and school.type = 'school'
    and school.parent_org_id = p_district_id
    and school.verification_status = 'pending';

  if matched_count <> selected_count then
    raise exception 'schools_must_be_pending_children_of_one_district';
  end if;

  update public.organizations school
  set
    verification_status = 'verified',
    verified_at = now(),
    verified_by = actor,
    updated_at = now()
  where school.id = any(p_school_ids);

  insert into public.organization_verification_reviews (
    org_id,
    status,
    note,
    reviewed_by,
    reviewed_at
  )
  select
    selected.school_id,
    'verified',
    null,
    actor,
    now()
  from unnest(p_school_ids) as selected(school_id)
  on conflict (org_id) do update
  set
    status = excluded.status,
    note = null,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;

  return selected_count;
end;
$$;

revoke all on function public.bulk_verify_district_schools(uuid, uuid[])
  from public, anon;
grant execute on function public.bulk_verify_district_schools(uuid, uuid[])
  to authenticated;
