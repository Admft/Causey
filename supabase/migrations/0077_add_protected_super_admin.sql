-- Grant the protected platform super-admin tier to an existing confirmed
-- Causey account. Super-admin grants stay migration-only by design.

do $$
declare
  target_email constant text := 'bamgboyedivine1@gmail.com';
  target_id uuid;
begin
  select u.id
  into target_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = lower(target_email)
    and u.email_confirmed_at is not null
  limit 1;

  if target_id is null then
    raise exception
      'Create and confirm the Causey account % before applying 0077_add_protected_super_admin.sql',
      target_email;
  end if;

  insert into public.platform_admins (profile_id, super_admin)
  values (target_id, true)
  on conflict (profile_id) do update
    set super_admin = true;
end
$$;
