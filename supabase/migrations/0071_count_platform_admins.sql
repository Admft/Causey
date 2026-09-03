-- Platform-admin headcount for /admin ops.
-- public.platform_admins stays revoked from authenticated (0015); the directory
-- RPC already exposes each row's flag. This count is the matching
-- security-definer path so ops never treat a permission miss as zero.

create or replace function public.count_platform_admins()
returns bigint
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  return (select count(*) from public.platform_admins);
end;
$$;

revoke execute on function public.count_platform_admins() from public, anon;
grant execute on function public.count_platform_admins() to authenticated;

comment on function public.count_platform_admins() is
  'Exact platform_admins row count for a platform-admin caller. Table grants stay revoked.';
