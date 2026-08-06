-- Let platform admins save tournament drafts and upload covers for any org.

drop policy if exists "tournament_drafts_select_coach" on public.tournament_drafts;
create policy "tournament_drafts_select_coach"
  on public.tournament_drafts for select
  using (
    public.is_org_coach(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "tournament_drafts_insert_coach" on public.tournament_drafts;
create policy "tournament_drafts_insert_coach"
  on public.tournament_drafts for insert
  with check (
    created_by = auth.uid()
    and (
      public.is_org_coach(org_id, auth.uid())
      or public.is_platform_admin()
    )
  );

drop policy if exists "tournament_drafts_update_coach" on public.tournament_drafts;
create policy "tournament_drafts_update_coach"
  on public.tournament_drafts for update
  using (
    public.is_org_coach(org_id, auth.uid())
    or public.is_platform_admin()
  )
  with check (
    public.is_org_coach(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "tournament_drafts_delete_coach" on public.tournament_drafts;
create policy "tournament_drafts_delete_coach"
  on public.tournament_drafts for delete
  using (
    public.is_org_coach(org_id, auth.uid())
    or public.is_platform_admin()
  );

drop policy if exists "tournament_covers_insert_coach" on storage.objects;
create policy "tournament_covers_insert_coach"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) = 2
    and (
      public.is_org_coach(
        ((storage.foldername(name))[1])::uuid,
        auth.uid()
      )
      or public.is_platform_admin()
    )
  );

drop policy if exists "tournament_covers_update_coach" on storage.objects;
create policy "tournament_covers_update_coach"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) = 2
    and (
      public.is_org_coach(
        ((storage.foldername(name))[1])::uuid,
        auth.uid()
      )
      or public.is_platform_admin()
    )
  )
  with check (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) = 2
    and (
      public.is_org_coach(
        ((storage.foldername(name))[1])::uuid,
        auth.uid()
      )
      or public.is_platform_admin()
    )
  );

drop policy if exists "tournament_covers_delete_coach" on storage.objects;
create policy "tournament_covers_delete_coach"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) >= 1
    and (
      public.is_org_coach(
        ((storage.foldername(name))[1])::uuid,
        auth.uid()
      )
      or public.is_platform_admin()
    )
  );
