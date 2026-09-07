-- National Science Bowl is a science quiz, not a mathematics contest.
-- Drop math tags left on DOE listings so the STEM Mathematics filter stays
-- for events such as Purple Comet.

update public.competitions
set
  details = jsonb_set(
    coalesce(details, '{}'::jsonb),
    '{facets}',
    (
      select coalesce(
        jsonb_agg(to_jsonb(kept.facet) order by kept.min_ord),
        '["science"]'::jsonb
      )
      from (
        select
          raw.facet,
          min(raw.ordinality) as min_ord
        from jsonb_array_elements_text(coalesce(details->'facets', '[]'::jsonb))
          with ordinality as raw(facet, ordinality)
        where raw.facet not in (
          'mathematics',
          'math_team',
          'math_contest',
          'math_modeling'
        )
        group by 1
      ) as kept
    ),
    true
  ),
  updated_at = now()
where source = 'doe_science_bowl_scrape'
  and details->'facets' ?| array[
    'mathematics',
    'math_team',
    'math_contest',
    'math_modeling'
  ];
