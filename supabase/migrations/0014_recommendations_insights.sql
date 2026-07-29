-- Event recommendations between connected accounts + event-page insights
-- (community difficulty average, "going from your club").
-- Run after 0013_org_attendance.sql. Idempotent — safe to re-run.

-- ---------------------------------------------------------------------------
-- 1. Connections. Two accounts are connected when they share an active
--    household link or an active org (coach creators count even without a
--    membership row). This is the only relationship recommendations flow on.
-- ---------------------------------------------------------------------------
create or replace function public.are_connected(p_a uuid, p_b uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select p_a is not null and p_b is not null and p_a <> p_b and (
    public.is_parent_of(p_a, p_b)
    or public.is_parent_of(p_b, p_a)
    or exists (
      select 1 from org_memberships ma
      join org_memberships mb on mb.org_id = ma.org_id
      where ma.profile_id = p_a and ma.status = 'active'
        and mb.profile_id = p_b and mb.status = 'active'
    )
    or exists (
      select 1 from organizations o
      join org_memberships m on m.org_id = o.id
      where o.created_by = p_a and m.profile_id = p_b and m.status = 'active'
    )
    or exists (
      select 1 from organizations o
      join org_memberships m on m.org_id = o.id
      where o.created_by = p_b and m.profile_id = p_a and m.status = 'active'
    )
  );
$$;

-- Display names for connected accounts only (no other profile columns).
create or replace function public.get_connected_names(p_ids uuid[])
returns table (profile_id uuid, display_name text)
language sql stable security definer set search_path = public
as $$
  select p.id, p.display_name
  from profiles p
  where p.id = any(p_ids)
    and public.are_connected(auth.uid(), p.id);
$$;

revoke execute on function public.get_connected_names(uuid[]) from public, anon;
grant execute on function public.get_connected_names(uuid[]) to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Recommendations.
-- ---------------------------------------------------------------------------
create table if not exists public.event_recommendations (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  from_profile_id uuid not null references public.profiles (id) on delete cascade,
  to_profile_id uuid not null references public.profiles (id) on delete cascade,
  note text check (note is null or char_length(note) <= 280),
  status text not null default 'sent' check (status in ('sent', 'dismissed')),
  created_at timestamptz not null default now(),
  unique (competition_id, from_profile_id, to_profile_id),
  check (from_profile_id <> to_profile_id)
);

create index if not exists event_recommendations_to_idx
  on public.event_recommendations (to_profile_id, status);

alter table public.event_recommendations enable row level security;

drop policy if exists "recs_select_participants" on public.event_recommendations;
create policy "recs_select_participants"
  on public.event_recommendations for select
  using (from_profile_id = auth.uid() or to_profile_id = auth.uid());

-- Sender must be connected to the recipient AND able to see the event
-- (the competitions subquery runs under the sender's RLS).
drop policy if exists "recs_insert_connected" on public.event_recommendations;
create policy "recs_insert_connected"
  on public.event_recommendations for insert
  with check (
    from_profile_id = auth.uid()
    and public.are_connected(auth.uid(), to_profile_id)
    and exists (
      select 1 from public.competitions c
      where c.id = event_recommendations.competition_id
        and c.status = 'published'
    )
  );

drop policy if exists "recs_update_recipient" on public.event_recommendations;
create policy "recs_update_recipient"
  on public.event_recommendations for update
  using (to_profile_id = auth.uid())
  with check (to_profile_id = auth.uid());

drop policy if exists "recs_delete_sender" on public.event_recommendations;
create policy "recs_delete_sender"
  on public.event_recommendations for delete
  using (from_profile_id = auth.uid());

-- Recipients may only flip status (dismiss), nothing else.
revoke update on public.event_recommendations from anon, authenticated;
grant update (status) on public.event_recommendations to authenticated;

-- ---------------------------------------------------------------------------
-- 3. Community difficulty: aggregate of 1–10 ratings. Aggregate only — no
--    per-user rows leak — so it's safe for anonymous event pages too.
-- ---------------------------------------------------------------------------
create or replace function public.get_rating_summary(p_competition_id uuid)
returns table (avg_score numeric, rating_count int)
language sql stable security definer set search_path = public
as $$
  select round(avg(score)::numeric, 1), count(*)::int
  from competition_ratings
  where competition_id = p_competition_id;
$$;

grant execute on function public.get_rating_summary(uuid) to anon, authenticated;

-- ---------------------------------------------------------------------------
-- 4. "Going from your club": teammates (same active org as the caller) who
--    RSVP'd going. Display names only.
-- ---------------------------------------------------------------------------
create or replace function public.get_club_going(p_competition_id uuid)
returns table (org_id uuid, org_name text, profile_id uuid, display_name text)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null then
    return;
  end if;
  return query
    select distinct m.org_id, o.name, e.profile_id, p.display_name
    from competition_entrants e
    join org_memberships m
      on m.profile_id = e.profile_id and m.status = 'active'
    join org_memberships me
      on me.org_id = m.org_id
     and me.profile_id = auth.uid()
     and me.status = 'active'
    join organizations o on o.id = m.org_id
    join profiles p on p.id = e.profile_id
    where e.competition_id = p_competition_id
      and e.status = 'going'
      and e.profile_id <> auth.uid();  -- your own RSVP has its own panel
end;
$$;

revoke execute on function public.get_club_going(uuid) from public, anon;
grant execute on function public.get_club_going(uuid) to authenticated;
