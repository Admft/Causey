-- Super-admin permanent deletion of a school workspace (including orphan
-- schools that are not under a district). Hosted competitions use
-- ON DELETE SET NULL on org_id; delete those rows instead of leaving listings.

create or replace function public.admin_delete_school(
  p_school_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  school_id uuid;
  school_name text;
  school_slug text;
  school_type text;
  parent_id uuid;
  competition_ids uuid[] := '{}'::uuid[];
  competitions_deleted integer := 0;
begin
  if actor is null or not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;

  select o.id, o.name, o.slug, o.type, o.parent_org_id
  into school_id, school_name, school_slug, school_type, parent_id
  from public.organizations o
  where o.id = p_school_id
  for update;

  if school_id is null then
    raise exception 'organization_not_found';
  end if;
  if school_type <> 'school' then
    raise exception 'not_a_school';
  end if;
  if exists (
    select 1
    from public.organizations child
    where child.parent_org_id = school_id
  ) then
    raise exception 'school_has_child_organizations';
  end if;

  select coalesce(array_agg(c.id), '{}'::uuid[])
  into competition_ids
  from public.competitions c
  where c.org_id = school_id;

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

  insert into public.admin_audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    actor,
    'delete_school',
    'organization',
    school_id,
    jsonb_build_object(
      'name', school_name,
      'slug', school_slug,
      'parent_org_id', parent_id,
      'competitions_deleted', competitions_deleted
    )
  );

  delete from public.organizations
  where id = school_id;

  return jsonb_build_object(
    'school_id', school_id,
    'name', school_name,
    'slug', school_slug,
    'parent_org_id', parent_id,
    'competitions_deleted', competitions_deleted
  );
end;
$$;

revoke execute on function public.admin_delete_school(uuid)
  from public, anon;
grant execute on function public.admin_delete_school(uuid)
  to authenticated;

comment on function public.admin_delete_school(uuid) is
  'Permanently deletes a school and its hosted competitions for a founder super-admin, including schools that are not under a district.';
