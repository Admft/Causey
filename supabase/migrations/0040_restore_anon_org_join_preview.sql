-- Public join links must be able to resolve a current non-district
-- organization before asking a visitor to create an account. Joining still
-- requires authentication through join_org_with_code.

create or replace function public.get_org_preview_by_code(p_code text)
returns table (id uuid, name text, type text, state text)
language plpgsql
security definer
set search_path = public
as $$
declare
  normalized text := upper(
    regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g')
  );
begin
  perform pg_sleep(0.15);
  return query
    select o.id, o.name, o.type, o.state
    from public.organizations o
    where o.join_code = normalized
      and o.type <> 'district';
end;
$$;

revoke execute on function public.get_org_preview_by_code(text) from public;
grant execute on function public.get_org_preview_by_code(text)
  to anon, authenticated;
