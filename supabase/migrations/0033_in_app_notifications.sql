-- In-app notification helper (prefs-aware) + stable competition-change dedupe.
-- Email outbox / jobs remain unused; this path only writes notifications rows.

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
  prefs public.notification_preferences%rowtype;
  allowed boolean := true;
  new_id uuid;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  if p_recipient_id is null
     or p_kind is null
     or p_title is null
     or p_body is null then
    raise exception 'missing required notification fields';
  end if;

  if p_kind not in (
    'invitation',
    'registration_deadline',
    'reminder_7_day',
    'reminder_1_day',
    'schedule_change',
    'cancellation',
    'rsvp_update',
    'announcement',
    'account'
  ) then
    raise exception 'invalid notification kind: %', p_kind;
  end if;

  select * into prefs
  from public.notification_preferences
  where profile_id = p_recipient_id;

  if found then
    case p_kind
      when 'invitation' then allowed := prefs.invitation;
      when 'registration_deadline' then allowed := prefs.registration_deadline;
      when 'reminder_7_day' then allowed := prefs.reminder_7_day;
      when 'reminder_1_day' then allowed := prefs.reminder_1_day;
      when 'schedule_change' then allowed := prefs.schedule_change;
      when 'cancellation' then allowed := prefs.cancellation;
      when 'rsvp_update' then allowed := prefs.rsvp_update;
      when 'announcement' then allowed := prefs.announcement;
      when 'account' then allowed := true;
    end case;
  end if;

  if not allowed then
    return null;
  end if;

  insert into public.notifications (
    recipient_id, kind, title, body, href,
    entity_type, entity_id, dedupe_key
  )
  values (
    p_recipient_id,
    p_kind,
    left(p_title, 200),
    left(p_body, 1000),
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

revoke all on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_in_app_notification(
  uuid, text, text, text, text, text, text, text
) to authenticated;

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
