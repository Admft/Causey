-- District-only audience is only meaningful for district hosts and
-- schools connected through parent_org_id. Clubs, teams, and standalone
-- schools must not publish that audience even if a client sends it.

create or replace function public.enforce_district_audience_requires_hierarchy()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  host_type text;
  host_parent uuid;
begin
  if new.audience is distinct from 'district' then
    return new;
  end if;

  if new.org_id is null then
    raise exception 'district audience requires a host organization'
      using errcode = 'check_violation';
  end if;

  select o.type, o.parent_org_id
    into host_type, host_parent
  from public.organizations o
  where o.id = new.org_id;

  if host_type is null then
    raise exception 'district audience requires a host organization'
      using errcode = 'check_violation';
  end if;

  if host_type = 'district' or host_parent is not null then
    return new;
  end if;

  raise exception
    'district audience needs a district host or a school connected to a district'
    using errcode = 'check_violation';
end;
$$;

drop trigger if exists competitions_district_audience_hierarchy
  on public.competitions;
create trigger competitions_district_audience_hierarchy
  before insert or update of audience, org_id
  on public.competitions
  for each row
  execute function public.enforce_district_audience_requires_hierarchy();

comment on function public.enforce_district_audience_requires_hierarchy() is
  'Fail closed: audience=district only for district orgs or schools with parent_org_id.';
