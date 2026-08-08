-- Match the account-directory RPC's declared text columns exactly.
-- auth.users.email is varchar in Supabase, and PL/pgSQL RETURN QUERY does not
-- implicitly accept it for a text output column.

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
    coalesce(u.email, '')::text,
    p.display_name::text,
    p.role::text,
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

revoke execute on function public.search_platform_users(text, integer, integer)
  from public, anon;
grant execute on function public.search_platform_users(text, integer, integer)
  to authenticated;
