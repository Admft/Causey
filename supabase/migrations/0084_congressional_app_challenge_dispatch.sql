-- Congressional App Challenge is a governed runnable source, so platform-admin
-- scraper dispatch may audit it. Tabroom and VEX stay absent.

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
    'uil_speech_debate_scrape',
    'purple_comet_scrape',
    'doe_science_bowl_scrape',
    'txsef_scrape',
    'congressional_app_challenge_scrape',
    'taea_vase_scrape',
    'uil_theatre_scrape',
    'uil_music_marching_scrape',
    'bennington_writers_scrape',
    'afsa_essay_scrape',
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
  'Appends an audit event after a platform admin dispatches a governed ingestion workflow.';
