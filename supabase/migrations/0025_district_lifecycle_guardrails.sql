-- District lifecycle guardrails.
-- Districts are platform-provisioned tenants; students belong to schools,
-- clubs, or teams rather than directly to a district.

drop policy if exists "orgs_insert_coach_or_platform_admin"
  on public.organizations;
create policy "orgs_insert_coach_or_platform_admin"
  on public.organizations for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and (
      public.is_platform_admin()
      or (
        public.is_unlocked_coach(auth.uid())
        and type <> 'district'
      )
    )
  );

create or replace function public.guard_organization_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.type is distinct from new.type
    or old.parent_org_id is distinct from new.parent_org_id
  ) and not public.is_platform_admin() then
    raise exception 'organization_governance_fields_locked';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_guard_governance
  on public.organizations;
create trigger organizations_guard_governance
  before update of type, parent_org_id on public.organizations
  for each row execute function public.guard_organization_governance();

create or replace function public.guard_membership_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_type text;
begin
  select type into target_type
  from public.organizations
  where id = new.org_id;

  if target_type = 'district'
     and new.role in ('student', 'school_admin') then
    raise exception 'district_membership_role_not_allowed';
  end if;
  if target_type <> 'district'
     and new.role = 'district_admin' then
    raise exception 'district_admin_requires_district';
  end if;
  return new;
end;
$$;

drop trigger if exists org_memberships_guard_scope
  on public.org_memberships;
create trigger org_memberships_guard_scope
  before insert or update of org_id, role on public.org_memberships
  for each row execute function public.guard_membership_scope();

create or replace function public.guard_org_invitation_scope()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_type text;
begin
  select type into target_type
  from public.organizations
  where id = new.org_id;

  if target_type = 'district'
     and new.role in ('student', 'school_admin') then
    raise exception 'district_invitation_role_not_allowed';
  end if;
  if target_type <> 'district'
     and new.role = 'district_admin' then
    raise exception 'district_admin_requires_district';
  end if;
  return new;
end;
$$;

drop trigger if exists org_invitations_guard_scope
  on public.org_invitations;
create trigger org_invitations_guard_scope
  before insert or update of org_id, role on public.org_invitations
  for each row execute function public.guard_org_invitation_scope();

create or replace function public.get_org_preview_by_code(p_code text)
returns table (id uuid, name text, type text, state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(
    regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')
  );
begin
  perform pg_sleep(0.15);
  return query
    select o.id, o.name, o.type, o.state
    from public.organizations o
    where o.join_code = normalized
      and o.type <> 'district';
end;
$$;

create or replace function public.join_org_with_code(p_code text)
returns table (org_id uuid, org_slug text, org_name text)
language plpgsql
security definer
set search_path = public
as $$
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
  select o.id, o.slug, o.name into target
  from public.organizations o
  where o.join_code = normalized
    and o.type <> 'district';
  if target is null then
    raise exception 'invalid_code';
  end if;
  insert into public.org_memberships (org_id, profile_id, role, status)
  values (target.id, auth.uid(), 'student', 'active')
  on conflict (org_id, profile_id) do update set status = 'active';
  return query select target.id, target.slug, target.name;
end;
$$;

revoke execute on function public.guard_organization_governance()
  from public, anon, authenticated;
revoke execute on function public.guard_membership_scope()
  from public, anon, authenticated;
revoke execute on function public.guard_org_invitation_scope()
  from public, anon, authenticated;
revoke execute on function public.get_org_preview_by_code(text)
  from public;
grant execute on function public.get_org_preview_by_code(text)
  to anon, authenticated;
