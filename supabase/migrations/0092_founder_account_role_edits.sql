-- Allow account-experience (student/parent/coach) edits on founder and own
-- accounts while keeping platform/super-admin privileges locked.

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
  privilege_changed boolean;
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
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

  privilege_changed := previous_admin is distinct from p_platform_admin;

  -- Founders stay platform admins forever in-app; account experience may change.
  if previous_super and not p_platform_admin then
    raise exception 'cannot_modify_super_admin';
  end if;

  -- Own platform-admin flag is read-only; own account experience may change.
  if p_profile_id = actor and privilege_changed then
    raise exception 'cannot_change_own_access';
  end if;

  if privilege_changed and not public.is_super_admin() then
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
