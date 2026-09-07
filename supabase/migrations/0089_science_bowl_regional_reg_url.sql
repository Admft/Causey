-- Point published DOE National Science Bowl listings at the official
-- regional-competitions page. Nationals are by qualification; this is how
-- coaches find a regional and register. Individual regional bowls stay unindexed.

update public.competitions
set
  reg_url = 'https://science.osti.gov/wdts/nsb/Regional-Competitions',
  updated_at = now()
where source = 'doe_science_bowl_scrape'
  and (
    reg_url is null
    or btrim(reg_url) = ''
  );
