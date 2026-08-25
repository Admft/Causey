-- Self-service account deletion. Owners must transfer organizations first.
-- Restrict FKs are reassigned to the org owner or removed before Auth delete.

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

  if exists (
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

comment on function public.delete_own_account() is
  'Deletes the current Auth user after blocking organization owners and founder super-admins.';
