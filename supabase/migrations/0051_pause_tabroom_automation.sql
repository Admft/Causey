-- Pause Tabroom refresh until Causey has written NSDA permission.
-- Current NSDA Terms expressly apply to tabroom.com and prohibit automated
-- access plus commercial/public reuse.
--
-- Archive only rows whose primary competition source is Tabroom. A manual or
-- organizer competition may retain a Tabroom competition_sources sighting
-- without being hidden. Provenance and scrape-run audit rows are not deleted.

update public.ingestion_sources
set
  blurb = 'Reference link only. Automated access and public reuse are paused pending written NSDA permission; previously indexed primary Tabroom listings were archived.',
  status = 'soon'
where id = 'tabroom_scrape';

update public.competitions
set
  status = 'archived',
  details = coalesce(details, '{}'::jsonb) || jsonb_build_object(
    'source_availability',
    'archived pending written NSDA permission',
    'access_remediation',
    jsonb_build_object(
      'reason', 'NSDA terms prohibit automated Tabroom access and commercial/public reuse',
      'migration', '0051_pause_tabroom_automation'
    )
  )
where source = 'tabroom_scrape'
  and status <> 'archived';
