-- Indexed, platform-admin-only user directory filters.
-- District scope includes direct district memberships and connected schools.
-- Household links never imply district or school membership.

create extension if not exists pg_trgm;

create index if not exists profiles_display_name_trgm_idx
  on public.profiles using gin (lower(coalesce(display_name, '')) gin_trgm_ops);

-- auth.users is owned by Supabase's managed auth role, so project migrations
-- must not add indexes to it. Email remains available only inside the
-- platform-admin SECURITY DEFINER search function below.

create index if not exists profiles_role_name_idx
  on public.profiles (role, lower(coalesce(display_name, '')), id);

create index if not exists profiles_directory_name_idx
  on public.profiles (lower(coalesce(display_name, '')), id);

create index if not exists org_memberships_directory_idx
  on public.org_memberships (org_id, status, role, profile_id);

create index if not exists org_memberships_profile_directory_idx
  on public.org_memberships (profile_id, status, role, org_id);

create index if not exists organizations_type_name_idx
  on public.organizations (type, lower(name), id);

create index if not exists organizations_name_trgm_idx
  on public.organizations using gin (lower(name) gin_trgm_ops);

create or replace function public.search_admin_organization_scopes(
  p_query text default '',
  p_kind text default 'all',
  p_limit integer default 20
)
returns table (
  id uuid,
  name text,
  slug text,
  type text,
  state text,
  parent_org_id uuid,
  parent_name text
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  query_text text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 20), 1), 30);
  kind_filter text := lower(trim(coalesce(p_kind, 'all')));
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;
  if kind_filter not in ('all', 'district') then
    raise exception 'invalid_scope_kind';
  end if;

  return query
  select
    o.id,
    o.name::text,
    o.slug::text,
    o.type::text,
    o.state::text,
    o.parent_org_id,
    parent.name::text
  from public.organizations o
  left join public.organizations parent on parent.id = o.parent_org_id
  where (kind_filter = 'all' or o.type = 'district')
    and (
      query_text = ''
      or lower(o.name) like '%' || query_text || '%'
      or lower(o.slug) like '%' || query_text || '%'
      or lower(coalesce(parent.name, '')) like '%' || query_text || '%'
    )
  order by
    case o.type
      when 'district' then 0
      when 'school' then 1
      when 'club' then 2
      else 3
    end,
    lower(o.name),
    o.id
  limit safe_limit;
end;
$$;

revoke execute on function public.search_admin_organization_scopes(
  text, text, integer
) from public, anon;
grant execute on function public.search_admin_organization_scopes(
  text, text, integer
) to authenticated;

comment on function public.search_admin_organization_scopes(
  text, text, integer
) is
  'Platform-admin only. Small indexed lookup for district or exact-organization user filters.';

create or replace function public.search_platform_users_filtered(
  p_query text default '',
  p_limit integer default 50,
  p_access text default 'all',
  p_district_id uuid default null,
  p_org_id uuid default null,
  p_org_type text default null,
  p_account_role text default null,
  p_membership_role text default null,
  p_membership_status text default null,
  p_cursor_name text default null,
  p_cursor_email text default null,
  p_cursor_id uuid default null,
  p_direction text default 'next'
)
returns table (
  profile_id uuid,
  email text,
  display_name text,
  account_role text,
  role_unlocked boolean,
  platform_admin boolean,
  super_admin boolean,
  created_at timestamptz,
  matching_memberships jsonb,
  total_count bigint,
  has_more boolean
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  query_text text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  access_filter text := lower(trim(coalesce(p_access, 'all')));
  org_type_filter text := nullif(lower(trim(coalesce(p_org_type, ''))), '');
  account_role_filter text := nullif(lower(trim(coalesce(p_account_role, ''))), '');
  membership_role_filter text := nullif(lower(trim(coalesce(p_membership_role, ''))), '');
  membership_status_filter text := nullif(lower(trim(coalesce(p_membership_status, ''))), '');
  direction_filter text := lower(trim(coalesce(p_direction, 'next')));
  has_membership_filter boolean :=
    p_district_id is not null
    or p_org_id is not null
    or org_type_filter is not null
    or membership_role_filter is not null
    or membership_status_filter is not null;
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;
  if access_filter not in ('all', 'admins') then
    raise exception 'invalid_access_filter';
  end if;
  if org_type_filter is not null
     and org_type_filter not in ('district', 'school', 'club', 'team') then
    raise exception 'invalid_org_type';
  end if;
  if account_role_filter is not null
     and account_role_filter not in ('student', 'parent', 'coach') then
    raise exception 'invalid_account_role';
  end if;
  if membership_role_filter is not null
     and membership_role_filter not in (
       'student',
       'assistant_coach',
       'coach',
       'school_admin',
       'district_admin',
       'admin'
     ) then
    raise exception 'invalid_membership_role';
  end if;
  if membership_status_filter is not null
     and membership_status_filter not in ('active', 'invited', 'removed') then
    raise exception 'invalid_membership_status';
  end if;
  if direction_filter not in ('next', 'previous') then
    raise exception 'invalid_cursor_direction';
  end if;
  if (p_cursor_name is null or p_cursor_email is null or p_cursor_id is null)
     and not (
       p_cursor_name is null and p_cursor_email is null and p_cursor_id is null
     ) then
    raise exception 'incomplete_cursor';
  end if;
  if p_district_id is not null and not exists (
    select 1
    from public.organizations district
    where district.id = p_district_id and district.type = 'district'
  ) then
    raise exception 'district_not_found';
  end if;
  if p_org_id is not null and not exists (
    select 1 from public.organizations organization where organization.id = p_org_id
  ) then
    raise exception 'organization_not_found';
  end if;

  return query
  with filtered as (
    select
      profile.id as profile_id,
      coalesce(auth_user.email, '')::text as email,
      coalesce(profile.display_name, '')::text as display_name,
      profile.role::text as account_role,
      profile.role_unlocked,
      (platform.profile_id is not null) as platform_admin,
      coalesce(platform.super_admin, false) as super_admin,
      profile.created_at,
      lower(coalesce(profile.display_name, '')) as sort_name,
      lower(coalesce(auth_user.email, '')) as sort_email,
      count(*) over() as total_count
    from public.profiles profile
    join auth.users auth_user on auth_user.id = profile.id
    left join public.platform_admins platform on platform.profile_id = profile.id
    where (access_filter = 'all' or platform.profile_id is not null)
      and (account_role_filter is null or profile.role = account_role_filter)
      and (
        query_text = ''
        or lower(coalesce(profile.display_name, '')) like '%' || query_text || '%'
        or lower(coalesce(auth_user.email, '')) like '%' || query_text || '%'
      )
      and (
        not has_membership_filter
        or exists (
          select 1
          from public.org_memberships membership
          join public.organizations organization
            on organization.id = membership.org_id
          where membership.profile_id = profile.id
            and (p_org_id is null or organization.id = p_org_id)
            and (
              p_district_id is null
              or organization.id = p_district_id
              or organization.parent_org_id = p_district_id
            )
            and (org_type_filter is null or organization.type = org_type_filter)
            and (
              membership_role_filter is null
              or membership.role = membership_role_filter
            )
            and (
              membership_status_filter is null
              or membership.status = membership_status_filter
            )
        )
      )
  ),
  cursor_page as (
    select filtered.*
    from filtered
    where p_cursor_id is null
      or (
        direction_filter = 'next'
        and (filtered.sort_name, filtered.sort_email, filtered.profile_id) >
          (lower(p_cursor_name), lower(p_cursor_email), p_cursor_id)
      )
      or (
        direction_filter = 'previous'
        and (filtered.sort_name, filtered.sort_email, filtered.profile_id) <
          (lower(p_cursor_name), lower(p_cursor_email), p_cursor_id)
      )
    order by
      case when direction_filter = 'next' then filtered.sort_name end asc,
      case when direction_filter = 'next' then filtered.sort_email end asc,
      case when direction_filter = 'next' then filtered.profile_id end asc,
      case when direction_filter = 'previous' then filtered.sort_name end desc,
      case when direction_filter = 'previous' then filtered.sort_email end desc,
      case when direction_filter = 'previous' then filtered.profile_id end desc
    limit safe_limit + 1
  ),
  selected as (
    select cursor_page.*
    from cursor_page
    order by
      case when direction_filter = 'next' then cursor_page.sort_name end asc,
      case when direction_filter = 'next' then cursor_page.sort_email end asc,
      case when direction_filter = 'next' then cursor_page.profile_id end asc,
      case when direction_filter = 'previous' then cursor_page.sort_name end desc,
      case when direction_filter = 'previous' then cursor_page.sort_email end desc,
      case when direction_filter = 'previous' then cursor_page.profile_id end desc
    limit safe_limit
  )
  select
    selected.profile_id,
    selected.email,
    selected.display_name,
    selected.account_role,
    selected.role_unlocked,
    selected.platform_admin,
    selected.super_admin,
    selected.created_at,
    case
      when has_membership_filter then coalesce(matched.items, '[]'::jsonb)
      else '[]'::jsonb
    end as matching_memberships,
    selected.total_count,
    exists (select 1 from cursor_page offset safe_limit) as has_more
  from selected
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'org_id', matching_org.id,
        'org_name', matching_org.name,
        'org_slug', matching_org.slug,
        'org_type', matching_org.type,
        'parent_org_id', matching_org.parent_org_id,
        'parent_name', matching_parent.name,
        'role', matching_membership.role,
        'status', matching_membership.status
      )
      order by lower(matching_org.name), matching_org.id
    ) as items
    from public.org_memberships matching_membership
    join public.organizations matching_org
      on matching_org.id = matching_membership.org_id
    left join public.organizations matching_parent
      on matching_parent.id = matching_org.parent_org_id
    where matching_membership.profile_id = selected.profile_id
      and (p_org_id is null or matching_org.id = p_org_id)
      and (
        p_district_id is null
        or matching_org.id = p_district_id
        or matching_org.parent_org_id = p_district_id
      )
      and (org_type_filter is null or matching_org.type = org_type_filter)
      and (
        membership_role_filter is null
        or matching_membership.role = membership_role_filter
      )
      and (
        membership_status_filter is null
        or matching_membership.status = membership_status_filter
      )
  ) matched on true
  order by selected.sort_name, selected.sort_email, selected.profile_id;
end;
$$;

revoke execute on function public.search_platform_users_filtered(
  text, integer, text, uuid, uuid, text, text, text, text,
  text, text, uuid, text
) from public, anon;
grant execute on function public.search_platform_users_filtered(
  text, integer, text, uuid, uuid, text, text, text, text,
  text, text, uuid, text
) to authenticated;

comment on function public.search_platform_users_filtered(
  text, integer, text, uuid, uuid, text, text, text, text,
  text, text, uuid, text
) is
  'Platform-admin only. Indexed, keyset-paginated account search with exact organization and district-tree membership filters.';
