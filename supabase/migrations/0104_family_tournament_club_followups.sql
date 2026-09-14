-- Family RSVP clear + household consent, tournament edit/review visibility,
-- org-less cover uploads, and student-only join codes.

-- ---------------------------------------------------------------------------
-- 1. Clearing a coach invite notifies the inviting coach after the row is
--    reset to invited (responded_by is then null).
-- ---------------------------------------------------------------------------
create or replace function public.notify_rsvp_cleared(
  p_competition_id uuid,
  p_profile_id uuid,
  p_invited_by uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  event_name text;
  event_slug text;
  prefs public.notification_preferences%rowtype;
  new_id uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_invited_by is null
     or p_invited_by = actor then
    return null;
  end if;
  if not exists (
    select 1
    from public.competition_entrants entrant
    where entrant.competition_id = p_competition_id
      and entrant.profile_id = p_profile_id
      and entrant.invited_by = p_invited_by
      and (
        actor = p_profile_id
        or public.is_parent_of(actor, p_profile_id)
      )
  ) then
    raise exception 'notification_recipient_not_authorized'
      using errcode = '42501';
  end if;

  select competition.name, competition.slug
    into event_name, event_slug
  from public.competitions competition
  where competition.id = p_competition_id;

  select *
    into prefs
  from public.notification_preferences
  where profile_id = p_invited_by;
  if found and prefs.rsvp_update is not true then
    return null;
  end if;

  insert into public.notifications (
    recipient_id,
    kind,
    title,
    body,
    href,
    entity_type,
    entity_id,
    dedupe_key
  )
  values (
    p_invited_by,
    'rsvp_update',
    'RSVP update: ' || coalesce(event_name, 'a tournament'),
    'Someone cleared their RSVP. Open the event roster to review.',
    case
      when event_slug is not null then '/event/' || event_slug || '/manage'
      else '/orgs'
    end,
    'competition',
    p_competition_id::text,
    'rsvp:' || p_competition_id::text || ':' || p_profile_id::text || ':cleared'
  )
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null
  do nothing
  returning id into new_id;

  return new_id;
end;
$$;

revoke execute on function public.notify_rsvp_cleared(uuid, uuid, uuid)
  from public, anon;
grant execute on function public.notify_rsvp_cleared(uuid, uuid, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 2. Household-created Going/Can't go rows delete regardless of which family
--    member clears them.
-- ---------------------------------------------------------------------------
drop policy if exists "entrants_delete_own_family_rsvp"
  on public.competition_entrants;
create policy "entrants_delete_own_family_rsvp"
  on public.competition_entrants for delete
  to authenticated
  using (
    status in ('going', 'not_going')
    and (
      profile_id = auth.uid()
      or public.is_parent_of(auth.uid(), profile_id)
    )
    and (
      invited_by = auth.uid()
      or invited_by = profile_id
      or public.is_parent_of(invited_by, profile_id)
    )
  );

-- ---------------------------------------------------------------------------
-- 3. Opposite-direction pending household requests become an active link
--    (both sides have now asked) instead of notifying the person who cannot
--    accept.
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
  activated uuid;
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

  update household_links
  set status = 'active'
  where parent_profile_id = auth.uid()
    and child_profile_id = child_id
    and status = 'pending'
    and requested_by = child_id
  returning child_profile_id into activated;

  if activated is not null then
    select coalesce(nullif(btrim(p.display_name), ''), 'A parent')
    into parent_name
    from profiles p
    where p.id = auth.uid();
    perform public.notify_household_link(
      child_id,
      parent_name || ' accepted your family link',
      'They can now see your invitations, RSVPs, and results.',
      '/me#family',
      'household:accepted:' || auth.uid()::text || ':' || child_id::text
    );
    return;
  end if;

  insert into household_links (
    parent_profile_id, child_profile_id, status, requested_by
  )
  values (auth.uid(), child_id, 'pending', auth.uid())
  on conflict (parent_profile_id, child_profile_id)
    do update set status = 'pending', requested_by = auth.uid()
    where household_links.status = 'revoked';

  if not exists (
    select 1
    from household_links h
    where h.parent_profile_id = auth.uid()
      and h.child_profile_id = child_id
      and h.status = 'pending'
      and h.requested_by = auth.uid()
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

create or replace function public.request_guardian_link(p_parent_email text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_id uuid;
  child_name text;
  activated uuid;
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

  update household_links
  set status = 'active'
  where parent_profile_id = parent_id
    and child_profile_id = auth.uid()
    and status = 'pending'
    and requested_by = parent_id
  returning parent_profile_id into activated;

  if activated is not null then
    select coalesce(nullif(btrim(p.display_name), ''), 'A student')
    into child_name
    from profiles p
    where p.id = auth.uid();
    perform public.notify_household_link(
      parent_id,
      child_name || ' accepted your family link',
      'You can now see their invitations, RSVPs, and results, and answer '
        || 'invitations for them.',
      '/family',
      'household:accepted:' || parent_id::text || ':' || auth.uid()::text
    );
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
      and h.requested_by = auth.uid()
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
-- 4. Join codes are student roster links.
-- ---------------------------------------------------------------------------
create or replace function public.join_org_with_code(p_code text)
returns table (org_id uuid, org_slug text, org_name text)
language plpgsql
security definer
set search_path = public
as $$
#variable_conflict use_column
declare
  normalized text := upper(
    regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')
  );
  target record;
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if not exists (
    select 1
    from public.profiles p
    where p.id = auth.uid()
      and p.role = 'student'
  ) then
    raise exception 'student_account_required';
  end if;

  perform pg_sleep(0.15);

  select o.id, o.slug, o.name
    into target
  from public.organizations o
  where o.join_code = normalized
    and o.type <> 'district';

  if target is null then
    raise exception 'invalid_code';
  end if;

  insert into public.org_memberships as membership (
    org_id,
    profile_id,
    role,
    status
  )
  values (target.id, auth.uid(), 'student', 'active')
  on conflict (org_id, profile_id) do update
    set status = 'active',
        role = case
          when membership.status = 'removed' then 'student'
          else membership.role
        end;

  return query select target.id, target.slug, target.name;
end;
$$;

revoke all on function public.join_org_with_code(text) from public, anon;
grant execute on function public.join_org_with_code(text) to authenticated;

comment on function public.join_org_with_code(text) is
  'Student accounts only. Reactivates removed join-code memberships as students; active staff keep their role.';

-- ---------------------------------------------------------------------------
-- 5. Editing an already-approved public listing does not silently unpublish.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_public_event_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'organizer'
     and coalesce(new.audience, 'public') = 'public'
     and new.status = 'published'
     and not public.is_platform_admin() then
    if tg_op = 'INSERT'
       or old.status is distinct from 'published'
       or coalesce(old.audience, 'public') is distinct from 'public' then
      new.status := 'pending_review';
      new.submitted_for_review_at :=
        coalesce(new.submitted_for_review_at, now());
      new.reviewed_at := null;
      new.reviewed_by := null;
    end if;
  end if;
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Invitees (and their parents) can open a listing while it awaits review.
-- ---------------------------------------------------------------------------
create or replace function public.can_view_competition(
  p_competition_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from competitions c
    left join organizations host on host.id = c.org_id
    where c.id = p_competition_id
      and (
        c.status = 'published'
        or (
          c.status = 'pending_review'
          and exists (
            select 1
            from competition_entrants e
            where e.competition_id = c.id
              and (
                e.profile_id = p_profile_id
                or public.is_parent_of(p_profile_id, e.profile_id)
              )
          )
        )
      )
      and (
        c.audience = 'public'
        or (
          c.org_id is null
          and c.created_by = p_profile_id
        )
        or public.can_administer_org(c.org_id, p_profile_id)
        or (
          c.audience = 'school'
          and c.org_id is not null
          and (
            public.is_active_member(c.org_id, p_profile_id)
            or public.is_parent_of_org_member(c.org_id, p_profile_id)
          )
        )
        or (
          c.audience = 'district'
          and c.org_id is not null
          and (
            public.is_active_member(c.org_id, p_profile_id)
            or (
              host.parent_org_id is not null
              and public.is_active_member(host.parent_org_id, p_profile_id)
            )
            or exists (
              select 1
              from organizations school
              where school.parent_org_id = coalesce(host.parent_org_id, host.id)
                and (
                  public.is_active_member(school.id, p_profile_id)
                  or public.is_parent_of_org_member(school.id, p_profile_id)
                )
            )
          )
        )
        or (
          c.audience = 'invite_only'
          and exists (
            select 1
            from competition_entrants e
            where e.competition_id = c.id
              and (
                e.profile_id = p_profile_id
                or public.is_parent_of(p_profile_id, e.profile_id)
              )
          )
        )
      )
  );
$$;

-- ---------------------------------------------------------------------------
-- 7. Platform admins can replace covers on org-less (scraped) listings.
-- ---------------------------------------------------------------------------
create or replace function public.can_manage_tournament_cover_path(
  p_name text,
  p_profile_id uuid,
  p_require_draft boolean default true
)
returns boolean
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  org_id_from_path uuid;
  draft_id_from_path uuid;
begin
  if auth.uid() is null
     or p_profile_id is distinct from auth.uid()
     or coalesce(p_name, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}/[^/]+$' then
    return false;
  end if;

  org_id_from_path := split_part(p_name, '/', 1)::uuid;
  draft_id_from_path := split_part(p_name, '/', 2)::uuid;

  if not (
    public.can_operate_org_competitions(
      org_id_from_path,
      p_profile_id
    )
    or public.is_platform_admin()
  ) then
    return false;
  end if;

  if not p_require_draft then
    return true;
  end if;

  if exists (
    select 1
    from public.tournament_drafts draft
    where draft.id = draft_id_from_path
      and draft.org_id = org_id_from_path
  ) then
    return true;
  end if;

  return exists (
    select 1
    from public.competitions competition
    where competition.id = draft_id_from_path
      and (
        competition.org_id = org_id_from_path
        or (
          competition.org_id is null
          and public.is_platform_admin()
        )
      )
      and (
        public.can_manage_competition(competition.id, p_profile_id)
        or public.is_platform_admin()
      )
  );
end;
$$;
