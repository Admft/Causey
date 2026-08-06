-- Ensure tournament cover storage exists (0017 table may have applied without
-- the bucket). Also let coaches upload into an org/draft folder before the
-- draft row is confirmed, then RLS on tournament_drafts still gates saves.

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'tournament-covers',
  'tournament-covers',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "tournament_covers_read" on storage.objects;
create policy "tournament_covers_read"
  on storage.objects for select
  using (bucket_id = 'tournament-covers');

-- Path shape: {org_id}/{draft_id}/{filename}
-- Require coach-of-org only so the first cover upload can succeed right after
-- the client creates a draft id (before/while the draft row upsert lands).
drop policy if exists "tournament_covers_insert_coach" on storage.objects;
create policy "tournament_covers_insert_coach"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) = 2
    and public.is_org_coach(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

drop policy if exists "tournament_covers_update_coach" on storage.objects;
create policy "tournament_covers_update_coach"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) = 2
    and public.is_org_coach(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  )
  with check (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) = 2
    and public.is_org_coach(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );

drop policy if exists "tournament_covers_delete_coach" on storage.objects;
create policy "tournament_covers_delete_coach"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'tournament-covers'
    and array_length(storage.foldername(name), 1) >= 1
    and public.is_org_coach(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );
