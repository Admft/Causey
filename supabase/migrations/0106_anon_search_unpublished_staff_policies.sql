-- Public directory search uses the anon key. The unpublished-manager SELECT
-- policies on competitions/sections still applied to every role and named
-- is_org_coach. Postgres checks EXECUTE at plan time, so unsigned
-- /api/competitions 500s with "permission denied for function is_org_coach"
-- while a signed-in session on the same host still works.
--
-- 0038/0041 already scoped these policies; the live database still had the
-- pre-0038 PUBLIC versions. Recreate them for authenticated only, using the
-- current operator helpers rather than is_org_coach.

drop policy if exists "competitions_select_unpublished_manager"
  on public.competitions;
create policy "competitions_select_unpublished_manager"
  on public.competitions for select
  to authenticated
  using (
    status <> 'published'
    and (
      (org_id is null and created_by = auth.uid())
      or (
        org_id is not null
        and public.can_operate_org_competitions(org_id, auth.uid())
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
          (c.org_id is null and c.created_by = auth.uid())
          or (
            c.org_id is not null
            and public.can_operate_org_competitions(c.org_id, auth.uid())
          )
          or public.is_platform_admin()
        )
    )
  );
