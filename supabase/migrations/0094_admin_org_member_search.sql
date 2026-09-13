-- Platform-admin org member directory + profile contact labels.
-- Search stays scoped to one org so a 10k-member school does not load the
-- whole roster into App Store Connect or the admin page.

create index if not exists org_memberships_org_active_idx
  on public.org_memberships (org_id, role)
  where status is distinct from 'removed';

create or replace function public.get_admin_profile_contacts(
  p_profile_ids uuid[]
)
returns table (
  profile_id uuid,
  email text,
  display_name text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  return query
  select
    p.id,
    coalesce(u.email, '')::text,
    coalesce(p.display_name, '')::text
  from public.profiles p
  join auth.users u on u.id = p.id
  where p.id = any(coalesce(p_profile_ids, array[]::uuid[]));
end;
$$;

revoke execute on function public.get_admin_profile_contacts(uuid[])
  from public, anon;
grant execute on function public.get_admin_profile_contacts(uuid[])
  to authenticated;

comment on function public.get_admin_profile_contacts(uuid[]) is
  'Platform-admin only. Resolves display name + email for a small set of profile ids (org creators/owners).';

create or replace function public.search_org_members(
  p_org_id uuid,
  p_query text default '',
  p_limit integer default 25,
  p_offset integer default 0,
  p_role text default 'all'
)
returns table (
  profile_id uuid,
  email text,
  display_name text,
  account_role text,
  membership_role text,
  membership_status text,
  joined_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  query_text text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 25), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
  role_filter text := lower(trim(coalesce(p_role, 'all')));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;
  if p_org_id is null then
    raise exception 'org_id_required';
  end if;
  if role_filter not in (
    'all',
    'student',
    'assistant_coach',
    'coach',
    'school_admin',
    'district_admin',
    'admin'
  ) then
    raise exception 'invalid_membership_role';
  end if;
  if not exists (
    select 1 from public.organizations o where o.id = p_org_id
  ) then
    raise exception 'organization_not_found';
  end if;

  return query
  select
    p.id,
    coalesce(u.email, '')::text,
    coalesce(p.display_name, '')::text,
    p.role::text,
    m.role::text,
    m.status::text,
    m.created_at,
    count(*) over()
  from public.org_memberships m
  join public.profiles p on p.id = m.profile_id
  join auth.users u on u.id = p.id
  where m.org_id = p_org_id
    and m.status is distinct from 'removed'
    and (role_filter = 'all' or m.role = role_filter)
    and (
      query_text = ''
      or position(query_text in lower(coalesce(p.display_name, ''))) > 0
      or position(query_text in lower(coalesce(u.email, ''))) > 0
    )
  order by
    case m.role
      when 'admin' then 0
      when 'coach' then 1
      else 2
    end,
    lower(coalesce(p.display_name, '')),
    lower(coalesce(u.email, ''))
  limit safe_limit
  offset safe_offset;
end;
$$;

revoke execute on function public.search_org_members(
  uuid, text, integer, integer, text
) from public, anon;
grant execute on function public.search_org_members(
  uuid, text, integer, integer, text
) to authenticated;

comment on function public.search_org_members(
  uuid, text, integer, integer, text
) is
  'Platform-admin only. Paginated name/email search of non-removed org members.';
