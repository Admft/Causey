-- Org access: join codes, write policies, and portal RPCs.
-- Run after 0010_organizations.sql. Idempotent — safe to re-run.
--
-- Also FIXES a latent bug in 0010: memberships_select_own_org and
-- memberships_insert_admin_or_self_invite subquery org_memberships from
-- inside its own policy, which Postgres rejects at query time with
-- "infinite recursion detected in policy". All membership checks now go
-- through SECURITY DEFINER helpers (owner bypasses RLS, breaking the cycle).

-- ---------------------------------------------------------------------------
-- 1. Self-serve unlock: coach/parent portals are live, so every role
--    unlocks at signup. Backfill anyone who signed up while gated.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  dob date;
  band text;
  years int;
begin
  if chosen_role not in ('student', 'coach', 'parent') then
    chosen_role := 'student';
  end if;

  begin
    dob := nullif(new.raw_user_meta_data->>'date_of_birth', '')::date;
  exception when others then
    dob := null;
  end;

  band := nullif(new.raw_user_meta_data->>'age_band', '');
  if band is null and dob is not null then
    years := date_part('year', age(current_date, dob))::int;
    if years < 10 then
      band := 'u10';
    elsif years < 12 then
      band := 'u12';
    elsif years < 14 then
      band := 'u14';
    elsif years < 18 then
      band := 'u18';
    else
      band := '18plus';
    end if;
  end if;
  if band is not null and band not in ('u10', 'u12', 'u14', 'u18', '18plus') then
    band := null;
  end if;

  insert into public.profiles (
    id, role, display_name, date_of_birth, age_band, state, zip, interests, role_unlocked
  )
  values (
    new.id,
    chosen_role,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    dob,
    band,
    nullif(new.raw_user_meta_data->>'state', ''),
    nullif(new.raw_user_meta_data->>'zip', ''),
    case
      when new.raw_user_meta_data ? 'interests'
        then array(select jsonb_array_elements_text(new.raw_user_meta_data->'interests'))
      else array['chess']::text[]
    end,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

update public.profiles set role_unlocked = true where not role_unlocked;

comment on column public.profiles.role_unlocked is
  'All roles unlock at signup since 0011. Kept as a kill switch for abuse.';

-- ---------------------------------------------------------------------------
-- 2. SECURITY DEFINER helpers. Owned by the migration role (table owner), so
--    their queries bypass RLS — required to reference org_memberships from
--    org_memberships policies without recursion. Kept executable by anon
--    because the competitions/sections select policies (evaluated for anon
--    reads) call them.
-- ---------------------------------------------------------------------------
create or replace function public.is_active_member(p_org_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from org_memberships m
    where m.org_id = p_org_id
      and m.profile_id = p_profile_id
      and m.status = 'active'
  );
$$;

create or replace function public.is_org_coach(p_org_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from organizations o
    where o.id = p_org_id and o.created_by = p_profile_id
  )
  or exists (
    select 1 from org_memberships m
    where m.org_id = p_org_id
      and m.profile_id = p_profile_id
      and m.role in ('coach', 'admin')
      and m.status = 'active'
  );
$$;

create or replace function public.is_parent_of(p_parent_id uuid, p_child_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from household_links h
    where h.parent_profile_id = p_parent_id
      and h.child_profile_id = p_child_id
      and h.status = 'active'
  );
$$;

create or replace function public.is_parent_of_org_member(p_org_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from org_memberships m
    join household_links h on h.child_profile_id = m.profile_id
    where m.org_id = p_org_id
      and m.status = 'active'
      and h.parent_profile_id = p_profile_id
      and h.status = 'active'
  );
$$;

create or replace function public.can_manage_competition(p_competition_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from competitions c
    where c.id = p_competition_id
      and (
        c.created_by = p_profile_id
        or (c.org_id is not null and public.is_org_coach(c.org_id, p_profile_id))
      )
  );
$$;

create or replace function public.is_unlocked_coach(p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = p_profile_id and p.role = 'coach' and p.role_unlocked
  );
$$;

-- ---------------------------------------------------------------------------
-- 3. org_memberships policies, rebuilt on the helpers.
--    Self-updates exclude removed rows so a removed member can't reactivate
--    themselves — rejoining requires the (rotatable) join code.
-- ---------------------------------------------------------------------------
drop policy if exists "memberships_select_own_org" on public.org_memberships;
drop policy if exists "memberships_select_own_or_member" on public.org_memberships;
create policy "memberships_select_own_or_member"
  on public.org_memberships for select
  using (
    profile_id = auth.uid()
    or public.is_active_member(org_id, auth.uid())
    or public.is_org_coach(org_id, auth.uid())
    or public.is_parent_of(auth.uid(), profile_id)
  );

drop policy if exists "memberships_insert_admin_or_self_invite" on public.org_memberships;
drop policy if exists "memberships_insert_coach" on public.org_memberships;
create policy "memberships_insert_coach"
  on public.org_memberships for insert
  with check (public.is_org_coach(org_id, auth.uid()));

drop policy if exists "memberships_update_self_or_coach" on public.org_memberships;
create policy "memberships_update_self_or_coach"
  on public.org_memberships for update
  using (
    (profile_id = auth.uid() and status <> 'removed')
    or public.is_org_coach(org_id, auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or public.is_org_coach(org_id, auth.uid())
  );

drop policy if exists "memberships_delete_coach" on public.org_memberships;
create policy "memberships_delete_coach"
  on public.org_memberships for delete
  using (public.is_org_coach(org_id, auth.uid()));

-- Status is the only column members may change (blocks role self-elevation).
revoke update on public.org_memberships from anon, authenticated;
grant update (status) on public.org_memberships to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Join codes. Alphabet drops vowels (no accidental words) and 0/O/1/I/L
--    lookalikes; 28^8 ≈ 3.8e11 keyspace. Codes are shareable by design —
--    the coach's remedy for a leaked code is rotation.
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists join_code text unique;
alter table public.organizations
  add column if not exists join_code_rotated_at timestamptz;

create or replace function public.generate_join_code()
returns text
language sql volatile
as $$
  select string_agg(
    substr('BCDFGHJKMNPQRSTVWXYZ23456789', 1 + floor(random() * 28)::int, 1),
    ''
  )
  from generate_series(1, 8);
$$;

-- SECURITY DEFINER so the uniqueness probe sees every org, not just the
-- inserter's RLS-visible rows.
create or replace function public.set_org_join_code()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  attempt int := 0;
begin
  if new.join_code is not null then
    return new;
  end if;
  loop
    attempt := attempt + 1;
    new.join_code := public.generate_join_code();
    exit when not exists (
      select 1 from organizations o where o.join_code = new.join_code
    );
    if attempt >= 5 then
      raise exception 'could not generate a unique join code';
    end if;
  end loop;
  return new;
end;
$$;

drop trigger if exists organizations_join_code on public.organizations;
create trigger organizations_join_code
  before insert on public.organizations
  for each row execute function public.set_org_join_code();

-- Backfill any org created before this migration.
do $$
declare
  target uuid;
  code text;
begin
  for target in select id from public.organizations where join_code is null loop
    loop
      code := public.generate_join_code();
      exit when not exists (select 1 from public.organizations where join_code = code);
    end loop;
    update public.organizations set join_code = code where id = target;
  end loop;
end $$;

-- ---------------------------------------------------------------------------
-- 5. Organizations policies, rebuilt on the helpers (+ parents can see the
--    orgs their child belongs to, for the family portal).
-- ---------------------------------------------------------------------------
drop policy if exists "orgs_select_member_or_public_name" on public.organizations;
drop policy if exists "orgs_select_member_creator_or_parent" on public.organizations;
create policy "orgs_select_member_creator_or_parent"
  on public.organizations for select
  using (
    created_by = auth.uid()
    or public.is_active_member(id, auth.uid())
    or public.is_parent_of_org_member(id, auth.uid())
  );

drop policy if exists "orgs_update_admin" on public.organizations;
drop policy if exists "orgs_update_coach" on public.organizations;
create policy "orgs_update_coach"
  on public.organizations for update
  using (public.is_org_coach(id, auth.uid()))
  with check (public.is_org_coach(id, auth.uid()));

drop policy if exists "orgs_delete_creator" on public.organizations;
create policy "orgs_delete_creator"
  on public.organizations for delete
  using (created_by = auth.uid());

-- ---------------------------------------------------------------------------
-- 6. Join RPCs. SECURITY DEFINER because a non-member can't read the org row
--    to match a code under RLS. pg_sleep is a cheap online-guessing damper;
--    misses are indistinguishable from each other.
-- ---------------------------------------------------------------------------
create or replace function public.get_org_preview_by_code(p_code text)
returns table (id uuid, name text, type text, state text)
language plpgsql security definer set search_path = public
as $$
declare
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  perform pg_sleep(0.15);
  return query
    select o.id, o.name, o.type, o.state
    from organizations o
    where o.join_code = normalized;
end;
$$;

create or replace function public.join_org_with_code(p_code text)
returns table (org_id uuid, org_slug text, org_name text)
language plpgsql security definer set search_path = public
as $$
declare
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
  target record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  perform pg_sleep(0.15);
  select o.id, o.slug, o.name into target
  from organizations o
  where o.join_code = normalized;
  if target is null then
    raise exception 'invalid_code';
  end if;
  -- Re-joining after removal is allowed by design (code knowledge is the
  -- credential; rotate the code to keep someone out). Role is preserved on
  -- conflict so a coach scanning their own code isn't demoted.
  insert into org_memberships (org_id, profile_id, role, status)
  values (target.id, auth.uid(), 'student', 'active')
  on conflict (org_id, profile_id) do update set status = 'active';
  return query select target.id, target.slug, target.name;
end;
$$;

create or replace function public.rotate_join_code(p_org_id uuid)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  code text;
begin
  if auth.uid() is null or not public.is_org_coach(p_org_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;
  loop
    code := public.generate_join_code();
    exit when not exists (select 1 from organizations o where o.join_code = code);
  end loop;
  update organizations
  set join_code = code, join_code_rotated_at = now(), updated_at = now()
  where id = p_org_id;
  return code;
end;
$$;

revoke execute on function public.get_org_preview_by_code(text) from public, anon;
revoke execute on function public.join_org_with_code(text) from public, anon;
revoke execute on function public.rotate_join_code(uuid) from public, anon;
grant execute on function public.get_org_preview_by_code(text) to authenticated;
grant execute on function public.join_org_with_code(text) to authenticated;
grant execute on function public.rotate_join_code(uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- 7. Competitions/sections: organizer writes + parent visibility.
--    reg_url becomes nullable — org events can RSVP on Causey instead of
--    linking out.
-- ---------------------------------------------------------------------------
alter table public.competitions alter column reg_url drop not null;

alter table public.competitions drop constraint if exists competitions_private_needs_org;
alter table public.competitions add constraint competitions_private_needs_org
  check (visibility = 'public' or org_id is not null);

drop policy if exists "competitions_insert_coach" on public.competitions;
create policy "competitions_insert_coach"
  on public.competitions for insert
  with check (
    created_by = auth.uid()
    and source = 'organizer'
    and public.is_unlocked_coach(auth.uid())
    and (org_id is null or public.is_org_coach(org_id, auth.uid()))
  );

drop policy if exists "competitions_update_manager" on public.competitions;
create policy "competitions_update_manager"
  on public.competitions for update
  using (
    created_by = auth.uid()
    or (org_id is not null and public.is_org_coach(org_id, auth.uid()))
  )
  with check (
    created_by = auth.uid()
    or (org_id is not null and public.is_org_coach(org_id, auth.uid()))
  );

drop policy if exists "competitions_delete_creator" on public.competitions;
create policy "competitions_delete_creator"
  on public.competitions for delete
  using (created_by = auth.uid());

-- Visibility select policies gain a parent arm: a linked parent can open
-- their child's private org events.
drop policy if exists "published competitions readable by visibility" on public.competitions;
create policy "published competitions readable by visibility"
  on public.competitions for select
  using (
    status = 'published'
    and (
      visibility = 'public'
      or created_by = auth.uid()
      or (
        org_id is not null
        and (
          public.is_active_member(org_id, auth.uid())
          or public.is_org_coach(org_id, auth.uid())
          or public.is_parent_of_org_member(org_id, auth.uid())
        )
      )
    )
  );

drop policy if exists "sections of readable competitions" on public.sections;
create policy "sections of readable competitions"
  on public.sections for select
  using (
    exists (
      select 1 from public.competitions c
      where c.id = sections.competition_id
        and c.status = 'published'
        and (
          c.visibility = 'public'
          or c.created_by = auth.uid()
          or (
            c.org_id is not null
            and (
              public.is_active_member(c.org_id, auth.uid())
              or public.is_org_coach(c.org_id, auth.uid())
              or public.is_parent_of_org_member(c.org_id, auth.uid())
            )
          )
        )
    )
  );

drop policy if exists "sections_insert_manager" on public.sections;
create policy "sections_insert_manager"
  on public.sections for insert
  with check (public.can_manage_competition(competition_id, auth.uid()));

drop policy if exists "sections_update_manager" on public.sections;
create policy "sections_update_manager"
  on public.sections for update
  using (public.can_manage_competition(competition_id, auth.uid()))
  with check (public.can_manage_competition(competition_id, auth.uid()));

drop policy if exists "sections_delete_manager" on public.sections;
create policy "sections_delete_manager"
  on public.sections for delete
  using (public.can_manage_competition(competition_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 8. Household links: complete the lifecycle. Activation is child-only —
--    a parent can never flip a pending link to active themselves.
-- ---------------------------------------------------------------------------
drop policy if exists "household_update_participants" on public.household_links;
create policy "household_update_participants"
  on public.household_links for update
  using (parent_profile_id = auth.uid() or child_profile_id = auth.uid())
  with check (
    (child_profile_id = auth.uid() and status in ('active', 'revoked'))
    or (parent_profile_id = auth.uid() and status = 'revoked')
  );

drop policy if exists "household_delete_participants" on public.household_links;
create policy "household_delete_participants"
  on public.household_links for delete
  using (parent_profile_id = auth.uid() or child_profile_id = auth.uid());

revoke update on public.household_links from anon, authenticated;
grant update (status) on public.household_links to authenticated;

-- Profile reads across the link: the child sees the requesting parent's name
-- (pending or active); the parent sees the child's profile only once active,
-- so a link request never reveals whether an email matched an account.
drop policy if exists "profiles_select_household" on public.profiles;
create policy "profiles_select_household"
  on public.profiles for select
  using (
    exists (
      select 1 from public.household_links h
      where (
        h.child_profile_id = auth.uid()
        and h.parent_profile_id = profiles.id
        and h.status in ('pending', 'active')
      )
      or (
        h.parent_profile_id = auth.uid()
        and h.child_profile_id = profiles.id
        and h.status = 'active'
      )
    )
  );

-- Parent → child link request by email. Returns void unconditionally: the
-- caller can never distinguish "no such account" from "request created".
create or replace function public.request_child_link(p_child_email text)
returns void
language plpgsql security definer set search_path = public
as $$
declare
  child_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'parent'
  ) then
    raise exception 'not_a_parent';
  end if;
  perform pg_sleep(0.15);
  select u.id into child_id
  from auth.users u
  join profiles p on p.id = u.id
  where lower(u.email) = lower(trim(coalesce(p_child_email, '')))
    and p.role = 'student';
  if child_id is null or child_id = auth.uid() then
    return;
  end if;
  insert into household_links (parent_profile_id, child_profile_id, status)
  values (auth.uid(), child_id, 'pending')
  on conflict (parent_profile_id, child_profile_id)
    do update set status = 'pending'
    where household_links.status = 'revoked';
end;
$$;

revoke execute on function public.request_child_link(text) from public, anon;
grant execute on function public.request_child_link(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 9. Roster projection. RLS is row-level, not column-level: a select policy
--    would hand coaches the whole profile row (DOB, zip). This function is
--    the only roster path and returns display_name + age_band, nothing else.
-- ---------------------------------------------------------------------------
create or replace function public.get_org_roster(p_org_id uuid)
returns table (
  profile_id uuid,
  display_name text,
  age_band text,
  member_role text,
  member_status text,
  joined_at timestamptz
)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null
     or not (
       public.is_active_member(p_org_id, auth.uid())
       or public.is_org_coach(p_org_id, auth.uid())
     ) then
    raise exception 'not_authorized';
  end if;
  return query
    select m.profile_id, p.display_name, p.age_band, m.role, m.status, m.created_at
    from org_memberships m
    join profiles p on p.id = m.profile_id
    where m.org_id = p_org_id
      and m.status <> 'removed'
    order by lower(p.display_name);
end;
$$;

revoke execute on function public.get_org_roster(uuid) from public, anon;
grant execute on function public.get_org_roster(uuid) to authenticated;
