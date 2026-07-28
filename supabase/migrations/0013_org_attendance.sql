-- Org attendance on events: a coach marks any public tournament as "our
-- school is going", which lets them invite their roster to it and shows the
-- event on the org page. Run after 0012. Idempotent — but note this file
-- REPLACES the competition_entrants policies and get_event_attendance from
-- 0012, so if you ever re-run 0012, re-run this file after it.

create table if not exists public.org_competition_attendance (
  org_id uuid not null references public.organizations (id) on delete cascade,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (org_id, competition_id)
);

create index if not exists org_attendance_competition_idx
  on public.org_competition_attendance (competition_id);

alter table public.org_competition_attendance enable row level security;

drop policy if exists "attendance_select_member" on public.org_competition_attendance;
create policy "attendance_select_member"
  on public.org_competition_attendance for select
  using (
    public.is_active_member(org_id, auth.uid())
    or public.is_org_coach(org_id, auth.uid())
    or public.is_parent_of_org_member(org_id, auth.uid())
  );

drop policy if exists "attendance_insert_coach" on public.org_competition_attendance;
create policy "attendance_insert_coach"
  on public.org_competition_attendance for insert
  with check (
    public.is_org_coach(org_id, auth.uid())
    -- The event must be published and readable by this coach (RLS applies
    -- to the subquery, so an invisible private event can't be attached).
    and exists (
      select 1 from public.competitions c
      where c.id = org_competition_attendance.competition_id
        and c.status = 'published'
    )
  );

drop policy if exists "attendance_delete_coach" on public.org_competition_attendance;
create policy "attendance_delete_coach"
  on public.org_competition_attendance for delete
  using (public.is_org_coach(org_id, auth.uid()));

-- Invite right: coach of an org that HOSTS or ATTENDS the event may invite
-- (and manage the entrant rows of) that same org's active members.
create or replace function public.can_invite_to_competition(
  p_competition_id uuid,
  p_entrant_id uuid,
  p_inviter_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from organizations o
    where public.is_org_coach(o.id, p_inviter_id)
      and public.is_active_member(o.id, p_entrant_id)
      and (
        exists (
          select 1 from competitions c
          where c.id = p_competition_id and c.org_id = o.id
        )
        or exists (
          select 1 from org_competition_attendance a
          where a.org_id = o.id and a.competition_id = p_competition_id
        )
      )
  );
$$;

-- Rebuild entrant policies on the wider right (replaces 0012 versions).
drop policy if exists "entrants_select_self_parent_manager" on public.competition_entrants;
create policy "entrants_select_self_parent_manager"
  on public.competition_entrants for select
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(competition_id, profile_id, auth.uid())
  );

drop policy if exists "entrants_insert_manager" on public.competition_entrants;
create policy "entrants_insert_manager"
  on public.competition_entrants for insert
  with check (
    invited_by = auth.uid()
    and public.can_invite_to_competition(competition_id, profile_id, auth.uid())
  );

drop policy if exists "entrants_update_self_parent_manager" on public.competition_entrants;
create policy "entrants_update_self_parent_manager"
  on public.competition_entrants for update
  using (
    profile_id = auth.uid()
    or public.is_parent_of(auth.uid(), profile_id)
    or public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(competition_id, profile_id, auth.uid())
  )
  with check (
    (
      profile_id = auth.uid()
      or public.is_parent_of(auth.uid(), profile_id)
      or public.can_manage_competition(competition_id, auth.uid())
      or public.can_invite_to_competition(competition_id, profile_id, auth.uid())
    )
    and (responded_by is null or responded_by = auth.uid())
  );

drop policy if exists "entrants_delete_manager" on public.competition_entrants;
create policy "entrants_delete_manager"
  on public.competition_entrants for delete
  using (
    public.can_manage_competition(competition_id, auth.uid())
    or public.can_invite_to_competition(competition_id, profile_id, auth.uid())
  );

-- get_event_attendance v2 (replaces 0012 version): also callable by coaches
-- of attending orgs, who see only their own org's entrants. member_status is
-- 'active' when the entrant is an active member of the hosting org OR any
-- attending org (attended public events have no hosting org).
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
     or not (
       public.can_manage_competition(p_competition_id, auth.uid())
       or exists (
         select 1 from org_competition_attendance a
         where a.competition_id = p_competition_id
           and public.is_org_coach(a.org_id, auth.uid())
       )
     ) then
    raise exception 'not_authorized';
  end if;
  return query
    select e.profile_id, p.display_name, e.status, e.responded_at,
      case when exists (
        select 1 from org_memberships m
        join competitions c on c.id = e.competition_id
        where m.profile_id = e.profile_id
          and m.status = 'active'
          and (
            m.org_id = c.org_id
            or m.org_id in (
              select a.org_id from org_competition_attendance a
              where a.competition_id = e.competition_id
            )
          )
      ) then 'active' else 'removed' end
    from competition_entrants e
    join profiles p on p.id = e.profile_id
    where e.competition_id = p_competition_id
      and (
        public.can_manage_competition(p_competition_id, auth.uid())
        or public.can_invite_to_competition(p_competition_id, e.profile_id, auth.uid())
      )
    order by lower(p.display_name);
end;
$$;

revoke execute on function public.get_event_attendance(uuid) from public, anon;
grant execute on function public.get_event_attendance(uuid) to authenticated;
