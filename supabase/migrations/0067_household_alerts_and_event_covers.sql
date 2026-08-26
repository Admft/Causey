-- Household notification fan-out, recorded-result alerts, published-listing
-- cover uploads, and parent timezone-safe product email kinds.

-- ---------------------------------------------------------------------------
-- 1. Result preference (in-app + email). Default on, fail closed if unset.
-- ---------------------------------------------------------------------------
alter table public.notification_preferences
  add column if not exists result boolean not null default true;

comment on column public.notification_preferences.result is
  'In-app and product email when a coach records a division, place, or award.';

-- ---------------------------------------------------------------------------
-- 2. Cover paths may target a real hosted competition, not only a draft.
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
      and competition.org_id = org_id_from_path
      and (
        public.can_manage_competition(competition.id, p_profile_id)
        or public.is_platform_admin()
      )
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- 3. Listing edits may persist a replacement cover URL.
-- ---------------------------------------------------------------------------
create or replace function public.update_competition_with_sections(
  p_competition_id uuid,
  p_values jsonb,
  p_sections jsonb default null
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  updated_slug text;
  next_facets jsonb;
begin
  if not public.can_manage_competition(p_competition_id, auth.uid()) then
    raise exception 'Competition management access required'
      using errcode = '42501';
  end if;

  next_facets := coalesce(p_values->'facets', '[]'::jsonb);
  if jsonb_typeof(next_facets) <> 'array' then
    raise exception 'Competition facets must be an array'
      using errcode = '22023';
  end if;

  update competitions
  set
    category = p_values->>'category',
    custom_category_name = nullif(p_values->>'custom_category_name', ''),
    participation_mode = p_values->>'participation_mode',
    name = p_values->>'name',
    venue_name = nullif(p_values->>'venue_name', ''),
    address = nullif(p_values->>'address', ''),
    city = nullif(p_values->>'city', ''),
    state = nullif(p_values->>'state', ''),
    zip = nullif(p_values->>'zip', ''),
    lat = nullif(p_values->>'lat', '')::double precision,
    lng = nullif(p_values->>'lng', '')::double precision,
    start_date = (p_values->>'start_date')::date,
    end_date = nullif(p_values->>'end_date', '')::date,
    reg_deadline = nullif(p_values->>'reg_deadline', '')::date,
    reg_url = nullif(p_values->>'reg_url', ''),
    entry_fee_cents = nullif(p_values->>'entry_fee_cents', '')::integer,
    rated = (p_values->>'rated')::boolean,
    rating_system = nullif(p_values->>'rating_system', ''),
    visibility = p_values->>'visibility',
    audience = p_values->>'audience',
    image_url = case
      when p_values ? 'image_url' then nullif(p_values->>'image_url', '')
      else image_url
    end,
    details = jsonb_set(
      coalesce(details, '{}'::jsonb),
      '{facets}',
      next_facets,
      true
    ),
    updated_at = now()
  where id = p_competition_id
  returning slug into updated_slug;

  if updated_slug is null then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;

  if p_sections is not null then
    perform public.replace_competition_sections(
      p_competition_id,
      p_sections
    );
  elsif p_values->>'category' <> 'chess' then
    update sections
    set min_rating = null, max_rating = null
    where competition_id = p_competition_id;
  end if;

  return updated_slug;
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. Coaches can load active guardians for students they may invite/operate.
-- ---------------------------------------------------------------------------
create or replace function public.get_active_guardians_for_profiles(
  p_child_ids uuid[]
)
returns table (
  child_id uuid,
  parent_id uuid,
  child_display_name text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    household.child_profile_id,
    household.parent_profile_id,
    coalesce(nullif(btrim(child.display_name), ''), 'Your student')
  from public.household_links household
  join public.profiles child
    on child.id = household.child_profile_id
  where household.status = 'active'
    and p_child_ids is not null
    and household.child_profile_id = any(p_child_ids)
    and (
      public.is_platform_admin()
      or exists (
        select 1
        from public.household_links self
        where self.parent_profile_id = auth.uid()
          and self.child_profile_id = household.child_profile_id
          and self.status = 'active'
      )
      or exists (
        select 1
        from public.org_memberships membership
        where membership.profile_id = household.child_profile_id
          and membership.status = 'active'
          and public.can_operate_org_competitions(
            membership.org_id,
            auth.uid()
          )
      )
      or exists (
        select 1
        from public.competition_entrants entrant
        where entrant.profile_id = household.child_profile_id
          and (
            entrant.invited_by = auth.uid()
            or public.can_manage_competition(
              entrant.competition_id,
              auth.uid()
            )
            or public.can_invite_to_competition(
              entrant.competition_id,
              entrant.profile_id,
              auth.uid()
            )
          )
      )
    );
$$;

revoke all on function public.get_active_guardians_for_profiles(uuid[])
  from public, anon;
grant execute on function public.get_active_guardians_for_profiles(uuid[])
  to authenticated;

comment on function public.get_active_guardians_for_profiles(uuid[]) is
  'Returns active linked parents for children the caller may invite, operate, or already parent.';

-- ---------------------------------------------------------------------------
-- 5. Notification RPC: parent invitation/announcement/result, keep local hrefs.
-- ---------------------------------------------------------------------------
create or replace function public.create_in_app_notification(
  p_recipient_id uuid,
  p_kind text,
  p_title text,
  p_body text,
  p_href text default null,
  p_entity_type text default null,
  p_entity_id text default null,
  p_dedupe_key text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  prefs public.notification_preferences%rowtype;
  allowed_by_preference boolean := true;
  authorized boolean := false;
  entity_uuid uuid;
  new_id uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;

  if p_recipient_id is null
     or nullif(btrim(p_kind), '') is null
     or nullif(btrim(p_title), '') is null
     or nullif(btrim(p_body), '') is null then
    raise exception 'missing_required_notification_fields'
      using errcode = '22023';
  end if;

  if char_length(p_title) > 200
     or char_length(p_body) > 1000
     or char_length(coalesce(p_href, '')) > 500
     or char_length(coalesce(p_entity_type, '')) > 80
     or char_length(coalesce(p_entity_id, '')) > 120
     or char_length(coalesce(p_dedupe_key, '')) > 240 then
    raise exception 'notification_field_too_long' using errcode = '22001';
  end if;

  if p_href is not null and (
    left(p_href, 1) <> '/'
    or left(p_href, 2) = '//'
    or position(chr(92) in p_href) > 0
    or p_href ~ '[[:space:][:cntrl:]]'
  ) then
    raise exception 'external_notification_href_not_allowed'
      using errcode = '22023';
  end if;

  if p_kind = 'account' then
    authorized :=
      p_recipient_id = actor
      and p_entity_type = 'account'
      and p_entity_id in (
        'password_updated',
        'email_change_pending',
        'password_reset_requested'
      )
      and p_href = '/account#signin'
      and p_dedupe_key like case p_entity_id
        when 'password_updated' then 'account:password-updated:%'
        when 'email_change_pending' then 'account:email-change:%'
        when 'password_reset_requested' then 'account:password-reset:%'
      end;

  elsif p_kind in ('invitation', 'rsvp_update') then
    if coalesce(p_entity_id, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
      raise exception 'invalid_notification_entity' using errcode = '22023';
    end if;
    entity_uuid := p_entity_id::uuid;

    if p_kind = 'invitation' then
      select exists (
        select 1
        from public.competition_entrants entrant
        join public.competitions competition
          on competition.id = entrant.competition_id
        where entrant.competition_id = entity_uuid
          and entrant.profile_id = p_recipient_id
          and entrant.invited_by = actor
          and p_entity_type = 'competition'
          and p_href = '/event/' || competition.slug
          and p_dedupe_key =
            'invitation:' || entity_uuid::text || ':' || p_recipient_id::text
      ) into authorized;
      if authorized is not true then
        select exists (
          select 1
          from public.competition_entrants entrant
          join public.household_links household
            on household.child_profile_id = entrant.profile_id
           and household.parent_profile_id = p_recipient_id
           and household.status = 'active'
          where entrant.competition_id = entity_uuid
            and entrant.invited_by = actor
            and p_entity_type = 'competition'
            and p_href = '/family#needs-response'
            and p_dedupe_key =
              'invitation:' || entity_uuid::text || ':'
              || entrant.profile_id::text || ':parent:' || p_recipient_id::text
        ) into authorized;
      end if;
    else
      select exists (
        select 1
        from public.competition_entrants entrant
        join public.competitions competition
          on competition.id = entrant.competition_id
        where entrant.competition_id = entity_uuid
          and entrant.invited_by = p_recipient_id
          and entrant.responded_by = actor
          and entrant.status in ('going', 'not_going')
          and p_entity_type = 'competition'
          and p_href in ('/event/' || competition.slug || '/manage', '/orgs')
          and p_dedupe_key =
            'rsvp:' || entity_uuid::text || ':' || entrant.profile_id::text
            || ':' || entrant.status
      ) into authorized;
    end if;

  elsif p_kind = 'announcement' then
    if coalesce(p_entity_id, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
      raise exception 'invalid_notification_entity' using errcode = '22023';
    end if;
    entity_uuid := p_entity_id::uuid;

    select exists (
      select 1
      from public.org_announcements announcement
      join public.organizations organization
        on organization.id = announcement.org_id
      join public.org_memberships membership
        on membership.org_id = announcement.org_id
       and membership.profile_id = p_recipient_id
       and membership.status = 'active'
      where announcement.id = entity_uuid
        and announcement.created_by = actor
        and public.can_operate_org_competitions(
          announcement.org_id,
          actor
        )
        and p_entity_type = 'org_announcement'
        and p_href = '/orgs/' || organization.slug
        and p_dedupe_key =
          'announcement:' || entity_uuid::text || ':' || p_recipient_id::text
    ) into authorized;
    if authorized is not true then
      select exists (
        select 1
        from public.org_announcements announcement
        join public.org_memberships membership
          on membership.org_id = announcement.org_id
         and membership.status = 'active'
        join public.household_links household
          on household.child_profile_id = membership.profile_id
         and household.parent_profile_id = p_recipient_id
         and household.status = 'active'
        where announcement.id = entity_uuid
          and announcement.created_by = actor
          and public.can_operate_org_competitions(
            announcement.org_id,
            actor
          )
          and p_entity_type = 'org_announcement'
          and p_href = '/family'
          and p_dedupe_key =
            'announcement:' || entity_uuid::text || ':parent:'
            || p_recipient_id::text
      ) into authorized;
    end if;

  elsif p_kind = 'result' then
    if coalesce(p_entity_id, '') !~
       '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
      raise exception 'invalid_notification_entity' using errcode = '22023';
    end if;
    entity_uuid := p_entity_id::uuid;

    select exists (
      select 1
      from public.competition_entrants entrant
      join public.competitions competition
        on competition.id = entrant.competition_id
      where entrant.competition_id = entity_uuid
        and entrant.profile_id = p_recipient_id
        and entrant.result_marked_by = actor
        and (
          public.can_manage_competition(entity_uuid, actor)
          or public.can_invite_to_competition(
            entity_uuid,
            entrant.profile_id,
            actor
          )
        )
        and p_entity_type = 'competition'
        and p_href = '/event/' || competition.slug
        and p_dedupe_key =
          'result:' || entity_uuid::text || ':' || p_recipient_id::text
    ) into authorized;
    if authorized is not true then
      select exists (
        select 1
        from public.competition_entrants entrant
        join public.household_links household
          on household.child_profile_id = entrant.profile_id
         and household.parent_profile_id = p_recipient_id
         and household.status = 'active'
        where entrant.competition_id = entity_uuid
          and entrant.result_marked_by = actor
          and (
            public.can_manage_competition(entity_uuid, actor)
            or public.can_invite_to_competition(
              entity_uuid,
              entrant.profile_id,
              actor
            )
          )
          and p_entity_type = 'competition'
          and p_href = '/family'
          and p_dedupe_key =
            'result:' || entity_uuid::text || ':'
            || entrant.profile_id::text || ':parent:' || p_recipient_id::text
      ) into authorized;
    end if;
  end if;

  if authorized is not true then
    raise exception 'notification_recipient_not_authorized'
      using errcode = '42501';
  end if;

  select *
    into prefs
  from public.notification_preferences
  where profile_id = p_recipient_id;

  if found then
    case p_kind
      when 'invitation' then
        allowed_by_preference := prefs.invitation;
      when 'rsvp_update' then
        allowed_by_preference := prefs.rsvp_update;
      when 'announcement' then
        allowed_by_preference := prefs.announcement;
      when 'result' then
        allowed_by_preference := prefs.result;
      when 'account' then
        allowed_by_preference := true;
    end case;
  end if;

  if not allowed_by_preference then
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
    p_recipient_id,
    p_kind,
    p_title,
    p_body,
    p_href,
    p_entity_type,
    p_entity_id,
    p_dedupe_key
  )
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null
  do nothing
  returning id into new_id;

  return new_id;
end;
$$;

comment on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) is
  'Creates local-link notifications only for an authenticated account, entrant, RSVP, announcement, result, or linked-parent relationship.';

-- ---------------------------------------------------------------------------
-- 6. Schedule/cancel also notifies active parents of tracked students.
-- ---------------------------------------------------------------------------
create or replace function public.record_competition_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  fields text[] := array[]::text[];
  before_data jsonb := '{}'::jsonb;
  after_data jsonb := '{}'::jsonb;
  tracked record;
  notice_kind text;
  notice_title text;
  dedupe text;
  prefs public.notification_preferences%rowtype;
  allowed boolean;
begin
  if old.start_date is distinct from new.start_date then
    fields := array_append(fields, 'start_date');
    before_data := before_data || jsonb_build_object('start_date', old.start_date);
    after_data := after_data || jsonb_build_object('start_date', new.start_date);
  end if;
  if old.end_date is distinct from new.end_date then
    fields := array_append(fields, 'end_date');
    before_data := before_data || jsonb_build_object('end_date', old.end_date);
    after_data := after_data || jsonb_build_object('end_date', new.end_date);
  end if;
  if old.venue_name is distinct from new.venue_name
     or old.address is distinct from new.address
     or old.city is distinct from new.city
     or old.state is distinct from new.state then
    fields := array_append(fields, 'venue');
    before_data := before_data || jsonb_build_object(
      'venue_name', old.venue_name, 'address', old.address,
      'city', old.city, 'state', old.state
    );
    after_data := after_data || jsonb_build_object(
      'venue_name', new.venue_name, 'address', new.address,
      'city', new.city, 'state', new.state
    );
  end if;
  if old.reg_deadline is distinct from new.reg_deadline then
    fields := array_append(fields, 'registration_deadline');
    before_data := before_data || jsonb_build_object('reg_deadline', old.reg_deadline);
    after_data := after_data || jsonb_build_object('reg_deadline', new.reg_deadline);
  end if;
  if old.reg_url is distinct from new.reg_url then
    fields := array_append(fields, 'registration_link');
    before_data := before_data || jsonb_build_object('reg_url', old.reg_url);
    after_data := after_data || jsonb_build_object('reg_url', new.reg_url);
  end if;
  if old.status is distinct from new.status
     and new.status in ('archived', 'rejected') then
    fields := array_append(fields, 'cancellation');
    before_data := before_data || jsonb_build_object('status', old.status);
    after_data := after_data || jsonb_build_object('status', new.status);
  end if;

  if cardinality(fields) = 0 then
    return new;
  end if;

  insert into competition_change_history (
    competition_id, changed_by, changed_fields, before_values, after_values
  )
  values (new.id, auth.uid(), fields, before_data, after_data);

  notice_kind := case when 'cancellation' = any(fields)
    then 'cancellation' else 'schedule_change' end;
  notice_title := case when notice_kind = 'cancellation'
    then 'Tournament update: ' || new.name
    else 'Tournament details changed: ' || new.name end;
  dedupe := 'competition-change:' || new.id::text || ':' || md5(
    array_to_string(fields, ',') || coalesce(after_data::text, '')
  );

  for tracked in
    select distinct recipient_id
    from (
      select s.user_id as recipient_id
      from saved_competitions s
      where s.competition_id = new.id
      union
      select e.profile_id
      from competition_entrants e
      where e.competition_id = new.id
      union
      select r.user_id
      from external_registrations r
      where r.competition_id = new.id
      union
      select household.parent_profile_id
      from public.household_links household
      where household.status = 'active'
        and household.child_profile_id in (
          select s.user_id
          from saved_competitions s
          where s.competition_id = new.id
          union
          select e.profile_id
          from competition_entrants e
          where e.competition_id = new.id
          union
          select r.user_id
          from external_registrations r
          where r.competition_id = new.id
        )
    ) recipients
    where recipient_id is not null
      and (auth.uid() is null or recipient_id <> auth.uid())
  loop
    allowed := true;
    select * into prefs
    from public.notification_preferences
    where profile_id = tracked.recipient_id;
    if found then
      if notice_kind = 'cancellation' then
        allowed := prefs.cancellation;
      else
        allowed := prefs.schedule_change;
      end if;
    end if;

    if not allowed then
      continue;
    end if;

    insert into notifications (
      recipient_id, kind, title, body, href,
      entity_type, entity_id, dedupe_key
    )
    values (
      tracked.recipient_id,
      notice_kind,
      notice_title,
      'Review what changed before making plans.',
      '/event/' || new.slug,
      'competition',
      new.id::text,
      dedupe
    )
    on conflict (recipient_id, dedupe_key) where dedupe_key is not null
    do nothing;
  end loop;

  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Email outbox includes recorded results. Do not add invitation here.
--    Return-type change requires DROP; CREATE OR REPLACE cannot add columns.
-- ---------------------------------------------------------------------------
drop function if exists public.get_pending_notification_emails();
create or replace function public.get_pending_notification_emails()
returns table (
  notification_id uuid,
  profile_id uuid,
  recipient_email text,
  display_name text,
  profile_role text,
  timezone text,
  email_enabled boolean,
  guardian_routing boolean,
  invitation boolean,
  registration_deadline boolean,
  reminder_7_day boolean,
  reminder_1_day boolean,
  schedule_change boolean,
  cancellation boolean,
  rsvp_update boolean,
  announcement boolean,
  result boolean,
  kind text,
  title text,
  body text,
  href text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    n.id,
    p.id,
    u.email::text,
    p.display_name,
    p.role,
    coalesce(pref.timezone, 'America/Chicago'),
    coalesce(pref.email_enabled, true),
    coalesce(pref.guardian_routing, true),
    coalesce(pref.invitation, true),
    coalesce(pref.registration_deadline, true),
    coalesce(pref.reminder_7_day, true),
    coalesce(pref.reminder_1_day, true),
    coalesce(pref.schedule_change, true),
    coalesce(pref.cancellation, true),
    coalesce(pref.rsvp_update, true),
    coalesce(pref.announcement, true),
    coalesce(pref.result, true),
    n.kind,
    n.title,
    n.body,
    n.href
  from public.notifications n
  join public.profiles p on p.id = n.recipient_id
  join auth.users u on u.id = p.id
  left join public.notification_preferences pref on pref.profile_id = p.id
  where n.emailed_at is null
    and u.email is not null
    and n.kind in (
      'schedule_change', 'cancellation', 'rsvp_update', 'announcement',
      'account', 'result'
    );
$$;

revoke execute on function public.get_pending_notification_emails()
  from public, anon, authenticated;
grant execute on function public.get_pending_notification_emails()
  to service_role;

drop function if exists public.get_guardian_email_recipients(uuid);
create or replace function public.get_guardian_email_recipients(
  p_child_id uuid
)
returns table (
  parent_profile_id uuid,
  recipient_email text,
  display_name text,
  email_enabled boolean,
  invitation boolean,
  registration_deadline boolean,
  reminder_7_day boolean,
  reminder_1_day boolean,
  schedule_change boolean,
  cancellation boolean,
  rsvp_update boolean,
  announcement boolean,
  result boolean
)
language sql
stable
security definer
set search_path = public, auth
as $$
  select
    p.id,
    u.email::text,
    p.display_name,
    coalesce(pref.email_enabled, true),
    coalesce(pref.invitation, true),
    coalesce(pref.registration_deadline, true),
    coalesce(pref.reminder_7_day, true),
    coalesce(pref.reminder_1_day, true),
    coalesce(pref.schedule_change, true),
    coalesce(pref.cancellation, true),
    coalesce(pref.rsvp_update, true),
    coalesce(pref.announcement, true),
    coalesce(pref.result, true)
  from public.household_links h
  join public.profiles p on p.id = h.parent_profile_id
  join auth.users u on u.id = p.id
  left join public.notification_preferences pref on pref.profile_id = p.id
  where h.child_profile_id = p_child_id
    and h.status = 'active'
    and u.email is not null;
$$;

revoke execute on function public.get_guardian_email_recipients(uuid)
  from public, anon, authenticated;
grant execute on function public.get_guardian_email_recipients(uuid)
  to service_role;
