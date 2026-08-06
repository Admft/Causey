-- Resumable tournament drafts and organizer cover-image storage.
-- Run after 0011_org_access.sql (policies use public.is_org_coach).

create table if not exists public.tournament_drafts (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null default auth.uid()
    references public.profiles (id) on delete cascade,
  data jsonb not null default '{}'::jsonb,
  cover_image_url text,
  cover_image_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists tournament_drafts_org_updated_idx
  on public.tournament_drafts (org_id, updated_at desc);

alter table public.tournament_drafts enable row level security;

drop policy if exists "tournament_drafts_select_coach" on public.tournament_drafts;
create policy "tournament_drafts_select_coach"
  on public.tournament_drafts for select
  using (public.is_org_coach(org_id, auth.uid()));

drop policy if exists "tournament_drafts_insert_coach" on public.tournament_drafts;
create policy "tournament_drafts_insert_coach"
  on public.tournament_drafts for insert
  with check (
    created_by = auth.uid()
    and public.is_org_coach(org_id, auth.uid())
  );

drop policy if exists "tournament_drafts_update_coach" on public.tournament_drafts;
create policy "tournament_drafts_update_coach"
  on public.tournament_drafts for update
  using (public.is_org_coach(org_id, auth.uid()))
  with check (public.is_org_coach(org_id, auth.uid()));

drop policy if exists "tournament_drafts_delete_coach" on public.tournament_drafts;
create policy "tournament_drafts_delete_coach"
  on public.tournament_drafts for delete
  using (public.is_org_coach(org_id, auth.uid()));

drop trigger if exists tournament_drafts_updated_at on public.tournament_drafts;
create trigger tournament_drafts_updated_at
  before update on public.tournament_drafts
  for each row execute function public.set_updated_at();

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

drop policy if exists "tournament_covers_insert_coach" on storage.objects;
create policy "tournament_covers_insert_coach"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'tournament-covers'
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
    and public.is_org_coach(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  )
  with check (
    bucket_id = 'tournament-covers'
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
    and public.is_org_coach(
      ((storage.foldername(name))[1])::uuid,
      auth.uid()
    )
  );
