-- Trustworthy staff invitation preview and account-persona handoff.
-- Run after 0028_effective_organization_authority.sql.

create or replace function public.get_org_invitation_preview(p_token text)
returns table (
  org_slug text,
  org_name text,
  org_type text,
  member_role text,
  email_hint text,
  expires_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
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
  where i.token_hash = encode(
      digest(coalesce(p_token, ''), 'sha256'),
      'hex'
    )
    and i.status = 'pending'
    and i.expires_at > now()
  limit 1;
$$;

revoke execute on function public.get_org_invitation_preview(text)
  from public;
grant execute on function public.get_org_invitation_preview(text)
  to anon, authenticated;

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

  -- Account role chooses the landing experience; scoped authority remains in
  -- org_memberships. Staff invitations should never leave an administrator in
  -- the student/DOB onboarding persona.
  if target.role in (
    'assistant_coach', 'coach', 'school_admin', 'district_admin'
  ) then
    update public.profiles
    set role = 'coach', updated_at = now()
    where id = auth.uid()
      and role <> 'coach';
  end if;

  update public.org_invitations
  set status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  where id = target.id;

  return query
  select o.id, o.slug, o.name, target.role
  from public.organizations o
  where o.id = target.org_id;
end;
$$;

revoke execute on function public.claim_org_invitation(text)
  from public, anon;
grant execute on function public.claim_org_invitation(text)
  to authenticated;
