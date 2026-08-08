-- 0037 stopped anon from calling can_view_competition, but unpublished-manager
-- SELECT policies still applied to every role and referenced is_org_staff /
-- is_org_coach. Postgres checks EXECUTE at plan time, so public chess search
-- 500s the same way. Scope those policies to authenticated.

grant execute on function public.is_org_staff(uuid, uuid) to authenticated;
grant execute on function public.is_org_coach(uuid, uuid) to authenticated;
grant execute on function public.is_org_admin(uuid, uuid) to authenticated;
grant execute on function public.is_district_admin(uuid, uuid) to authenticated;
grant execute on function public.can_administer_org(uuid, uuid) to authenticated;
grant execute on function public.can_view_competition(uuid, uuid) to authenticated;
grant execute on function public.is_platform_admin() to authenticated;

drop policy if exists "competitions_select_unpublished_manager"
  on public.competitions;
create policy "competitions_select_unpublished_manager"
  on public.competitions for select
  to authenticated
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
  to authenticated
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
