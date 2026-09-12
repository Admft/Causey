-- Admin/self account deletion must not hard-fail when
-- organization_verification_reviews was never applied on a database.
-- PL/pgSQL resolves that relation at runtime, so guard with to_regclass.

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

  if to_regclass('public.organization_verification_reviews') is not null then
    update public.organization_verification_reviews
    set reviewed_by = actor
    where reviewed_by = p_profile_id;
  end if;

  delete from auth.users
  where id = p_profile_id;
end;
$$;

revoke execute on function public.delete_platform_user(uuid)
  from public, anon;
grant execute on function public.delete_platform_user(uuid)
  to authenticated;

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  actor uuid := auth.uid();
  owned_name text;
begin
  if actor is null then
    raise exception 'not_authenticated';
  end if;
  if public.is_super_admin() then
    raise exception 'cannot_delete_super_admin';
  end if;

  select o.name
    into owned_name
  from public.organizations o
  where o.owner_profile_id = actor
  order by o.name
  limit 1;

  if owned_name is not null then
    raise exception 'owns_organization' using hint = owned_name;
  end if;

  if to_regclass('public.organization_verification_reviews') is not null
     and exists (
       select 1
       from public.organization_verification_reviews
       where reviewed_by = actor
     ) then
    raise exception 'account_has_review_history';
  end if;

  update public.org_invitations invitation
  set invited_by = org.owner_profile_id
  from public.organizations org
  where invitation.org_id = org.id
    and invitation.invited_by = actor
    and org.owner_profile_id is distinct from actor
    and org.owner_profile_id is not null;

  delete from public.org_invitations
  where invited_by = actor;

  update public.org_announcements announcement
  set created_by = org.owner_profile_id
  from public.organizations org
  where announcement.org_id = org.id
    and announcement.created_by = actor
    and org.owner_profile_id is distinct from actor
    and org.owner_profile_id is not null;

  delete from public.org_announcements
  where created_by = actor;

  update public.provisioning_batches batch
  set created_by = org.owner_profile_id
  from public.organizations org
  where batch.org_id = org.id
    and batch.created_by = actor
    and org.owner_profile_id is distinct from actor
    and org.owner_profile_id is not null;

  delete from public.provisioning_batches
  where created_by = actor;

  delete from public.admin_audit_log
  where actor_id = actor;

  delete from auth.users
  where id = actor;
end;
$$;

revoke all on function public.delete_own_account() from public, anon;
grant execute on function public.delete_own_account() to authenticated;
