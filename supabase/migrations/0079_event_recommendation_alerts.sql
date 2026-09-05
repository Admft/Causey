-- Parent/club-mate event recommendations were stored but never wrote an
-- Alerts row, so the student home (Plan) and Alerts inbox stayed empty.
-- Run after 0078_admin_provision_district_school.sql.
--
-- Dedicated writer (same pattern as notify_household_link): the shared
-- create_in_app_notification gate only authorizes invitations, RSVPs,
-- announcements, results, and self account events.

create or replace function public.notify_event_recommendation(
  p_competition_id uuid,
  p_recipient_id uuid
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  prefs public.notification_preferences%rowtype;
  sender_name text;
  event_name text;
  event_slug text;
  rec_note text;
  event_href text;
  dedupe text;
  new_id uuid;
begin
  if actor is null then
    raise exception 'not_authenticated' using errcode = '42501';
  end if;
  if p_competition_id is null or p_recipient_id is null then
    raise exception 'missing_required_notification_fields' using errcode = '22023';
  end if;
  if p_recipient_id = actor then
    raise exception 'notification_recipient_not_authorized' using errcode = '42501';
  end if;

  select rec.note, competition.name, competition.slug
    into rec_note, event_name, event_slug
  from public.event_recommendations rec
  join public.competitions competition
    on competition.id = rec.competition_id
  where rec.competition_id = p_competition_id
    and rec.from_profile_id = actor
    and rec.to_profile_id = p_recipient_id
    and rec.status = 'sent';

  if event_slug is null
     or position('/' in event_slug) > 0
     or position(chr(92) in event_slug) > 0
     or event_slug ~ '[[:space:][:cntrl:]]' then
    raise exception 'notification_recipient_not_authorized' using errcode = '42501';
  end if;

  event_href := '/event/' || event_slug;
  dedupe :=
    'recommendation:' || p_competition_id::text || ':'
    || p_recipient_id::text || ':' || actor::text;

  select * into prefs
  from public.notification_preferences
  where profile_id = p_recipient_id;
  if found and prefs.invitation is false then
    return null;
  end if;

  select coalesce(nullif(btrim(p.display_name), ''), 'Someone you know')
    into sender_name
  from public.profiles p
  where p.id = actor;

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
    'invitation',
    left(sender_name || ' recommended ' || event_name, 200),
    left(
      coalesce(
        nullif(btrim(rec_note), ''),
        'Open the event to save it or say going.'
      ),
      1000
    ),
    event_href,
    'competition',
    p_competition_id::text,
    dedupe
  )
  on conflict (recipient_id, dedupe_key) where dedupe_key is not null
  do nothing
  returning id into new_id;

  return new_id;
end;
$$;

revoke all on function public.notify_event_recommendation(uuid, uuid)
  from public, anon;
grant execute on function public.notify_event_recommendation(uuid, uuid)
  to authenticated;

comment on function public.notify_event_recommendation(uuid, uuid) is
  'Writes an Alerts row for a recommendation the caller already sent. Invitation preference applies; duplicates are ignored.';

-- Existing sends never wrote alerts. Backfill so students already recommended
-- an event see it on the next Alerts/Plan load.
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
select
  rec.to_profile_id,
  'invitation',
  left(
    coalesce(nullif(btrim(sender.display_name), ''), 'Someone you know')
    || ' recommended '
    || competition.name,
    200
  ),
  left(
    coalesce(
      nullif(btrim(rec.note), ''),
      'Open the event to save it or say going.'
    ),
    1000
  ),
  '/event/' || competition.slug,
  'competition',
  rec.competition_id::text,
  'recommendation:' || rec.competition_id::text || ':'
    || rec.to_profile_id::text || ':' || rec.from_profile_id::text
from public.event_recommendations rec
join public.competitions competition
  on competition.id = rec.competition_id
join public.profiles sender
  on sender.id = rec.from_profile_id
where rec.status = 'sent'
  and competition.slug is not null
  and position('/' in competition.slug) = 0
  and position(chr(92) in competition.slug) = 0
  and competition.slug !~ '[[:space:][:cntrl:]]'
on conflict (recipient_id, dedupe_key) where dedupe_key is not null
do nothing;
