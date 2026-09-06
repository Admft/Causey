-- Problem reports from /support: stored tickets, private screenshots,
-- founder intake mail, and platform-admin replies that can write Alerts.

create table if not exists public.support_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_user_id uuid references public.profiles (id) on delete set null,
  reporter_email text not null,
  body text not null,
  page_label text,
  attachment_path text,
  status text not null default 'open'
    check (status in ('open', 'replied', 'closed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint support_reports_email_len
    check (char_length(reporter_email) between 3 and 320),
  constraint support_reports_body_len
    check (char_length(body) between 1 and 2000),
  constraint support_reports_page_label_len
    check (page_label is null or char_length(page_label) between 1 and 200),
  constraint support_reports_attachment_path_len
    check (attachment_path is null or char_length(attachment_path) between 1 and 500)
);

create index if not exists support_reports_status_created_idx
  on public.support_reports (status, created_at desc);

create index if not exists support_reports_reporter_created_idx
  on public.support_reports (reporter_user_id, created_at desc)
  where reporter_user_id is not null;

comment on table public.support_reports is
  'Founding-team problem reports from /support. Not a live chat or coach-parent messenger.';

create table if not exists public.support_report_messages (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.support_reports (id) on delete cascade,
  author_role text not null check (author_role in ('reporter', 'staff')),
  author_id uuid references public.profiles (id) on delete set null,
  body text not null,
  created_at timestamptz not null default now(),
  constraint support_report_messages_body_len
    check (char_length(body) between 1 and 2000)
);

create index if not exists support_report_messages_report_created_idx
  on public.support_report_messages (report_id, created_at);

comment on table public.support_report_messages is
  'Intake body plus staff replies on a support report. Staff replies can also write Alerts.';

drop trigger if exists support_reports_updated_at on public.support_reports;
create trigger support_reports_updated_at
  before update on public.support_reports
  for each row execute function public.set_updated_at();

alter table public.support_reports enable row level security;
alter table public.support_report_messages enable row level security;

revoke all on table public.support_reports from public, anon, authenticated;
revoke all on table public.support_report_messages from public, anon, authenticated;
grant select on table public.support_reports to authenticated;
grant select on table public.support_report_messages to authenticated;

drop policy if exists "support_reports_select_own_or_admin" on public.support_reports;
create policy "support_reports_select_own_or_admin"
  on public.support_reports for select
  to authenticated
  using (
    reporter_user_id = auth.uid()
    or public.is_platform_admin()
  );

drop policy if exists "support_report_messages_select_own_or_admin"
  on public.support_report_messages;
create policy "support_report_messages_select_own_or_admin"
  on public.support_report_messages for select
  to authenticated
  using (
    exists (
      select 1
      from public.support_reports report
      where report.id = report_id
        and (
          report.reporter_user_id = auth.uid()
          or public.is_platform_admin()
        )
    )
  );

insert into storage.buckets (
  id,
  name,
  public,
  file_size_limit,
  allowed_mime_types
)
values (
  'support-attachments',
  'support-attachments',
  false,
  4194304,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Service role uploads and signs URLs. Authenticated clients have no object policies.

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
    'household',
    'support'
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

create or replace function public.claim_email_outbox_invitations(
  p_limit integer default 25
)
returns setof public.email_outbox
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select outbox.id
    from public.email_outbox outbox
    where outbox.template in (
        'organization_invitation',
        'support_intake',
        'support_reply'
      )
      and (
        outbox.status in ('pending', 'failed')
        or (
          outbox.status = 'sending'
          and (
            outbox.locked_at is null
            or outbox.locked_at <= now() - interval '15 minutes'
          )
        )
      )
      and outbox.attempts < 4
      and outbox.send_after <= now()
    order by outbox.send_after, outbox.created_at
    for update skip locked
    limit greatest(1, least(coalesce(p_limit, 25), 100))
  )
  update public.email_outbox outbox
  set status = 'sending',
      attempts = outbox.attempts + 1,
      locked_at = now(),
      last_error = null
  from candidates
  where outbox.id = candidates.id
  returning outbox.*;
end;
$$;

revoke all on function public.claim_email_outbox_invitations(integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_outbox_invitations(integer)
  to service_role;

create index if not exists email_outbox_pending_priority_idx
  on public.email_outbox (send_after, created_at)
  where template in (
      'organization_invitation',
      'support_intake',
      'support_reply'
    )
    and status in ('pending', 'failed', 'sending');

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
    if p_entity_type = 'support_report' then
      if coalesce(p_entity_id, '') !~
         '^[0-9A-Fa-f]{8}-[0-9A-Fa-f]{4}-[1-5][0-9A-Fa-f]{3}-[89ABab][0-9A-Fa-f]{3}-[0-9A-Fa-f]{12}$' then
        raise exception 'invalid_notification_entity' using errcode = '22023';
      end if;
      entity_uuid := p_entity_id::uuid;
      select exists (
        select 1
        from public.support_reports report
        where report.id = entity_uuid
          and report.reporter_user_id = p_recipient_id
          and public.is_platform_admin()
          and p_href = '/support#reports'
          and p_dedupe_key like 'support-reply:' || entity_uuid::text || ':%'
      ) into authorized;
    else
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
    end if;

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
      -- Staff team-entry: notify the student that a coach marked going / not going.
      if authorized is not true then
        select exists (
          select 1
          from public.competition_entrants entrant
          join public.competitions competition
            on competition.id = entrant.competition_id
          where entrant.competition_id = entity_uuid
            and entrant.profile_id = p_recipient_id
            and entrant.responded_by = actor
            and entrant.response_source = 'staff'
            and entrant.status in ('going', 'not_going')
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
              'staff-rsvp:' || entity_uuid::text || ':'
              || p_recipient_id::text || ':' || entrant.status
        ) into authorized;
      end if;
      -- Staff team-entry: notify linked parents on the family desk.
      if authorized is not true then
        select exists (
          select 1
          from public.competition_entrants entrant
          join public.household_links household
            on household.child_profile_id = entrant.profile_id
           and household.parent_profile_id = p_recipient_id
           and household.status = 'active'
          where entrant.competition_id = entity_uuid
            and entrant.responded_by = actor
            and entrant.response_source = 'staff'
            and entrant.status in ('going', 'not_going')
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
              'staff-rsvp:' || entity_uuid::text || ':'
              || entrant.profile_id::text || ':parent:' || p_recipient_id::text
              || ':' || entrant.status
        ) into authorized;
      end if;
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
  'Creates local-link notifications only for an authenticated account, support-report staff reply, entrant, RSVP (including staff team-entry), announcement, result, or linked-parent relationship.';
