-- Product email delivery: service-role queues, reminder candidates, and
-- active-guardian routing. Run after 0035_role_capability_boundaries.sql.

alter table public.email_outbox
  add column if not exists locked_at timestamptz,
  add column if not exists provider_message_id text;

create index if not exists email_outbox_pending_send_idx
  on public.email_outbox (send_after, created_at)
  where status in ('pending', 'failed');

create or replace function public.claim_email_outbox_batch(
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
    select id
    from public.email_outbox
    where status in ('pending', 'failed')
      and attempts < 4
      and send_after <= now()
    order by send_after, created_at
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

revoke execute on function public.claim_email_outbox_batch(integer)
  from public, anon, authenticated;
grant execute on function public.claim_email_outbox_batch(integer)
  to service_role;

create or replace function public.get_email_reminder_candidates()
returns table (
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
  competition_id uuid,
  competition_slug text,
  competition_name text,
  start_date date,
  end_date date,
  reg_deadline date,
  reg_url text,
  relation text
)
language sql
stable
security definer
set search_path = public, auth
as $$
  with tracked as (
    select e.profile_id, e.competition_id, e.status::text as relation
    from public.competition_entrants e
    where e.status in ('invited', 'going')

    union all

    select s.user_id, s.competition_id, 'saved'
    from public.saved_competitions s

    union all

    select r.user_id, r.competition_id,
      case
        when r.status = 'opened' then 'registration_opened'
        else 'registration_needed'
      end
    from public.external_registrations r
    where r.status in ('opened', 'not_registered')
  )
  select
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
    c.id,
    c.slug,
    c.name,
    c.start_date,
    c.end_date,
    c.reg_deadline,
    c.reg_url,
    tracked.relation
  from tracked
  join public.profiles p on p.id = tracked.profile_id
  join auth.users u on u.id = p.id
  join public.competitions c on c.id = tracked.competition_id
  left join public.notification_preferences pref on pref.profile_id = p.id
  where u.email is not null
    and c.status = 'published'
    and coalesce(c.end_date, c.start_date) >= current_date - 1;
$$;

revoke execute on function public.get_email_reminder_candidates()
  from public, anon, authenticated;
grant execute on function public.get_email_reminder_candidates()
  to service_role;

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
      'schedule_change', 'cancellation', 'rsvp_update', 'announcement', 'account'
    );
$$;

revoke execute on function public.get_pending_notification_emails()
  from public, anon, authenticated;
grant execute on function public.get_pending_notification_emails()
  to service_role;

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
  announcement boolean
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
    coalesce(pref.announcement, true)
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

comment on function public.claim_email_outbox_batch(integer) is
  'Service-role only, concurrency-safe claim for Resend delivery workers.';
comment on function public.get_guardian_email_recipients(uuid) is
  'Service-role only. Returns active linked guardians and their email preferences.';
