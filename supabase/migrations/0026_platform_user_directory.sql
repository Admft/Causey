-- Platform-admin account directory and audited access management.
-- Email stays in auth.users and is exposed only through admin-checked RPCs.

create or replace function public.search_platform_users(
  p_query text default '',
  p_limit integer default 50,
  p_offset integer default 0
)
returns table (
  profile_id uuid,
  email text,
  display_name text,
  account_role text,
  role_unlocked boolean,
  platform_admin boolean,
  created_at timestamptz,
  total_count bigint
)
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
  query_text text := lower(trim(coalesce(p_query, '')));
  safe_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
  safe_offset integer := greatest(coalesce(p_offset, 0), 0);
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  return query
  select
    p.id,
    coalesce(u.email, ''),
    p.display_name,
    p.role,
    p.role_unlocked,
    (a.profile_id is not null),
    p.created_at,
    count(*) over()
  from public.profiles p
  join auth.users u on u.id = p.id
  left join public.platform_admins a on a.profile_id = p.id
  where query_text = ''
     or position(query_text in lower(coalesce(p.display_name, ''))) > 0
     or position(query_text in lower(coalesce(u.email, ''))) > 0
  order by lower(coalesce(p.display_name, '')), lower(coalesce(u.email, ''))
  limit safe_limit
  offset safe_offset;
end;
$$;

create or replace function public.update_platform_user_access(
  p_profile_id uuid,
  p_account_role text,
  p_role_unlocked boolean,
  p_platform_admin boolean
)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  previous_role text;
  previous_unlocked boolean;
  previous_admin boolean;
  next_unlocked boolean;
  admin_count integer;
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;
  if p_profile_id = actor then
    raise exception 'cannot_change_own_access';
  end if;
  if p_account_role not in ('student', 'parent', 'coach') then
    raise exception 'invalid_account_role';
  end if;
  if p_platform_admin is null then
    raise exception 'platform_admin_flag_required';
  end if;

  select
    p.role,
    p.role_unlocked,
    exists (
      select 1
      from public.platform_admins a
      where a.profile_id = p.id
    )
  into previous_role, previous_unlocked, previous_admin
  from public.profiles p
  where p.id = p_profile_id
  for update;

  if previous_role is null then
    raise exception 'profile_not_found';
  end if;

  next_unlocked := p_account_role = 'coach' and coalesce(p_role_unlocked, false);

  if previous_admin and not p_platform_admin then
    select count(*) into admin_count from public.platform_admins;
    if admin_count <= 1 then
      raise exception 'cannot_remove_last_platform_admin';
    end if;
  end if;

  update public.profiles
  set
    role = p_account_role,
    role_unlocked = next_unlocked,
    updated_at = now()
  where id = p_profile_id;

  if p_platform_admin then
    insert into public.platform_admins (profile_id)
    values (p_profile_id)
    on conflict (profile_id) do nothing;
  else
    delete from public.platform_admins
    where profile_id = p_profile_id;
  end if;

  insert into public.admin_audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    actor,
    'update_access',
    'profile',
    p_profile_id,
    jsonb_build_object(
      'previous_role', previous_role,
      'account_role', p_account_role,
      'previous_role_unlocked', previous_unlocked,
      'role_unlocked', next_unlocked,
      'previous_platform_admin', previous_admin,
      'platform_admin', p_platform_admin
    )
  );
end;
$$;

revoke execute on function public.search_platform_users(text, integer, integer)
  from public, anon;
grant execute on function public.search_platform_users(text, integer, integer)
  to authenticated;

revoke execute on function public.update_platform_user_access(
  uuid,
  text,
  boolean,
  boolean
) from public, anon;
grant execute on function public.update_platform_user_access(
  uuid,
  text,
  boolean,
  boolean
) to authenticated;
