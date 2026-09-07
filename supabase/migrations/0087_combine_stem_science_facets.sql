-- Combine STEM science-fair and science-bowl tags into one Science discipline.

update public.competitions
set
  details = jsonb_set(
    coalesce(details, '{}'::jsonb),
    '{facets}',
    (
      select coalesce(
        jsonb_agg(to_jsonb(mapped.facet) order by mapped.min_ord),
        '[]'::jsonb
      )
      from (
        select
          case
            when raw.facet in ('science_fair', 'science_bowl') then 'science'
            else raw.facet
          end as facet,
          min(raw.ordinality) as min_ord
        from jsonb_array_elements_text(coalesce(details->'facets', '[]'::jsonb))
          with ordinality as raw(facet, ordinality)
        group by 1
      ) as mapped
    ),
    true
  ),
  updated_at = now()
where details->'facets' ?| array['science_fair', 'science_bowl'];
