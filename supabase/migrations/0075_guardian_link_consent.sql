-- Guardian linking: end the silence without weakening student consent.
-- Run after 0074_district_provisioning_codes.sql.
--
-- Before this migration a parent link request was invisible to everyone: the
-- student was never told a request existed, the parent was never told it was
-- accepted, and a student could not ask their own parent at all. Consent is
-- unchanged -- whoever did NOT open the request is still the only one who can
-- activate it. Only the direction is now allowed to run both ways.

-- ---------------------------------------------------------------------------
-- 1. Record who opened the request, so the other side is the one who consents.
-- ---------------------------------------------------------------------------
alter table public.household_links
  add column if not exists requested_by uuid
    references public.profiles (id) on delete set null;

-- request_child_link was the only writer, so every existing row was opened by
-- the parent and the student remains the consenting party.
update public.household_links
set requested_by = parent_profile_id
where requested_by is null;

comment on column public.household_links.requested_by is
  'Participant who opened the request. Never the participant who may activate it.';

create or replace function public.guard_household_link_request()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  -- household_insert_parent still permits a direct client insert, so the
  -- initiator is stamped here rather than trusted from the payload.
  if auth.uid() is not null then
    new.requested_by := auth.uid();
  elsif new.requested_by is null then
    raise exception 'household_link_requester_required';
  end if;

  if new.requested_by <> new.parent_profile_id
     and new.requested_by <> new.child_profile_id then
    raise exception 'household_link_requester_not_a_participant';
  end if;
  if new.status <> 'pending' then
    raise exception 'household_link_must_start_pending';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_household_link_request()
  from public, anon, authenticated;

drop trigger if exists household_links_guard_request on public.household_links;
create trigger household_links_guard_request
  before insert on public.household_links
  for each row execute function public.guard_household_link_request();

-- Either participant may end a link. Only the participant who did not open
-- the request may activate it.
drop policy if exists "household_update_participants" on public.household_links;
create policy "household_update_participants"
  on public.household_links for update
  using (parent_profile_id = auth.uid() or child_profile_id = auth.uid())
  with check (
    (
      (parent_profile_id = auth.uid() or child_profile_id = auth.uid())
      and status = 'revoked'
    )
    or (
      status = 'active'
      and (parent_profile_id = auth.uid() or child_profile_id = auth.uid())
      and requested_by is distinct from auth.uid()
    )
  );

-- A parent still cannot confirm a student exists by asking. A student who
-- opens the request is disclosing their own name to the parent they chose,
-- so that direction becomes visible before acceptance.
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
        and (
          h.status = 'active'
          or (h.status = 'pending' and h.requested_by = h.child_profile_id)
        )
      )
    )
  );

-- ---------------------------------------------------------------------------
-- 2. Household alerts.
-- Written here rather than through create_in_app_notification: that function
-- authorizes 'account' notifications only when the recipient is the actor, and
-- every household alert is addressed to the other participant. Preferences do
-- not apply -- 'account' is always-on, because consent is not marketing.
-- Delete-then-insert keeps exactly one live alert per direction, so repeating
-- a request refreshes it instead of stacking copies.
-- ---------------------------------------------------------------------------
create or replace function public.notify_household_link(
  p_recipient_id uuid,
  p_title text,
  p_body text,
  p_href text,
  p_dedupe_key text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  delete from public.notifications
  where recipient_id = p_recipient_id
    and dedupe_key = p_dedupe_key;

  insert into public.notifications (
    recipient_id, kind, title, body, href, entity_type, entity_id, dedupe_key
  )
  values (
    p_recipient_id,
    'account',
    p_title,
    p_body,
    p_href,
    'household_link',
    p_recipient_id::text,
    p_dedupe_key
  );
end;
$$;

revoke all on function public.notify_household_link(uuid, text, text, text, text)
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 3. Parent -> student request, now audible.
-- Still returns void unconditionally: the caller can never distinguish
-- "no such account" from "request created".
-- ---------------------------------------------------------------------------
create or replace function public.request_child_link(p_child_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  child_id uuid;
  parent_name text;
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

  insert into household_links (
    parent_profile_id, child_profile_id, status, requested_by
  )
  values (auth.uid(), child_id, 'pending', auth.uid())
  on conflict (parent_profile_id, child_profile_id)
    do update set status = 'pending', requested_by = auth.uid()
    where household_links.status = 'revoked';

  -- Only alert when a pending request actually stands, so an already-active
  -- link or a no-op re-request does not ping the student.
  if not exists (
    select 1
    from household_links h
    where h.parent_profile_id = auth.uid()
      and h.child_profile_id = child_id
      and h.status = 'pending'
  ) then
    return;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), 'A parent')
  into parent_name
  from profiles p
  where p.id = auth.uid();

  perform public.notify_household_link(
    child_id,
    parent_name || ' asked to link as your parent',
    'They can see your invitations, RSVPs, and results once you accept. '
      || 'Nothing is shared until you approve, and you can unlink later.',
    '/me#family',
    'household:request:' || auth.uid()::text || ':' || child_id::text
  );
end;
$$;

revoke all on function public.request_child_link(text) from public, anon;
grant execute on function public.request_child_link(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Student -> parent request. Same anti-enumeration contract.
-- ---------------------------------------------------------------------------
create or replace function public.request_guardian_link(p_parent_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid;
  child_name text;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1 from profiles p where p.id = auth.uid() and p.role = 'student'
  ) then
    raise exception 'not_a_student';
  end if;
  perform pg_sleep(0.15);

  select u.id into parent_id
  from auth.users u
  join profiles p on p.id = u.id
  where lower(u.email) = lower(trim(coalesce(p_parent_email, '')))
    and p.role = 'parent';
  if parent_id is null or parent_id = auth.uid() then
    return;
  end if;

  insert into household_links (
    parent_profile_id, child_profile_id, status, requested_by
  )
  values (parent_id, auth.uid(), 'pending', auth.uid())
  on conflict (parent_profile_id, child_profile_id)
    do update set status = 'pending', requested_by = auth.uid()
    where household_links.status = 'revoked';

  if not exists (
    select 1
    from household_links h
    where h.parent_profile_id = parent_id
      and h.child_profile_id = auth.uid()
      and h.status = 'pending'
  ) then
    return;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), 'A student')
  into child_name
  from profiles p
  where p.id = auth.uid();

  perform public.notify_household_link(
    parent_id,
    child_name || ' asked you to be their parent on Causey',
    'Accept to see their invitations, RSVPs, and results, and to answer for '
      || 'them. Decline if you do not recognize this student.',
    '/family#requests',
    'household:request:' || auth.uid()::text || ':' || parent_id::text
  );
end;
$$;

revoke all on function public.request_guardian_link(text) from public, anon;
grant execute on function public.request_guardian_link(text) to authenticated;

-- ---------------------------------------------------------------------------
-- 5. One response path for both directions, so acceptance is audible.
-- ---------------------------------------------------------------------------
create or replace function public.respond_to_household_link(
  p_counterparty_id uuid,
  p_accept boolean
)
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  target public.household_links%rowtype;
  responder_name text;
  new_status text;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into target
  from public.household_links h
  where (h.parent_profile_id = actor and h.child_profile_id = p_counterparty_id)
     or (h.child_profile_id = actor and h.parent_profile_id = p_counterparty_id)
  for update;

  if target.parent_profile_id is null then
    raise exception 'household_link_not_found';
  end if;

  if p_accept then
    if target.status <> 'pending' then
      raise exception 'household_link_not_pending';
    end if;
    -- The participant who opened the request can never accept it themselves.
    -- An unattributed row fails closed rather than letting either side self-accept.
    if target.requested_by is null
       or target.requested_by is not distinct from actor then
      raise exception 'household_link_requester_cannot_accept';
    end if;
    new_status := 'active';
  else
    new_status := 'revoked';
  end if;

  update public.household_links
  set status = new_status
  where parent_profile_id = target.parent_profile_id
    and child_profile_id = target.child_profile_id;

  if new_status = 'active' then
    select coalesce(nullif(btrim(p.display_name), ''), 'Your family member')
    into responder_name
    from profiles p
    where p.id = actor;

    perform public.notify_household_link(
      target.requested_by,
      responder_name || ' accepted your family link',
      case
        when target.requested_by = target.parent_profile_id then
          'You can now see their invitations, RSVPs, and results, and answer '
            || 'invitations for them.'
        else
          'They can now see your invitations, RSVPs, and results.'
      end,
      case
        when target.requested_by = target.parent_profile_id then '/family'
        else '/me#family'
      end,
      'household:accepted:' || target.parent_profile_id::text
        || ':' || target.child_profile_id::text
    );
  end if;

  return new_status;
end;
$$;

revoke all on function public.respond_to_household_link(uuid, boolean)
  from public, anon;
grant execute on function public.respond_to_household_link(uuid, boolean)
  to authenticated;

comment on function public.respond_to_household_link(uuid, boolean) is
  'Accept or end a family link from either side. Only the participant who did not open the request may accept it.';

-- ---------------------------------------------------------------------------
-- 6. Rate-limit allowlist repair.
-- The app has been sending 'comment' and 'geo' since 0062 shipped, but
-- neither was allowlisted: 'comment' raises and fails closed (blocking event
-- comments), 'geo' raises and fails open. Add both alongside 'household'.
-- ---------------------------------------------------------------------------
create or replace function public.consume_rate_limit(
  p_bucket text,
  p_actor_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  window_seconds integer := greatest(coalesce(p_window_seconds, 60), 1);
  max_hits integer := greatest(coalesce(p_max, 1), 1);
  window_ts timestamptz;
  current_count integer;
begin
  if p_bucket not in (
    'search',
    'signup',
    'join_code',
    'claim',
    'csv_import',
    'comment',
    'geo',
    'household'
  ) then
    raise exception 'invalid_rate_limit_bucket';
  end if;
  if p_actor_key is null or length(p_actor_key) < 8 or length(p_actor_key) > 200 then
    raise exception 'invalid_rate_limit_actor';
  end if;

  window_ts := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  insert into public.rate_limit_buckets as bucket
    (bucket, actor_key, window_start, hit_count)
  values (p_bucket, p_actor_key, window_ts, 1)
  on conflict (bucket, actor_key, window_start)
  do update set hit_count = bucket.hit_count + 1
  returning bucket.hit_count into current_count;

  return current_count <= max_hits;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to anon, authenticated;
