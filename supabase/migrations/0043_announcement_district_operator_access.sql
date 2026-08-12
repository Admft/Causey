-- Align organization announcements with competition operator authority so
-- district administrators can publish for their district or child schools.

drop policy if exists "announcements_select_member"
  on public.org_announcements;
create policy "announcements_select_member"
  on public.org_announcements for select
  using (
    archived_at is null
    and (
      public.is_active_member(org_id, auth.uid())
      or public.is_parent_of_org_member(org_id, auth.uid())
      or public.is_org_staff(org_id, auth.uid())
      or public.can_operate_org_competitions(org_id, auth.uid())
      or public.is_platform_admin()
    )
  );

drop policy if exists "announcements_insert_staff"
  on public.org_announcements;
create policy "announcements_insert_staff"
  on public.org_announcements for insert
  with check (
    created_by = auth.uid()
    and public.can_operate_org_competitions(org_id, auth.uid())
  );

drop policy if exists "announcements_update_staff"
  on public.org_announcements;
create policy "announcements_update_staff"
  on public.org_announcements for update
  using (public.can_operate_org_competitions(org_id, auth.uid()))
  with check (public.can_operate_org_competitions(org_id, auth.uid()));
