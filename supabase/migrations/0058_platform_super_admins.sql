-- Founder super-admin tier on platform_admins.
-- Super admins keep every platform-admin capability, can delete users and
-- grant/revoke platform admin, and cannot be demoted or deleted in-app.

alter table public.platform_admins
  add column if not exists super_admin boolean not null default false;

create or replace function public.is_super_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.platform_admins a
    where a.profile_id = auth.uid()
      and a.super_admin
  );
$$;

revoke execute on function public.is_super_admin() from public, anon;
grant execute on function public.is_super_admin() to authenticated;

create or replace function public.guard_platform_super_admin_row()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin') then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    if old.super_admin then
      raise exception 'cannot_modify_super_admin' using errcode = '42501';
    end if;
    return old;
  end if;

  if old.super_admin and not new.super_admin then
    raise exception 'cannot_modify_super_admin' using errcode = '42501';
  end if;
  if new.super_admin and not old.super_admin then
    raise exception 'super_admin_grant_requires_migration' using errcode = '42501';
  end if;
  return new;
end;
$$;

drop trigger if exists guard_platform_super_admin_row
  on public.platform_admins;
create trigger guard_platform_super_admin_row
  before update or delete on public.platform_admins
  for each row execute function public.guard_platform_super_admin_row();

revoke execute on function public.guard_platform_super_admin_row()
  from public, anon, authenticated;

do $$
declare
  admin_email text;
  target_id uuid;
begin
  foreach admin_email in array array[
    'adam.mophat@gmail.com',
    'mcausey.th@gmail.com'
  ]
  loop
    select u.id into target_id
    from auth.users u
    join public.profiles p on p.id = u.id
    where lower(u.email) = admin_email
    limit 1;

    if target_id is null then
      raise exception
        'Create and confirm the Causey account % before applying 0058_platform_super_admins.sql',
        admin_email;
    end if;

    insert into public.platform_admins (profile_id, super_admin)
    values (target_id, true)
    on conflict (profile_id) do update
      set super_admin = true;
  end loop;
end
$$;

drop function if exists public.search_platform_users(text, integer, integer);

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
  super_admin boolean,
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
    coalesce(u.email, '')::text,
    p.display_name::text,
    p.role::text,
    p.role_unlocked,
    (a.profile_id is not null),
    coalesce(a.super_admin, false),
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

revoke execute on function public.search_platform_users(text, integer, integer)
  from public, anon;
grant execute on function public.search_platform_users(text, integer, integer)
  to authenticated;

create or replace function public.update_platform_user_access(
  p_profile_id uuid,
  p_account_role text,
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
  previous_admin boolean;
  previous_super boolean;
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

  perform pg_advisory_xact_lock(
    hashtext('causey_platform_admin_access_control')
  );

  select
    p.role,
    exists (
      select 1
      from public.platform_admins a
      where a.profile_id = p.id
    ),
    exists (
      select 1
      from public.platform_admins a
      where a.profile_id = p.id
        and a.super_admin
    )
  into previous_role, previous_admin, previous_super
  from public.profiles p
  where p.id = p_profile_id
  for update;

  if previous_role is null then
    raise exception 'profile_not_found';
  end if;

  if previous_super then
    raise exception 'cannot_modify_super_admin';
  end if;

  if previous_admin is distinct from p_platform_admin
     and not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;

  if previous_admin and not p_platform_admin then
    select count(*) into admin_count from public.platform_admins;
    if admin_count <= 1 then
      raise exception 'cannot_remove_last_platform_admin';
    end if;
  end if;

  update public.profiles
  set
    role = p_account_role,
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
      'previous_platform_admin', previous_admin,
      'platform_admin', p_platform_admin
    )
  );
end;
$$;

revoke execute on function public.update_platform_user_access(
  uuid,
  text,
  boolean
) from public, anon;
grant execute on function public.update_platform_user_access(
  uuid,
  text,
  boolean
) to authenticated;

create or replace function public.delete_platform_user(p_profile_id uuid)
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  target_email text;
  target_name text;
  target_role text;
  target_admin boolean;
  target_super boolean;
begin
  if actor is null or not public.is_super_admin() then
    raise exception 'super_admin_required';
  end if;
  if p_profile_id is null then
    raise exception 'profile_not_found';
  end if;
  if p_profile_id = actor then
    raise exception 'cannot_delete_own_account';
  end if;

  perform pg_advisory_xact_lock(
    hashtext('causey_platform_admin_access_control')
  );

  select
    p.display_name,
    p.role,
    exists (
      select 1
      from public.platform_admins a
      where a.profile_id = p.id
    ),
    exists (
      select 1
      from public.platform_admins a
      where a.profile_id = p.id
        and a.super_admin
    )
  into target_name, target_role, target_admin, target_super
  from public.profiles p
  where p.id = p_profile_id
  for update;

  if target_role is null then
    raise exception 'profile_not_found';
  end if;
  if target_super then
    raise exception 'cannot_modify_super_admin';
  end if;

  select coalesce(u.email, '')
  into target_email
  from auth.users u
  where u.id = p_profile_id;

  if target_email is null then
    raise exception 'profile_not_found';
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
    'delete_user',
    'profile',
    p_profile_id,
    jsonb_build_object(
      'email', target_email,
      'display_name', target_name,
      'account_role', target_role,
      'platform_admin', target_admin
    )
  );

  -- Reassign history that would block profile deletion (ON DELETE RESTRICT).
  update public.admin_audit_log
  set actor_id = actor
  where actor_id = p_profile_id;

  update public.provisioning_batches
  set created_by = actor
  where created_by = p_profile_id;

  update public.org_invitations
  set invited_by = actor
  where invited_by = p_profile_id;

  update public.org_announcements
  set created_by = actor
  where created_by = p_profile_id;

  update public.organization_verification_reviews
  set reviewed_by = actor
  where reviewed_by = p_profile_id;

  delete from auth.users
  where id = p_profile_id;
end;
$$;

revoke execute on function public.delete_platform_user(uuid)
  from public, anon;
grant execute on function public.delete_platform_user(uuid)
  to authenticated;

comment on function public.is_super_admin() is
  'True when the current auth.uid() is a protected founder super-admin.';
comment on function public.delete_platform_user(uuid) is
  'Permanently deletes a non-super-admin Auth user and cascaded profile for a super-admin caller.';
