-- District provisioning hardening.
-- Run after 0073_search_platform_users_access.sql.
--
-- 1. Repairs the pgcrypto search path that 0070 dropped from
--    create_org_invitation, which broke every staff claim link.
-- 2. Adds a short typable activation code to staff invitations so a district
--    can be onboarded over the phone, not only by clicking a 64-character URL.
-- 3. Reserves creating a district for protected founder super admins.

-- ---------------------------------------------------------------------------
-- 1. Typable activation codes on staff invitations.
-- ---------------------------------------------------------------------------
alter table public.org_invitations
  add column if not exists activation_code_hash text;

create unique index if not exists org_invitations_activation_code_idx
  on public.org_invitations (activation_code_hash)
  where activation_code_hash is not null;

comment on column public.org_invitations.activation_code_hash is
  'SHA-256 of a short typable activation code shown once at creation. The code is not access by itself: claiming still requires controlling the invited email address.';

create or replace function public.normalize_activation_code(p_code text)
returns text
language sql
immutable
as $$
  select upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
$$;

revoke all on function public.normalize_activation_code(text)
  from public, anon;
grant execute on function public.normalize_activation_code(text)
  to authenticated;

-- Same alphabet as generate_join_code(): no vowels, no 0/O/1/I/L, so a code
-- survives being read aloud in an office.
create or replace function public.generate_activation_code()
returns text
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  alphabet text := 'BCDFGHJKMNPQRSTVWXYZ23456789';
  code text;
  bytes bytea;
  attempt integer := 0;
begin
  loop
    attempt := attempt + 1;
    code := '';
    bytes := gen_random_bytes(8);
    for byte_index in 0..7 loop
      code := code
        || substr(
             alphabet,
             1 + (get_byte(bytes, byte_index) % length(alphabet)),
             1
           );
    end loop;

    exit when not exists (
      select 1
      from public.org_invitations
      where activation_code_hash = encode(digest(code, 'sha256'), 'hex')
    );

    if attempt >= 10 then
      raise exception 'activation_code_unavailable';
    end if;
  end loop;

  return code;
end;
$$;

revoke all on function public.generate_activation_code()
  from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- 2. create_org_invitation returns an activation code, and resolves pgcrypto.
-- 0030 set search_path = public, extensions so gen_random_bytes and digest
-- resolve from Supabase's extension schema. 0070 recreated this function with
-- search_path = public, silently reverting that fix.
-- ---------------------------------------------------------------------------
drop function if exists public.create_org_invitation(
  uuid, text, text, text, uuid
);

create function public.create_org_invitation(
  p_org_id uuid,
  p_email text,
  p_role text,
  p_display_name text default null,
  p_batch_id uuid default null
)
returns table (
  invitation_id uuid,
  claim_token text,
  expires_at timestamptz,
  activation_code text
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized_email text := lower(trim(coalesce(p_email, '')));
  raw_token text := encode(gen_random_bytes(32), 'hex');
  raw_code text := public.generate_activation_code();
  new_id uuid;
  expiry timestamptz := now() + interval '7 days';
  org_type text;
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

  select type into org_type
  from public.organizations
  where id = p_org_id;
  if org_type is null then
    raise exception 'not_authorized';
  end if;
  if not public.invitation_role_fits_organization(org_type, p_role) then
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
    token_hash, activation_code_hash, invited_by, expires_at
  )
  values (
    p_org_id, p_batch_id, normalized_email, nullif(trim(p_display_name), ''),
    p_role,
    encode(digest(raw_token, 'sha256'), 'hex'),
    encode(digest(raw_code, 'sha256'), 'hex'),
    auth.uid(),
    expiry
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

  return query select new_id, raw_token, expiry, raw_code;
end;
$$;

revoke all on function public.create_org_invitation(uuid, text, text, text, uuid)
  from public, anon;
grant execute on function public.create_org_invitation(uuid, text, text, text, uuid)
  to authenticated;

comment on function public.create_org_invitation(uuid, text, text, text, uuid) is
  'Creates one staff or student invitation. Returns the claim token and the typable activation code exactly once; only their hashes are stored.';

-- ---------------------------------------------------------------------------
-- 3. Preview and claim by activation code.
-- The code is short, so brute force is bounded by the app rate limiter, the
-- anti-enumeration delay below, the 7-day expiry, and the email match on
-- claim. A guessed code cannot create a membership on its own.
-- ---------------------------------------------------------------------------
create or replace function public.get_org_invitation_preview_by_code(
  p_code text
)
returns table (
  org_slug text,
  org_name text,
  org_type text,
  member_role text,
  email_hint text,
  expires_at timestamptz
)
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  normalized text := public.normalize_activation_code(p_code);
begin
  perform pg_sleep(0.15);
  if length(normalized) <> 8 then
    return;
  end if;

  return query
    select
      o.slug,
      o.name,
      o.type,
      i.role,
      left(split_part(i.email, '@', 1), 1)
        || '***@'
        || split_part(i.email, '@', 2),
      i.expires_at
    from public.org_invitations i
    join public.organizations o on o.id = i.org_id
    where i.activation_code_hash = encode(digest(normalized, 'sha256'), 'hex')
      and i.status = 'pending'
      and i.expires_at > now()
    limit 1;
end;
$$;

revoke all on function public.get_org_invitation_preview_by_code(text)
  from public;
grant execute on function public.get_org_invitation_preview_by_code(text)
  to anon, authenticated;

create or replace function public.claim_org_invitation_by_code(p_code text)
returns table (org_id uuid, org_slug text, org_name text, member_role text)
language plpgsql
security definer
set search_path = public, auth, extensions
as $$
#variable_conflict use_column
declare
  target public.org_invitations%rowtype;
  viewer_email text := lower(coalesce(auth.jwt()->>'email', ''));
  normalized text := public.normalize_activation_code(p_code);
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;
  if length(normalized) <> 8 then
    raise exception 'invalid_invitation';
  end if;

  select *
  into target
  from public.org_invitations i
  where i.activation_code_hash = encode(digest(normalized, 'sha256'), 'hex')
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

revoke all on function public.claim_org_invitation_by_code(text)
  from public, anon;
grant execute on function public.claim_org_invitation_by_code(text)
  to authenticated;

comment on function public.claim_org_invitation_by_code(text) is
  'Claims a staff or student invitation from a typable activation code. Fails closed unless the signed-in email matches the invited address.';

-- ---------------------------------------------------------------------------
-- 4. Only protected founder super admins may create a district.
-- Schools, clubs, and teams keep their existing gate.
-- ---------------------------------------------------------------------------
drop policy if exists "orgs_insert_coach_or_platform_admin"
  on public.organizations;
create policy "orgs_insert_coach_or_platform_admin"
  on public.organizations for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and case
      when type = 'district' then public.is_super_admin()
      else
        public.is_platform_admin()
        or public.is_unlocked_coach(auth.uid())
    end
  );

create or replace function public.guard_organization_governance()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if (
    old.type is distinct from new.type
    or old.parent_org_id is distinct from new.parent_org_id
  ) and not public.is_platform_admin() then
    raise exception 'organization_governance_fields_locked';
  end if;

  if new.type = 'district'
     and old.type is distinct from new.type
     and not public.is_super_admin() then
    raise exception 'district_creation_requires_super_admin';
  end if;

  return new;
end;
$$;

revoke all on function public.guard_organization_governance()
  from public, anon, authenticated;
