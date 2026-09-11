-- Super-admin permanent deletion of a district and its child schools.
-- Child schools reference parent_org_id ON DELETE RESTRICT, so children must
-- be removed first. Hosted competitions use ON DELETE SET NULL on org_id;
-- delete those rows instead of leaving orphan listings.

create or replace function public.admin_delete_district(
  p_district_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  dist_id uuid;
  dist_name text;
  dist_slug text;
  dist_type text;
  child_ids uuid[] := '{}'::uuid[];
  all_ids uuid[] := '{}'::uuid[];
  competition_ids uuid[] := '{}'::uuid[];
  schools_deleted integer := 0;
  competitions_deleted integer := 0;
begin
  if actor is null or not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;

  select o.id, o.name, o.slug, o.type
  into dist_id, dist_name, dist_slug, dist_type
  from public.organizations o
  where o.id = p_district_id
  for update;

  if dist_id is null then
    raise exception 'organization_not_found';
  end if;
  if dist_type <> 'district' then
    raise exception 'not_a_district';
  end if;

  select coalesce(array_agg(school.id), '{}'::uuid[])
  into child_ids
  from public.organizations school
  where school.parent_org_id = dist_id;

  all_ids := array_append(child_ids, dist_id);

  select coalesce(array_agg(c.id), '{}'::uuid[])
  into competition_ids
  from public.competitions c
  where c.org_id = any (all_ids);

  if coalesce(cardinality(competition_ids), 0) > 0 then
    delete from public.qualification_rules
    where from_competition_id = any (competition_ids);

    update public.competitions
    set canonical_id = null
    where canonical_id = any (competition_ids)
      and not (id = any (competition_ids));

    delete from public.competitions
    where id = any (competition_ids);

    get diagnostics competitions_deleted = row_count;
  end if;

  if coalesce(cardinality(child_ids), 0) > 0 then
    delete from public.organizations
    where id = any (child_ids);

    get diagnostics schools_deleted = row_count;
  end if;

  insert into public.admin_audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    actor,
    'delete_district',
    'organization',
    dist_id,
    jsonb_build_object(
      'name', dist_name,
      'slug', dist_slug,
      'schools_deleted', schools_deleted,
      'competitions_deleted', competitions_deleted,
      'school_ids', to_jsonb(child_ids)
    )
  );

  delete from public.organizations
  where id = dist_id;

  return jsonb_build_object(
    'district_id', dist_id,
    'name', dist_name,
    'slug', dist_slug,
    'schools_deleted', schools_deleted,
    'competitions_deleted', competitions_deleted
  );
end;
$$;

revoke execute on function public.admin_delete_district(uuid)
  from public, anon;
grant execute on function public.admin_delete_district(uuid)
  to authenticated;

comment on function public.admin_delete_district(uuid) is
  'Permanently deletes a district, its child schools, and their hosted competitions for a founder super-admin.';
