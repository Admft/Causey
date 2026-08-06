-- District pilot foundation.
-- Adds the tenant hierarchy, operational roles, invitation claiming,
-- audience-scoped tournaments, moderation, notifications, announcements,
-- change history, attendance outcomes, and privacy-preserving district rollups.
-- Run after 0017_tournament_drafts_and_covers.sql and the platform-admin
-- migrations merged from main.

-- ---------------------------------------------------------------------------
-- 1. District -> school hierarchy and verification.
-- ---------------------------------------------------------------------------
alter table public.organizations
  add column if not exists parent_org_id uuid
    references public.organizations (id) on delete restrict;
alter table public.organizations
  add column if not exists owner_profile_id uuid
    references public.profiles (id) on delete set null;
alter table public.organizations
  add column if not exists verification_status text not null default 'pending';
alter table public.organizations
  add column if not exists verified_at timestamptz;
alter table public.organizations
  add column if not exists verified_by uuid
    references public.profiles (id) on delete set null;

update public.organizations
set owner_profile_id = created_by
where owner_profile_id is null;

alter table public.organizations
  drop constraint if exists organizations_verification_status_check;
alter table public.organizations
  add constraint organizations_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected'));
alter table public.organizations
  drop constraint if exists organizations_not_own_parent;
alter table public.organizations
  add constraint organizations_not_own_parent
  check (parent_org_id is null or parent_org_id <> id);

create index if not exists organizations_parent_idx
  on public.organizations (parent_org_id)
  where parent_org_id is not null;

create or replace function public.validate_organization_parent()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  parent_type text;
begin
  if new.parent_org_id is null then
    return new;
  end if;
  if new.type <> 'school' then
    raise exception 'Only schools can belong to a district.';
  end if;
  select type into parent_type
  from organizations
  where id = new.parent_org_id;
  if parent_type is distinct from 'district' then
    raise exception 'A school parent must be a district.';
  end if;
  return new;
end;
$$;

drop trigger if exists organizations_validate_parent on public.organizations;
create trigger organizations_validate_parent
  before insert or update of parent_org_id, type on public.organizations
  for each row execute function public.validate_organization_parent();

-- ---------------------------------------------------------------------------
-- 2. Operational roles live on memberships, not on the broad account role.
-- ---------------------------------------------------------------------------
alter table public.org_memberships
  drop constraint if exists org_memberships_role_check;
alter table public.org_memberships
  add constraint org_memberships_role_check
  check (
    role in (
      'student',
      'assistant_coach',
      'coach',
      'school_admin',
      'district_admin',
      'admin'
    )
  );

-- Preserve old rows while giving "admin" a precise school/district meaning.
update public.org_memberships m
set role = case
  when o.type = 'district' then 'district_admin'
  else 'school_admin'
end
from public.organizations o
where o.id = m.org_id and m.role = 'admin';

create or replace function public.is_org_staff(p_org_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organizations o
    where o.id = p_org_id
      and (o.owner_profile_id = p_profile_id or o.created_by = p_profile_id)
  )
  or exists (
    select 1
    from org_memberships m
    where m.org_id = p_org_id
      and m.profile_id = p_profile_id
      and m.status = 'active'
      and m.role in (
        'assistant_coach', 'coach', 'school_admin', 'district_admin'
      )
  );
$$;

create or replace function public.is_org_admin(p_org_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organizations o
    where o.id = p_org_id
      and (o.owner_profile_id = p_profile_id or o.created_by = p_profile_id)
  )
  or exists (
    select 1
    from org_memberships m
    where m.org_id = p_org_id
      and m.profile_id = p_profile_id
      and m.status = 'active'
      and m.role in ('school_admin', 'district_admin')
  );
$$;

create or replace function public.is_district_admin(
  p_district_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from organizations o
    where o.id = p_district_id
      and o.type = 'district'
      and (
        o.owner_profile_id = p_profile_id
        or o.created_by = p_profile_id
        or exists (
          select 1
          from org_memberships m
          where m.org_id = o.id
            and m.profile_id = p_profile_id
            and m.status = 'active'
            and m.role = 'district_admin'
        )
      )
  );
$$;

create or replace function public.can_administer_org(
  p_org_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_admin(p_org_id, p_profile_id)
  or exists (
    select 1
    from organizations child
    where child.id = p_org_id
      and child.parent_org_id is not null
      and public.is_district_admin(child.parent_org_id, p_profile_id)
  );
$$;

-- Keep the old helper name working, but stop collapsing assistants and admins.
create or replace function public.is_org_coach(p_org_id uuid, p_profile_id uuid)
returns boolean
language sql stable security definer set search_path = public
as $$
  select public.is_org_staff(p_org_id, p_profile_id);
$$;

revoke execute on function public.is_org_staff(uuid, uuid) from public, anon;
revoke execute on function public.is_org_admin(uuid, uuid) from public, anon;
revoke execute on function public.is_district_admin(uuid, uuid) from public, anon;
revoke execute on function public.can_administer_org(uuid, uuid) from public, anon;
grant execute on function public.is_org_staff(uuid, uuid) to authenticated;
grant execute on function public.is_org_admin(uuid, uuid) to authenticated;
grant execute on function public.is_district_admin(uuid, uuid) to authenticated;
grant execute on function public.can_administer_org(uuid, uuid) to authenticated;

drop policy if exists "orgs_select_member_creator_or_parent" on public.organizations;
create policy "orgs_select_member_creator_or_parent"
  on public.organizations for select
  using (
    created_by = auth.uid()
    or owner_profile_id = auth.uid()
    or public.is_active_member(id, auth.uid())
    or public.is_parent_of_org_member(id, auth.uid())
    or (
      parent_org_id is not null
      and public.is_district_admin(parent_org_id, auth.uid())
    )
  );

drop policy if exists "orgs_update_coach" on public.organizations;
create policy "orgs_update_admin"
  on public.organizations for update
  using (public.can_administer_org(id, auth.uid()))
  with check (public.can_administer_org(id, auth.uid()));

drop policy if exists "memberships_insert_coach" on public.org_memberships;
create policy "memberships_insert_admin"
  on public.org_memberships for insert
  with check (public.can_administer_org(org_id, auth.uid()));

drop policy if exists "memberships_update_self_or_coach" on public.org_memberships;
create policy "memberships_update_self_or_admin"
  on public.org_memberships for update
  using (
    (profile_id = auth.uid() and status <> 'removed')
    or public.can_administer_org(org_id, auth.uid())
  )
  with check (
    profile_id = auth.uid()
    or public.can_administer_org(org_id, auth.uid())
  );

drop policy if exists "memberships_delete_coach" on public.org_memberships;
create policy "memberships_delete_admin"
  on public.org_memberships for delete
  using (public.can_administer_org(org_id, auth.uid()));

-- ---------------------------------------------------------------------------
-- 3. Bulk provisioning and expiring claim links.
-- ---------------------------------------------------------------------------
create table if not exists public.provisioning_batches (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  created_by uuid not null references public.profiles (id) on delete restrict,
  filename text,
  total_rows int not null default 0 check (total_rows >= 0),
  invited_rows int not null default 0 check (invited_rows >= 0),
  failed_rows int not null default 0 check (failed_rows >= 0),
  created_at timestamptz not null default now()
);

create table if not exists public.org_invitations (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  batch_id uuid references public.provisioning_batches (id) on delete set null,
  email text not null,
  display_name text,
  role text not null,
  token_hash text unique not null,
  status text not null default 'pending',
  invited_by uuid not null references public.profiles (id) on delete restrict,
  expires_at timestamptz not null default (now() + interval '7 days'),
  claimed_by uuid references public.profiles (id) on delete set null,
  claimed_at timestamptz,
  revoked_at timestamptz,
  created_at timestamptz not null default now(),
  check (
    role in (
      'student',
      'assistant_coach',
      'coach',
      'school_admin',
      'district_admin'
    )
  ),
  check (status in ('pending', 'claimed', 'revoked', 'expired'))
);

create unique index if not exists org_invitations_open_email_idx
  on public.org_invitations (org_id, lower(email), role)
  where status = 'pending';
create index if not exists org_invitations_org_status_idx
  on public.org_invitations (org_id, status, created_at desc);

alter table public.provisioning_batches enable row level security;
alter table public.org_invitations enable row level security;

create policy "provisioning_batches_manage_admin"
  on public.provisioning_batches for all
  using (public.can_administer_org(org_id, auth.uid()))
  with check (
    created_by = auth.uid()
    and public.can_administer_org(org_id, auth.uid())
  );

create policy "org_invitations_select_admin_or_claimant"
  on public.org_invitations for select
  using (
    public.can_administer_org(org_id, auth.uid())
    or claimed_by = auth.uid()
  );

create policy "org_invitations_insert_admin"
  on public.org_invitations for insert
  with check (
    invited_by = auth.uid()
    and public.can_administer_org(org_id, auth.uid())
  );

create policy "org_invitations_update_admin"
  on public.org_invitations for update
  using (public.can_administer_org(org_id, auth.uid()))
  with check (public.can_administer_org(org_id, auth.uid()));

create or replace function public.create_org_invitation(
  p_org_id uuid,
  p_email text,
  p_role text,
  p_display_name text default null,
  p_batch_id uuid default null
)
returns table (invitation_id uuid, claim_token text, expires_at timestamptz)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  new_id uuid;
  expiry timestamptz := now() + interval '7 days';
begin
  if auth.uid() is null
     or not public.can_administer_org(p_org_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email';
  end if;
  if p_role not in (
    'student', 'assistant_coach', 'coach', 'school_admin', 'district_admin'
  ) then
    raise exception 'invalid_role';
  end if;

  update org_invitations
  set status = 'revoked', revoked_at = now()
  where org_id = p_org_id
    and lower(email) = normalized_email
    and role = p_role
    and status = 'pending';

  insert into org_invitations (
    org_id, batch_id, email, display_name, role,
    token_hash, invited_by, expires_at
  )
  values (
    p_org_id, p_batch_id, normalized_email, nullif(trim(p_display_name), ''),
    p_role, encode(digest(raw_token, 'sha256'), 'hex'), auth.uid(), expiry
  )
  returning id into new_id;

  insert into email_outbox (
    recipient_email, template, payload, dedupe_key
  )
  values (
    normalized_email,
    'organization_invitation',
    jsonb_build_object(
      'invitation_id', new_id,
      'claim_token', raw_token,
      'org_id', p_org_id,
      'role', p_role,
      'expires_at', expiry
    ),
    'organization-invitation:' || new_id::text
  );

  return query select new_id, raw_token, expiry;
end;
$$;

create or replace function public.claim_org_invitation(p_token text)
returns table (org_id uuid, org_slug text, org_name text, member_role text)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  target public.org_invitations%rowtype;
  viewer_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into target
  from public.org_invitations i
  where i.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;

  if target.id is null
     or target.status <> 'pending'
     or target.expires_at <= now()
     or lower(target.email) <> viewer_email then
    raise exception 'invalid_invitation';
  end if;

  insert into public.org_memberships (org_id, profile_id, role, status)
  values (target.org_id, auth.uid(), target.role, 'active')
  on conflict (org_id, profile_id) do update
    set role = excluded.role, status = 'active';

  update public.org_invitations
  set status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  where id = target.id;

  return query
  select o.id, o.slug, o.name, target.role
  from public.organizations o
  where o.id = target.org_id;
end;
$$;

revoke execute on function public.claim_org_invitation(text) from public, anon;
revoke execute on function public.create_org_invitation(uuid, text, text, text, uuid)
  from public, anon;
grant execute on function public.claim_org_invitation(text) to authenticated;
grant execute on function public.create_org_invitation(uuid, text, text, text, uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 4. Audience-scoped events and public-event moderation.
-- ---------------------------------------------------------------------------
alter table public.competitions
  add column if not exists audience text not null default 'public';
alter table public.competitions
  add column if not exists submitted_for_review_at timestamptz;
alter table public.competitions
  add column if not exists reviewed_at timestamptz;
alter table public.competitions
  add column if not exists reviewed_by uuid
    references public.profiles (id) on delete set null;
alter table public.competitions
  add column if not exists moderation_note text;

update public.competitions
set audience = case when visibility = 'public' then 'public' else 'school' end;

alter table public.competitions
  drop constraint if exists competitions_audience_check;
alter table public.competitions
  add constraint competitions_audience_check
  check (audience in ('public', 'district', 'school', 'invite_only'));

alter table public.competitions
  drop constraint if exists competitions_status_check;
alter table public.competitions
  add constraint competitions_status_check
  check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived'));

create index if not exists competitions_audience_status_idx
  on public.competitions (audience, status);

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
      and c.status = 'published'
      and (
        c.audience = 'public'
        or c.created_by = p_profile_id
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

revoke execute on function public.can_view_competition(uuid, uuid) from public, anon;
grant execute on function public.can_view_competition(uuid, uuid) to authenticated;

drop policy if exists "published competitions readable by visibility" on public.competitions;
create policy "published competitions readable by audience"
  on public.competitions for select
  using (
    (audience = 'public' and status = 'published')
    or (
      auth.uid() is not null
      and public.can_view_competition(id, auth.uid())
    )
  );

drop policy if exists "sections of readable competitions" on public.sections;
create policy "sections of readable competitions"
  on public.sections for select
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = sections.competition_id
        and (
          (c.audience = 'public' and c.status = 'published')
          or (
            auth.uid() is not null
            and public.can_view_competition(c.id, auth.uid())
          )
        )
    )
  );

create or replace function public.enforce_public_event_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'organizer'
     and new.org_id is not null
     and new.audience = 'public'
     and new.status = 'published'
     and not public.is_platform_admin() then
    new.status := 'pending_review';
    new.submitted_for_review_at := coalesce(new.submitted_for_review_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists competitions_public_moderation on public.competitions;
create trigger competitions_public_moderation
  before insert or update of status, audience on public.competitions
  for each row execute function public.enforce_public_event_moderation();

-- ---------------------------------------------------------------------------
-- 5. Announcements, notification preferences, jobs, and in-app notices.
-- ---------------------------------------------------------------------------
create table if not exists public.org_announcements (
  id uuid primary key default gen_random_uuid(),
  org_id uuid not null references public.organizations (id) on delete cascade,
  title text not null check (char_length(title) between 2 and 100),
  body text not null check (char_length(body) between 2 and 2000),
  created_by uuid not null references public.profiles (id) on delete restrict,
  published_at timestamptz not null default now(),
  archived_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.notification_preferences (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  invitation boolean not null default true,
  registration_deadline boolean not null default true,
  reminder_7_day boolean not null default true,
  reminder_1_day boolean not null default true,
  schedule_change boolean not null default true,
  cancellation boolean not null default true,
  rsvp_update boolean not null default true,
  announcement boolean not null default true,
  email_enabled boolean not null default true,
  guardian_routing boolean not null default true,
  timezone text not null default 'America/Chicago',
  updated_at timestamptz not null default now()
);

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  title text not null,
  body text not null,
  href text,
  entity_type text,
  entity_id text,
  dedupe_key text,
  read_at timestamptz,
  emailed_at timestamptz,
  email_error text,
  created_at timestamptz not null default now()
);

create unique index if not exists notifications_recipient_dedupe_idx
  on public.notifications (recipient_id, dedupe_key)
  where dedupe_key is not null;
create index if not exists notifications_recipient_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;

create table if not exists public.notification_jobs (
  id uuid primary key default gen_random_uuid(),
  notification_id uuid not null references public.notifications (id) on delete cascade,
  send_after timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts int not null default 0,
  locked_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

create table if not exists public.email_outbox (
  id uuid primary key default gen_random_uuid(),
  recipient_email text not null,
  template text not null,
  payload jsonb not null default '{}'::jsonb,
  dedupe_key text unique,
  send_after timestamptz not null default now(),
  status text not null default 'pending'
    check (status in ('pending', 'sending', 'sent', 'failed', 'cancelled')),
  attempts int not null default 0,
  sent_at timestamptz,
  last_error text,
  created_at timestamptz not null default now()
);

alter table public.org_announcements enable row level security;
alter table public.notification_preferences enable row level security;
alter table public.notifications enable row level security;
alter table public.notification_jobs enable row level security;
alter table public.email_outbox enable row level security;

create policy "announcements_select_member"
  on public.org_announcements for select
  using (
    archived_at is null
    and (
      public.is_active_member(org_id, auth.uid())
      or public.is_parent_of_org_member(org_id, auth.uid())
      or public.is_org_staff(org_id, auth.uid())
    )
  );
create policy "announcements_insert_staff"
  on public.org_announcements for insert
  with check (
    created_by = auth.uid()
    and public.is_org_staff(org_id, auth.uid())
  );
create policy "announcements_update_staff"
  on public.org_announcements for update
  using (public.is_org_staff(org_id, auth.uid()))
  with check (public.is_org_staff(org_id, auth.uid()));

create policy "notification_preferences_own"
  on public.notification_preferences for all
  using (profile_id = auth.uid())
  with check (profile_id = auth.uid());
create policy "notifications_select_own"
  on public.notifications for select
  using (recipient_id = auth.uid());
create policy "notifications_update_own"
  on public.notifications for update
  using (recipient_id = auth.uid())
  with check (recipient_id = auth.uid());

-- Jobs are service-role only.
revoke all on public.notification_jobs from anon, authenticated;
revoke all on public.email_outbox from anon, authenticated;

-- ---------------------------------------------------------------------------
-- 6. Tournament change history and tracker notices.
-- ---------------------------------------------------------------------------
create table if not exists public.competition_change_history (
  id bigint generated always as identity primary key,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  changed_by uuid references public.profiles (id) on delete set null,
  changed_fields text[] not null,
  before_values jsonb not null,
  after_values jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists competition_change_history_competition_idx
  on public.competition_change_history (competition_id, created_at desc);

alter table public.competition_change_history enable row level security;
create policy "change_history_readable_event"
  on public.competition_change_history for select
  using (
    exists (
      select 1
      from competitions c
      where c.id = competition_id
        and (
          public.can_manage_competition(c.id, auth.uid())
          or public.can_view_competition(c.id, auth.uid())
        )
    )
  );
revoke insert, update, delete on public.competition_change_history
  from anon, authenticated;

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
    where recipient_id is not null and recipient_id <> auth.uid()
  loop
    insert into notifications (
      recipient_id, kind, title, body, href,
      entity_type, entity_id, dedupe_key
    )
    values (
      tracked.recipient_id,
      case when 'cancellation' = any(fields)
        then 'cancellation' else 'schedule_change' end,
      case when 'cancellation' = any(fields)
        then 'Tournament update: ' || new.name
        else 'Tournament details changed: ' || new.name end,
      'Review what changed before making plans.',
      '/event/' || new.slug,
      'competition',
      new.id::text,
      'competition-change:' || new.id::text || ':' || extract(epoch from now())::bigint
    )
    on conflict (recipient_id, dedupe_key) where dedupe_key is not null
    do nothing;
  end loop;

  return new;
end;
$$;

drop trigger if exists competitions_change_history on public.competitions;
create trigger competitions_change_history
  after update on public.competitions
  for each row execute function public.record_competition_change();

-- ---------------------------------------------------------------------------
-- 7. Attendance outcomes and aggregate district reporting.
-- ---------------------------------------------------------------------------
alter table public.competition_entrants
  drop constraint if exists competition_entrants_status_check;
alter table public.competition_entrants
  add constraint competition_entrants_status_check
  check (status in ('invited', 'going', 'not_going', 'attended', 'did_not_attend'));
alter table public.competition_entrants
  add column if not exists attendance_marked_by uuid
    references public.profiles (id) on delete set null;
alter table public.competition_entrants
  add column if not exists attendance_marked_at timestamptz;

create or replace function public.get_district_school_rollup(p_district_id uuid)
returns table (
  school_id uuid,
  school_name text,
  active_students bigint,
  upcoming_tournaments bigint,
  invitations_pending bigint,
  going_count bigint,
  attended_this_season bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.is_district_admin(p_district_id, auth.uid()) then
    raise exception 'not_authorized';
  end if;

  return query
  select
    school.id,
    school.name,
    count(distinct m.profile_id) filter (
      where m.status = 'active' and m.role = 'student'
    ) as active_students,
    count(distinct c.id) filter (
      where c.start_date >= current_date
        and c.status in ('published', 'pending_review')
    ) as upcoming_tournaments,
    count(distinct (e.competition_id, e.profile_id)) filter (
      where e.status = 'invited'
    ) as invitations_pending,
    count(distinct (e.competition_id, e.profile_id)) filter (
      where e.status = 'going'
    ) as going_count,
    count(distinct (e.competition_id, e.profile_id)) filter (
      where e.status = 'attended'
        and c.start_date >= date_trunc('year', current_date)::date
    ) as attended_this_season
  from organizations school
  left join org_memberships m
    on m.org_id = school.id
  left join competitions c
    on c.org_id = school.id
  left join competition_entrants e
    on e.competition_id = c.id
  where school.parent_org_id = p_district_id
    and school.type = 'school'
  group by school.id, school.name
  order by lower(school.name);
end;
$$;

revoke execute on function public.get_district_school_rollup(uuid)
  from public, anon;
grant execute on function public.get_district_school_rollup(uuid)
  to authenticated;

-- ---------------------------------------------------------------------------
-- 8. Audit the new privileged operations.
-- ---------------------------------------------------------------------------
create or replace function public.record_district_pilot_audit()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  entity text := coalesce(new.id, old.id)::text;
  action_name text;
  detail_data jsonb := '{}'::jsonb;
begin
  if tg_table_name = 'org_invitations' then
    action_name := case
      when tg_op = 'INSERT' then 'organization.invitation_created'
      when old.status is distinct from new.status
        then 'organization.invitation_' || new.status
      else null
    end;
    detail_data := jsonb_build_object(
      'org_id', coalesce(new.org_id, old.org_id),
      'role', coalesce(new.role, old.role)
    );
  elsif tg_table_name = 'org_announcements' then
    action_name := 'organization.announcement_published';
    detail_data := jsonb_build_object(
      'org_id', new.org_id,
      'title', new.title
    );
  elsif tg_table_name = 'organizations'
        and tg_op = 'UPDATE'
        and (
          old.owner_profile_id is distinct from new.owner_profile_id
          or old.parent_org_id is distinct from new.parent_org_id
          or old.verification_status is distinct from new.verification_status
        ) then
    action_name := 'organization.settings_changed';
    detail_data := jsonb_build_object(
      'owner_changed', old.owner_profile_id is distinct from new.owner_profile_id,
      'parent_changed', old.parent_org_id is distinct from new.parent_org_id,
      'verification_from', old.verification_status,
      'verification_to', new.verification_status
    );
  end if;

  if action_name is not null then
    insert into audit_events (
      actor_id, action, entity_type, entity_id, detail
    )
    values (auth.uid(), action_name, tg_table_name, entity, detail_data);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists org_invitations_audit on public.org_invitations;
create trigger org_invitations_audit
  after insert or update on public.org_invitations
  for each row execute function public.record_district_pilot_audit();

drop trigger if exists org_announcements_audit on public.org_announcements;
create trigger org_announcements_audit
  after insert on public.org_announcements
  for each row execute function public.record_district_pilot_audit();

drop trigger if exists organizations_district_pilot_audit on public.organizations;
create trigger organizations_district_pilot_audit
  after update on public.organizations
  for each row execute function public.record_district_pilot_audit();
