-- Batch 1 of the district-readiness audit: close the privilege-escalation
-- chain and give admin tiers an append-only trail to review.
--
-- The chain this closes: a student could set profiles.role = 'coach'
-- (0009 profiles_update_own froze nothing), 0011 already grants
-- role_unlocked = true to everyone, is_unlocked_coach then passes, and
-- lib/actions/tournaments.ts wrote status = 'published' directly. Net effect
-- was that any signed-up account could self-declare as a district and publish
-- public events. Each section below cuts one link.
--
-- Runs after 0015_platform_admins.sql, which added the platform-admin tier and
-- narrowed the profiles column grants. This migration covers what that one did
-- not: the trigger-level role freeze, join-code rejoin, draft-first events, and
-- an audit trail for ordinary (non-admin) actors. admin_audit_log stays the
-- record of what platform admins did; audit_events records security-relevant
-- actions by anyone, including coaches.
--
-- Audit refs: SEC-01 (B001), SEC-05 (B007), SEC-06 (B005), B010.
-- SEC-03 is deliberately NOT addressed here: revoking EXECUTE on the
-- SECURITY DEFINER helpers also breaks every RLS policy that calls them
-- (Postgres checks EXECUTE when evaluating policy expressions), so it needs
-- the helpers relocated to an unexposed schema and all dependent policies
-- rebuilt. That is its own migration.

-- ---------------------------------------------------------------------------
-- 1. SEC-01 / B001 — profile role is no longer self-service.
--    0015_platform_admins.sql already narrowed the column grants. That alone
--    is one stray `grant update on profiles` away from being undone, so this
--    adds the second, independent layer: a trigger that refuses the write
--    regardless of what the grants say. Both layers are verified in
--    scripts/verify-0016.sql.
-- ---------------------------------------------------------------------------
create or replace function public.guard_profile_privileged_columns()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  -- Migrations and server-side service_role work still needs to move roles.
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;
  if new.id is distinct from old.id
     or new.role is distinct from old.role
     or new.role_unlocked is distinct from old.role_unlocked then
    raise exception 'profiles: id, role and role_unlocked are not self-editable'
      using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_guard_privileged_columns on public.profiles;
create trigger profiles_guard_privileged_columns
  before update on public.profiles
  for each row execute function public.guard_profile_privileged_columns();

comment on function public.guard_profile_privileged_columns is
  'SEC-01: blocks student->coach self-elevation. Role changes belong to an audited privileged path.';

-- ---------------------------------------------------------------------------
-- 2. SEC-05 / B007 — a removed coach cannot re-enter as a coach.
--    The join code is a broadly shared student credential, so self-service
--    rejoin always returns at student level. Someone already active keeps
--    their role (a coach scanning their own code should not be demoted).
-- ---------------------------------------------------------------------------
create or replace function public.join_org_with_code(p_code text)
returns table (org_id uuid, org_slug text, org_name text)
language plpgsql security definer set search_path = public
as $$
-- Referencing the conflict target alongside the org_id OUT parameter is
-- ambiguous to plpgsql; resolve bare names to columns. The OUT parameter
-- names stay unchanged so the RPC's response shape is untouched.
#variable_conflict use_column
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
  insert into org_memberships as m (org_id, profile_id, role, status)
  values (target.id, auth.uid(), 'student', 'active')
  on conflict (org_id, profile_id) do update
    set status = 'active',
        role = case when m.status = 'removed' then 'student' else m.role end;
  return query select target.id, target.slug, target.name;
end;
$$;

revoke execute on function public.join_org_with_code(text) from public, anon;
grant execute on function public.join_org_with_code(text) to authenticated;

comment on function public.join_org_with_code is
  'SEC-05: removed members rejoin as students. Restoring staff requires re-invitation.';

-- ---------------------------------------------------------------------------
-- 3. SEC-06 / B005 — drafts must be visible to the people who own them.
--    The app now creates events as draft, and every existing select policy
--    requires status = published, so without these arms a new tournament
--    would be invisible to its own organizer.
-- ---------------------------------------------------------------------------
drop policy if exists "competitions_select_unpublished_manager" on public.competitions;
create policy "competitions_select_unpublished_manager"
  on public.competitions for select
  using (
    status <> 'published'
    and (
      created_by = auth.uid()
      or (org_id is not null and public.is_org_coach(org_id, auth.uid()))
    )
  );

drop policy if exists "sections_select_unpublished_manager" on public.sections;
create policy "sections_select_unpublished_manager"
  on public.sections for select
  using (
    exists (
      select 1 from public.competitions c
      where c.id = sections.competition_id
        and c.status <> 'published'
        and (
          c.created_by = auth.uid()
          or (c.org_id is not null and public.is_org_coach(c.org_id, auth.uid()))
        )
    )
  );

-- ---------------------------------------------------------------------------
-- 4. B010 — append-only audit trail.
--    No RLS policies are defined, so anon/authenticated cannot read it at all;
--    service_role and postgres bypass RLS and can. Updates and deletes are
--    refused for everyone, including service_role.
-- ---------------------------------------------------------------------------
create table if not exists public.audit_events (
  id bigint generated always as identity primary key,
  occurred_at timestamptz not null default now(),
  actor_id uuid,
  db_role text not null default current_user,
  action text not null,
  entity_type text not null,
  entity_id text,
  detail jsonb not null default '{}'::jsonb
);

create index if not exists audit_events_occurred_at_idx
  on public.audit_events (occurred_at desc);
create index if not exists audit_events_entity_idx
  on public.audit_events (entity_type, entity_id);

alter table public.audit_events enable row level security;
revoke all on public.audit_events from anon, authenticated;

create or replace function public.audit_events_append_only()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only', tg_table_name using errcode = '42501';
end;
$$;

drop trigger if exists audit_events_no_mutate on public.audit_events;
create trigger audit_events_no_mutate
  before update or delete on public.audit_events
  for each row execute function public.audit_events_append_only();

create or replace function public.record_audit_event()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_action text;
  v_detail jsonb := '{}'::jsonb;
  v_entity text;
begin
  if tg_table_name = 'organizations' and tg_op = 'INSERT' then
    v_action := 'organization.created';
    v_entity := new.id::text;
    v_detail := jsonb_build_object('name', new.name, 'type', new.type, 'state', new.state);

  elsif tg_table_name = 'competitions' then
    -- Ingestion writes thousands of scraped rows with org_id null; only
    -- organizer-hosted events are interesting for moderation.
    if coalesce(new.org_id, old.org_id) is null then
      return coalesce(new, old);
    end if;
    v_entity := coalesce(new.id, old.id)::text;
    if tg_op = 'INSERT' then
      v_action := 'competition.created';
      v_detail := jsonb_build_object(
        'name', new.name, 'status', new.status, 'visibility', new.visibility
      );
    elsif tg_op = 'UPDATE' and old.status is distinct from new.status then
      v_action := 'competition.status_changed';
      v_detail := jsonb_build_object(
        'from', old.status, 'to', new.status, 'visibility', new.visibility
      );
    end if;

  elsif tg_table_name = 'profiles' and tg_op = 'UPDATE' then
    if old.role is distinct from new.role
       or old.role_unlocked is distinct from new.role_unlocked then
      v_action := 'profile.role_changed';
      v_entity := new.id::text;
      v_detail := jsonb_build_object(
        'from_role', old.role, 'to_role', new.role,
        'from_unlocked', old.role_unlocked, 'to_unlocked', new.role_unlocked
      );
    end if;
  end if;

  if v_action is null then
    return coalesce(new, old);
  end if;

  insert into public.audit_events (actor_id, action, entity_type, entity_id, detail)
  values (auth.uid(), v_action, tg_table_name, v_entity, v_detail);

  return coalesce(new, old);
end;
$$;

drop trigger if exists organizations_audit on public.organizations;
create trigger organizations_audit
  after insert on public.organizations
  for each row execute function public.record_audit_event();

drop trigger if exists competitions_audit on public.competitions;
create trigger competitions_audit
  after insert or update on public.competitions
  for each row execute function public.record_audit_event();

drop trigger if exists profiles_audit on public.profiles;
create trigger profiles_audit
  after update on public.profiles
  for each row execute function public.record_audit_event();

comment on table public.audit_events is
  'B010: append-only record of organization creation, organizer event status changes, and profile role changes.';

-- admin_audit_log (0015) records platform-admin actions but was mutable, so an
-- admin could edit the record of their own action. B010 asks for append-only;
-- apply the same guard there.
drop trigger if exists admin_audit_log_no_mutate on public.admin_audit_log;
create trigger admin_audit_log_no_mutate
  before update or delete on public.admin_audit_log
  for each row execute function public.audit_events_append_only();
