-- Platform-admin tournament deletion and scraper operations visibility.
--
-- Destructive deletion stays behind an admin-checked RPC so neither ordinary
-- authenticated users nor browser code receive direct DELETE access.

create or replace function public.admin_delete_competitions(
  p_competition_ids uuid[] default null,
  p_delete_all boolean default false
)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  target_ids uuid[];
  deleted_count integer := 0;
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  if p_delete_all then
    select coalesce(array_agg(c.id), '{}'::uuid[])
      into target_ids
      from public.competitions c;
  else
    target_ids := array(
      select distinct requested.id
      from unnest(coalesce(p_competition_ids, '{}'::uuid[])) as requested(id)
      limit 100
    );
  end if;

  if coalesce(cardinality(target_ids), 0) = 0 then
    return 0;
  end if;

  -- These two original-schema references do not cascade. Qualification rules
  -- are part of the deleted tournament; surviving duplicate rows become
  -- independent so deleting their former canonical record cannot block.
  delete from public.qualification_rules
    where from_competition_id = any(target_ids);

  update public.competitions
    set canonical_id = null
    where canonical_id = any(target_ids)
      and not (id = any(target_ids));

  delete from public.competitions
    where id = any(target_ids);

  get diagnostics deleted_count = row_count;
  return deleted_count;
end;
$$;

revoke execute on function public.admin_delete_competitions(uuid[], boolean)
  from public, anon;
grant execute on function public.admin_delete_competitions(uuid[], boolean)
  to authenticated;

comment on function public.admin_delete_competitions(uuid[], boolean) is
  'Permanently deletes selected or all competitions and dependent records for platform admins.';

-- Scrape runs are operational data. Platform administrators may inspect them,
-- while writes remain service-role-only through the ingestion scripts.
drop policy if exists "platform_admins_read_scrape_runs"
  on public.scrape_runs;
create policy "platform_admins_read_scrape_runs"
  on public.scrape_runs for select
  to authenticated
  using (public.is_platform_admin());

grant select on public.scrape_runs to authenticated;

-- Record which administrator dispatched a GitHub Actions scraper. The actual
-- run result remains in scrape_runs once the ingestion process starts.
create or replace function public.record_admin_scraper_dispatch(
  p_source text,
  p_repository text,
  p_ref text
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  audit_id uuid := gen_random_uuid();
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;

  if p_source not in (
    'tla_scrape',
    'cca_scrape',
    'onlinereg_scrape',
    'chess_results_scrape',
    'fide_calendar_scrape',
    'tca_scrape',
    'all'
  ) then
    raise exception 'invalid_scraper_source';
  end if;

  insert into public.admin_audit_log (
    id,
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    audit_id,
    actor,
    'dispatch_scraper',
    'scraper',
    audit_id,
    jsonb_build_object(
      'source', p_source,
      'repository', p_repository,
      'ref', p_ref
    )
  );

  return audit_id;
end;
$$;

revoke execute on function public.record_admin_scraper_dispatch(text, text, text)
  from public, anon;
grant execute on function public.record_admin_scraper_dispatch(text, text, text)
  to authenticated;

comment on function public.record_admin_scraper_dispatch(text, text, text) is
  'Appends an audit event after a platform admin dispatches an ingestion workflow.';
