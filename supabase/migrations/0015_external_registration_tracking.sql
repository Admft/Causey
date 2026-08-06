-- Track the handoff to an organizer's registration site without claiming
-- Causey can verify payment or entry details.

create table if not exists public.external_registrations (
  user_id uuid not null references public.profiles (id) on delete cascade,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  status text not null default 'opened'
    check (status in ('opened', 'registered', 'not_registered')),
  opened_at timestamptz not null default now(),
  status_updated_at timestamptz,
  primary key (user_id, competition_id)
);

create index if not exists external_registrations_user_status_idx
  on public.external_registrations (user_id, status);

alter table public.external_registrations enable row level security;

drop policy if exists "external_registrations_select_own"
  on public.external_registrations;
create policy "external_registrations_select_own"
  on public.external_registrations for select
  using (user_id = auth.uid());

drop policy if exists "external_registrations_insert_own"
  on public.external_registrations;
create policy "external_registrations_insert_own"
  on public.external_registrations for insert
  with check (
    user_id = auth.uid()
    and exists (
      select 1
      from public.competitions c
      where c.id = external_registrations.competition_id
        and c.status = 'published'
        and c.reg_url is not null
    )
  );

drop policy if exists "external_registrations_update_own"
  on public.external_registrations;
create policy "external_registrations_update_own"
  on public.external_registrations for update
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

revoke update on public.external_registrations from anon, authenticated;
grant update (status, opened_at, status_updated_at)
  on public.external_registrations to authenticated;
