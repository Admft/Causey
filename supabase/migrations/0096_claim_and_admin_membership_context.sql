-- First-session district claim: a matching signed-in mailbox can finish the
-- invitation more than once without error (email-confirm return + auto-accept).
-- Admin user search always names organization memberships, not only when an
-- organization filter is applied — otherwise a name search looks like a
-- coach account with no district office role.

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
   where i.token_hash = encode(
     extensions.digest(coalesce(p_token, ''), 'sha256'),
     'hex'
   )
   for update;

  if target.id is null or lower(target.email) <> viewer_email then
    raise exception 'invalid_invitation';
  end if;

  if target.status = 'claimed' and target.claimed_by = auth.uid() then
    return query
    select o.id, o.slug, o.name, target.role
    from public.organizations o
    where o.id = target.org_id;
    return;
  end if;

  if target.status <> 'pending' or target.expires_at <= now() then
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

revoke execute on function public.claim_org_invitation(text)
  from public, anon;
grant execute on function public.claim_org_invitation(text)
  to authenticated;

comment on function public.claim_org_invitation(text) is
  'Claims a staff or student invitation from the emailed token. The signed-in email must match. Repeating the claim as the same person is a no-op.';

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

  if target.id is null or lower(target.email) <> viewer_email then
    raise exception 'invalid_invitation';
  end if;

  if target.status = 'claimed' and target.claimed_by = auth.uid() then
    return query
    select o.id, o.slug, o.name, target.role
    from public.organizations o
    where o.id = target.org_id;
    return;
  end if;

  if target.status <> 'pending' or target.expires_at <= now() then
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
  'Claims a staff or student invitation from a typable activation code. Fails closed unless the signed-in email matches. Repeating the claim as the same person is a no-op.';

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
    coalesce(matched.items, '[]'::jsonb) as matching_memberships,
    selected.total_count,
    exists (select 1 from cursor_page offset safe_limit) as has_more
  from selected
  left join lateral (
    select jsonb_agg(
      jsonb_build_object(
        'org_id', ranked.org_id,
        'org_name', ranked.org_name,
        'org_slug', ranked.org_slug,
        'org_type', ranked.org_type,
        'parent_org_id', ranked.parent_org_id,
        'parent_name', ranked.parent_name,
        'role', ranked.role,
        'status', ranked.status
      )
      order by ranked.role_rank, ranked.status_rank, ranked.org_name, ranked.org_id
    ) as items
    from (
      select
        matching_org.id as org_id,
        matching_org.name as org_name,
        matching_org.slug as org_slug,
        matching_org.type as org_type,
        matching_org.parent_org_id,
        matching_parent.name as parent_name,
        matching_membership.role,
        matching_membership.status,
        case matching_membership.role
          when 'district_admin' then 0
          when 'school_admin' then 1
          when 'admin' then 2
          when 'coach' then 3
          when 'assistant_coach' then 4
          else 5
        end as role_rank,
        case matching_membership.status
          when 'active' then 0
          when 'invited' then 1
          else 2
        end as status_rank
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
      order by
        case matching_membership.status
          when 'active' then 0
          when 'invited' then 1
          else 2
        end,
        case matching_membership.role
          when 'district_admin' then 0
          when 'school_admin' then 1
          when 'admin' then 2
          when 'coach' then 3
          when 'assistant_coach' then 4
          else 5
        end,
        lower(matching_org.name),
        matching_org.id
      limit 3
    ) ranked
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
  'Platform-admin only. Indexed, keyset-paginated account search. Always returns up to three staff-first memberships so a name search can show district or school office roles.';
