-- Ownership is authority; created_by is provenance only.
-- Run after 0027_organization_verification_workflow.sql.

update public.organizations
set owner_profile_id = created_by
where owner_profile_id is null;

create or replace function public.set_organization_initial_owner()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if new.owner_profile_id is null then
    new.owner_profile_id := new.created_by;
  end if;
  return new;
end;
$$;

drop trigger if exists set_organization_initial_owner
  on public.organizations;
create trigger set_organization_initial_owner
  before insert on public.organizations
  for each row execute function public.set_organization_initial_owner();

revoke execute on function public.set_organization_initial_owner()
  from public, anon, authenticated;

create or replace function public.is_org_staff(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organizations o
    where o.id = p_org_id
      and o.owner_profile_id = p_profile_id
  )
  or exists (
    select 1
    from org_memberships m
    where m.org_id = p_org_id
      and m.profile_id = p_profile_id
      and m.status = 'active'
      and m.role in (
        'assistant_coach', 'coach', 'admin', 'school_admin', 'district_admin'
      )
  );
$$;

create or replace function public.is_org_admin(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organizations o
    where o.id = p_org_id
      and o.owner_profile_id = p_profile_id
  )
  or exists (
    select 1
    from org_memberships m
    where m.org_id = p_org_id
      and m.profile_id = p_profile_id
      and m.status = 'active'
      and m.role in ('admin', 'school_admin', 'district_admin')
  );
$$;

create or replace function public.is_district_admin(
  p_district_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organizations o
    where o.id = p_district_id
      and o.type = 'district'
      and (
        o.owner_profile_id = p_profile_id
        or exists (
          select 1
          from org_memberships m
          where m.org_id = o.id
            and m.profile_id = p_profile_id
            and m.status = 'active'
            and m.role = 'district_admin'
        )
      )
  );
$$;

create or replace function public.can_administer_org(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_admin(p_org_id, p_profile_id)
  or exists (
    select 1
    from organizations child
    where child.id = p_org_id
      and child.parent_org_id is not null
      and public.is_district_admin(child.parent_org_id, p_profile_id)
  );
$$;

create or replace function public.is_org_coach(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_staff(p_org_id, p_profile_id);
$$;

create or replace function public.can_manage_competition(
  p_competition_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (
    p_profile_id = auth.uid()
    and public.is_platform_admin()
  )
  or exists (
    select 1
    from competitions c
    where c.id = p_competition_id
      and (
        (
          c.org_id is null
          and c.created_by = p_profile_id
        )
        or (
          c.org_id is not null
          and public.is_org_staff(c.org_id, p_profile_id)
        )
      )
  );
$$;

create or replace function public.can_view_competition(
  p_competition_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from competitions c
    left join organizations host on host.id = c.org_id
    where c.id = p_competition_id
      and c.status = 'published'
      and (
        c.audience = 'public'
        or (
          c.org_id is null
          and c.created_by = p_profile_id
        )
        or public.can_administer_org(c.org_id, p_profile_id)
        or (
          c.audience = 'school'
          and c.org_id is not null
          and (
            public.is_active_member(c.org_id, p_profile_id)
            or public.is_parent_of_org_member(c.org_id, p_profile_id)
          )
        )
        or (
          c.audience = 'district'
          and c.org_id is not null
          and (
            public.is_active_member(c.org_id, p_profile_id)
            or (
              host.parent_org_id is not null
              and public.is_active_member(host.parent_org_id, p_profile_id)
            )
            or exists (
              select 1
              from organizations school
              where school.parent_org_id = coalesce(host.parent_org_id, host.id)
                and (
                  public.is_active_member(school.id, p_profile_id)
                  or public.is_parent_of_org_member(school.id, p_profile_id)
                )
            )
          )
        )
        or (
          c.audience = 'invite_only'
          and exists (
            select 1
            from competition_entrants e
            where e.competition_id = c.id
              and (
                e.profile_id = p_profile_id
                or public.is_parent_of(p_profile_id, e.profile_id)
              )
          )
        )
      )
  );
$$;

drop policy if exists "orgs_select_member_creator_or_parent"
  on public.organizations;
create policy "orgs_select_member_owner_or_parent"
  on public.organizations for select
  using (
    owner_profile_id = auth.uid()
    or public.is_active_member(id, auth.uid())
    or public.is_parent_of_org_member(id, auth.uid())
    or (
      parent_org_id is not null
      and public.is_district_admin(parent_org_id, auth.uid())
    )
  );

drop policy if exists "orgs_delete_creator" on public.organizations;
drop policy if exists "orgs_delete_owner" on public.organizations;
create policy "orgs_delete_owner"
  on public.organizations for delete
  to authenticated
  using (
    owner_profile_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "competitions_select_unpublished_manager"
  on public.competitions;
create policy "competitions_select_unpublished_manager"
  on public.competitions for select
  using (
    status <> 'published'
    and (
      (
        org_id is null
        and created_by = auth.uid()
      )
      or (
        org_id is not null
        and public.is_org_staff(org_id, auth.uid())
      )
      or public.is_platform_admin()
    )
  );

drop policy if exists "sections_select_unpublished_manager"
  on public.sections;
create policy "sections_select_unpublished_manager"
  on public.sections for select
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = sections.competition_id
        and c.status <> 'published'
        and (
          (
            c.org_id is null
            and c.created_by = auth.uid()
          )
          or (
            c.org_id is not null
            and public.is_org_staff(c.org_id, auth.uid())
          )
          or public.is_platform_admin()
        )
    )
  );
