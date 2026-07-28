-- Groups inside orgs + tournament entrants (invite → RSVP → attendance).
-- Run after 0011_org_access.sql. Idempotent — safe to re-run.

create table if not exists public.org_groups (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  unique (org_id, name)
);

create table if not exists public.org_group_members (
  group_id uuid not null references public.org_groups (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (group_id, profile_id)
);

create table if not exists public.competition_entrants (
  competition_id uuid not null references public.competitions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'invited'
    check (status in ('invited', 'going', 'not_going')),
  invited_by uuid references public.profiles (id) on delete set null,
  responded_by uuid references public.profiles (id) on delete set null,
  responded_at timestamptz,
  created_at timestamptz not null default now(),
  primary key (competition_id, profile_id)
);

create index if not exists competition_entrants_profile_idx
  on public.competition_entrants (profile_id);

alter table public.org_groups enable row level security;
alter table public.org_group_members enable row level security;
alter table public.competition_entrants enable row level security;

-- Groups: members can see them; only coaches shape them.
drop policy if exists "groups_select_member" on public.org_groups;
create policy "groups_select_member"
  on public.org_groups for select
  using (
    public.is_active_member(org_id, auth.uid())
    or public.is_org_coach(org_id, auth.uid())
  );

drop policy if exists "groups_insert_coach" on public.org_groups;
create policy "groups_insert_coach"
  on public.org_groups for insert
  with check (public.is_org_coach(org_id, auth.uid()));

drop policy if exists "groups_update_coach" on public.org_groups;
create policy "groups_update_coach"
  on public.org_groups for update
  using (public.is_org_coach(org_id, auth.uid()))
  with check (public.is_org_coach(org_id, auth.uid()));

drop policy if exists "groups_delete_coach" on public.org_groups;
create policy "groups_delete_coach"
  on public.org_groups for delete
  using (public.is_org_coach(org_id, auth.uid()));

drop policy if exists "group_members_select_member" on public.org_group_members;
create policy "group_members_select_member"
  on public.org_group_members for select
  using (
    exists (
      select 1 from public.org_groups g
      where g.id = org_group_members.group_id
        and (
          public.is_active_member(g.org_id, auth.uid())
          or public.is_org_coach(g.org_id, auth.uid())
        )
    )
  );

-- Only active roster members can be placed in a group.
drop policy if exists "group_members_insert_coach" on public.org_group_members;
create policy "group_members_insert_coach"
  on public.org_group_members for insert
  with check (
    exists (
      select 1 from public.org_groups g
      where g.id = org_group_members.group_id
        and public.is_org_coach(g.org_id, auth.uid())
        and public.is_active_member(g.org_id, org_group_members.profile_id)
    )
  );

drop policy if exists "group_members_delete_coach" on public.org_group_members;
create policy "group_members_delete_coach"
  on public.org_group_members for delete
  using (
    exists (
      select 1 from public.org_groups g
      where g.id = org_group_members.group_id
        and public.is_org_coach(g.org_id, auth.uid())
    )
  );

-- Entrants: managers invite (org roster members only); the student or a
-- linked parent RSVPs. responded_by records who answered and can only be
-- set to yourself.
drop policy if exists "entrants_select_self_parent_manager" on public.competition_entrants;
create policy "entrants_select_self_parent_manager"
  on public.competition_entrants for select
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
  );

drop policy if exists "entrants_insert_manager" on public.competition_entrants;
create policy "entrants_insert_manager"
  on public.competition_entrants for insert
  with check (
    public.can_manage_competition(competition_id, auth.uid())
    and invited_by = auth.uid()
    and exists (
      select 1 from public.competitions c
      where c.id = competition_entrants.competition_id
        and c.org_id is not null
        and public.is_active_member(c.org_id, competition_entrants.profile_id)
    )
  );

drop policy if exists "entrants_update_self_parent_manager" on public.competition_entrants;
create policy "entrants_update_self_parent_manager"
  on public.competition_entrants for update
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
  )
  with check (
    (
      profile_id = auth.uid()
      or public.is_parent_of(auth.uid(), profile_id)
      or public.can_manage_competition(competition_id, auth.uid())
    )
    and (responded_by is null or responded_by = auth.uid())
  );

drop policy if exists "entrants_delete_manager" on public.competition_entrants;
create policy "entrants_delete_manager"
  on public.competition_entrants for delete
  using (public.can_manage_competition(competition_id, auth.uid()));

-- RSVP updates may touch only the response columns.
revoke update on public.competition_entrants from anon, authenticated;
grant update (status, responded_by, responded_at)
  on public.competition_entrants to authenticated;

-- Attendance projection for the manage page: display_name only (no student
-- PII), plus membership status so removed members can be grayed out.
create or replace function public.get_event_attendance(p_competition_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  status text,
  responded_at timestamptz,
  member_status text
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.can_manage_competition(p_competition_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;
  return query
    select e.profile_id, p.display_name, e.status, e.responded_at,
           coalesce(m.status, 'removed')
    from competition_entrants e
    join profiles p on p.id = e.profile_id
    join competitions c on c.id = e.competition_id
    left join org_memberships m
      on m.org_id = c.org_id and m.profile_id = e.profile_id
    where e.competition_id = p_competition_id
    order by lower(p.display_name);
end;
$$;

revoke execute on function public.get_event_attendance(uuid) from public, anon;
grant execute on function public.get_event_attendance(uuid) to authenticated;
