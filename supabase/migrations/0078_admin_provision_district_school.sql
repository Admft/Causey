-- Super-admin school provision under an existing district.
-- Run after 0077_add_protected_super_admin.sql.
--
-- 1. Creates a child school without stamping the founder as school_admin
--    (create_district_school does that for district office operators).
-- 2. Invites the named school administrator in the same step, returning the
--    claim token and typable activation code once.
-- 3. Lets platform admins read delegated school-admin status for the
--    /admin/organizations tree (invitations are otherwise org-admin only).

-- ---------------------------------------------------------------------------
-- 1. Provision pack: child school + school_admin invitation.
-- ---------------------------------------------------------------------------
create or replace function public.admin_provision_district_school(
  p_district_id uuid,
  p_name text,
  p_slug text,
  p_state text,
  p_email text,
  p_display_name text default null
)
returns table (
  school_id uuid,
  school_slug text,
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
  actor uuid := auth.uid();
  normalized_name text := trim(coalesce(p_name, ''));
  normalized_slug text := lower(trim(coalesce(p_slug, '')));
  normalized_state text := upper(trim(coalesce(p_state, '')));
  normalized_email text := lower(trim(coalesce(p_email, '')));
  district public.organizations%rowtype;
  created_school public.organizations%rowtype;
  raw_token text;
  raw_code text;
  new_invitation uuid;
  expiry timestamptz := now() + interval '7 days';
begin
  if actor is null or not public.is_super_admin() then
    raise exception 'super_admin_required' using errcode = '42501';
  end if;

  if char_length(normalized_name) < 2
     or char_length(normalized_name) > 80 then
    raise exception 'invalid_school_name' using errcode = '22023';
  end if;
  if normalized_slug !~ '^[a-z0-9]+(-[a-z0-9]+)*$'
     or char_length(normalized_slug) > 120 then
    raise exception 'invalid_school_slug' using errcode = '22023';
  end if;
  if normalized_state !~ '^[A-Z]{2}$' then
    raise exception 'invalid_school_state' using errcode = '22023';
  end if;
  if normalized_email !~ '^[^@\s]+@[^@\s]+\.[^@\s]+$' then
    raise exception 'invalid_email' using errcode = '22023';
  end if;

  select *
  into district
  from public.organizations
  where id = p_district_id;

  if district.id is null or district.type is distinct from 'district' then
    raise exception 'district_not_found' using errcode = '22023';
  end if;

  insert into public.organizations (
    name,
    slug,
    type,
    state,
    parent_org_id,
    created_by,
    owner_profile_id,
    verification_status
  )
  values (
    normalized_name,
    normalized_slug,
    'school',
    normalized_state,
    p_district_id,
    actor,
    coalesce(district.owner_profile_id, actor),
    'pending'
  )
  returning * into created_school;

  begin
    raw_token := encode(gen_random_bytes(32), 'hex');
    raw_code := public.generate_activation_code();

    update public.org_invitations
    set status = 'revoked', revoked_at = now()
    where org_id = created_school.id
      and lower(email) = normalized_email
      and role = 'school_admin'
      and status = 'pending';

    insert into public.org_invitations (
      org_id, email, display_name, role,
      token_hash, activation_code_hash, invited_by, expires_at
    )
    values (
      created_school.id,
      normalized_email,
      nullif(trim(coalesce(p_display_name, '')), ''),
      'school_admin',
      encode(digest(raw_token, 'sha256'), 'hex'),
      encode(digest(raw_code, 'sha256'), 'hex'),
      actor,
      expiry
    )
    returning id into new_invitation;

    insert into public.email_outbox (
      recipient_email, template, payload, dedupe_key
    )
    values (
      normalized_email,
      'organization_invitation',
      jsonb_build_object(
        'invitation_id', new_invitation,
        'claim_token', raw_token,
        'org_id', created_school.id,
        'role', 'school_admin',
        'expires_at', expiry
      ),
      'organization-invitation:' || new_invitation::text
    );
  exception
    when others then
      return query
      select
        created_school.id,
        created_school.slug,
        null::uuid,
        null::text,
        null::timestamptz,
        null::text;
      return;
  end;

  return query
  select
    created_school.id,
    created_school.slug,
    new_invitation,
    raw_token,
    expiry,
    raw_code;
end;
$$;

revoke all on function public.admin_provision_district_school(
  uuid, text, text, text, text, text
) from public, anon;
grant execute on function public.admin_provision_district_school(
  uuid, text, text, text, text, text
) to authenticated;

comment on function public.admin_provision_district_school(
  uuid, text, text, text, text, text
) is
  'Super-admin only. Creates a child school under a district and invites its named school administrator. Does not add the founder as school_admin. Returns the claim token and activation code once.';

-- ---------------------------------------------------------------------------
-- 2. School-admin staffing for the platform directory tree.
-- ---------------------------------------------------------------------------
create or replace function public.get_admin_school_staffing()
returns table (
  school_id uuid,
  pending_admin_invites integer,
  active_delegated_admins integer
)
language plpgsql
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required' using errcode = '42501';
  end if;

  return query
  select
    school.id,
    (
      select count(*)::integer
      from public.org_invitations i
      where i.org_id = school.id
        and i.role = 'school_admin'
        and i.status = 'pending'
        and i.expires_at > now()
    ),
    (
      select count(*)::integer
      from public.org_memberships m
      where m.org_id = school.id
        and m.status = 'active'
        and m.role in ('school_admin', 'admin')
        and not exists (
          select 1
          from public.organizations d
          where d.id = school.parent_org_id
            and (
              d.owner_profile_id = m.profile_id
              or exists (
                select 1
                from public.org_memberships dm
                where dm.org_id = d.id
                  and dm.profile_id = m.profile_id
                  and dm.status = 'active'
                  and dm.role in ('district_admin', 'admin')
              )
            )
        )
    )
  from public.organizations school
  where school.type = 'school'
    and school.parent_org_id is not null;
end;
$$;

revoke all on function public.get_admin_school_staffing()
  from public, anon;
grant execute on function public.get_admin_school_staffing()
  to authenticated;

comment on function public.get_admin_school_staffing() is
  'Platform-admin directory helper. Pending school-admin invites and delegated (non-district-operator) school administrators per connected school.';
