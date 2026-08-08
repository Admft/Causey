-- Separate read-only assistant-coach access from tournament/roster authority.
-- Run after 0034_bulk_district_school_verification.sql.

-- is_org_staff remains the broad "may enter staff workspace / read roster"
-- helper. is_org_coach is the narrower operator boundary used by mutations.
create or replace function public.is_org_coach(
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
      and m.role in ('coach', 'admin', 'school_admin', 'district_admin')
  );
$$;

revoke execute on function public.is_org_coach(uuid, uuid)
  from public, anon;
grant execute on function public.is_org_coach(uuid, uuid)
  to authenticated;

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
          and public.is_org_coach(c.org_id, p_profile_id)
        )
      )
  );
$$;

drop policy if exists "competitions_insert_coach" on public.competitions;
create policy "competitions_insert_coach"
  on public.competitions for insert
  with check (
    created_by = auth.uid()
    and source = 'organizer'
    and (
      (
        org_id is null
        and public.is_unlocked_coach(auth.uid())
      )
      or (
        org_id is not null
        and public.is_org_coach(org_id, auth.uid())
      )
    )
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
        and public.is_org_coach(org_id, auth.uid())
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
            and public.is_org_coach(c.org_id, auth.uid())
          )
          or public.is_platform_admin()
        )
    )
  );

drop policy if exists "announcements_insert_staff"
  on public.org_announcements;
create policy "announcements_insert_staff"
  on public.org_announcements for insert
  with check (
    created_by = auth.uid()
    and public.is_org_coach(org_id, auth.uid())
  );

drop policy if exists "announcements_update_staff"
  on public.org_announcements;
create policy "announcements_update_staff"
  on public.org_announcements for update
  using (public.is_org_coach(org_id, auth.uid()))
  with check (public.is_org_coach(org_id, auth.uid()));

comment on function public.is_org_staff(uuid, uuid) is
  'Broad staff workspace access, including read-only assistant coaches.';
comment on function public.is_org_coach(uuid, uuid) is
  'Organization operator authority. Excludes assistant coaches; owners, coaches, and administrators may mutate roster and tournament operations.';
