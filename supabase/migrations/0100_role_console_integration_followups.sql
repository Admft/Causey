-- Align legacy role aliases and child-school UI gates with the effective
-- district/school authority model introduced in 0097-0099.

create or replace function public.is_district_admin(
  p_district_id uuid,
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
    where organization.id = p_district_id
      and organization.type = 'district'
      and (
        organization.owner_profile_id = p_profile_id
        or exists (
          select 1
          from public.org_memberships membership
          where membership.org_id = organization.id
            and membership.profile_id = p_profile_id
            and membership.status = 'active'
            and membership.role in ('district_admin', 'admin')
        )
      )
  );
$$;

revoke all on function public.is_district_admin(uuid, uuid)
  from public, anon;
grant execute on function public.is_district_admin(uuid, uuid)
  to authenticated;

create or replace function public.is_org_coach(
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
      and not (
        organization.type = 'school'
        and public.is_district_operator_for_school(
          organization.id,
          p_profile_id
        )
      )
      and (
        organization.owner_profile_id = p_profile_id
        or exists (
          select 1
          from public.org_memberships membership
          where membership.org_id = organization.id
            and membership.profile_id = p_profile_id
            and membership.status = 'active'
            and membership.role in (
              'coach',
              'admin',
              'school_admin',
              'district_admin'
            )
        )
      )
  );
$$;

revoke all on function public.is_org_coach(uuid, uuid)
  from public, anon;
grant execute on function public.is_org_coach(uuid, uuid)
  to authenticated;

create or replace function public.can_manage_competition(
  p_competition_id uuid,
  p_profile_id uuid
)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select (
    p_profile_id = auth.uid()
    and public.is_platform_admin()
  )
  or exists (
    select 1
    from public.competitions competition
    where competition.id = p_competition_id
      and (
        (
          competition.org_id is null
          and competition.created_by = p_profile_id
        )
        or (
          competition.org_id is not null
          and public.can_operate_org_competitions(
            competition.org_id,
            p_profile_id
          )
        )
      )
  );
$$;

revoke all on function public.can_manage_competition(uuid, uuid)
  from public, anon;
grant execute on function public.can_manage_competition(uuid, uuid)
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
              public.is_local_school_admin(
                organization.id,
                p_profile_id
              )
              or exists (
                select 1
                from public.org_group_staff_assignments assignment
                join public.org_groups group_row
                  on group_row.id = assignment.group_id
                 and group_row.org_id = organization.id
                join public.org_memberships staff_membership
                  on staff_membership.org_id = organization.id
                 and staff_membership.profile_id = assignment.profile_id
                 and staff_membership.status = 'active'
                 and staff_membership.role in (
                   'coach',
                   'assistant_coach'
                 )
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
