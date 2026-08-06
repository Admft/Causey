-- Allow unsigned invitees to preview an org by join code (name/type/state only).
-- Join itself still requires authentication via join_org_with_code.
-- Rate damper (pg_sleep) stays; guessing still returns empty, not an error.

create or replace function public.get_org_preview_by_code(p_code text)
returns table (id uuid, name text, type text, state text)
language plpgsql security definer set search_path = public
as $$
declare
  normalized text := upper(regexp_replace(coalesce(p_code, ''), '[^A-Za-z0-9]', '', 'g'));
begin
  perform pg_sleep(0.15);
  return query
    select o.id, o.name, o.type, o.state
    from organizations o
    where o.join_code = normalized;
end;
$$;

revoke execute on function public.get_org_preview_by_code(text) from public;
grant execute on function public.get_org_preview_by_code(text) to anon, authenticated;
