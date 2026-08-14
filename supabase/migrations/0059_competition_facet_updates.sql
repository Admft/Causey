-- Organizer edits can persist category discipline tags in details.facets
-- without replacing the rest of the versioned details envelope.

create or replace function public.update_competition_with_sections(
  p_competition_id uuid,
  p_values jsonb,
  p_sections jsonb default null
)
returns text
language plpgsql security definer set search_path = public
as $$
declare
  updated_slug text;
  next_facets jsonb;
begin
  if not public.can_manage_competition(p_competition_id, auth.uid()) then
    raise exception 'Competition management access required'
      using errcode = '42501';
  end if;

  next_facets := coalesce(p_values->'facets', '[]'::jsonb);
  if jsonb_typeof(next_facets) <> 'array' then
    raise exception 'Competition facets must be an array'
      using errcode = '22023';
  end if;

  update competitions
  set
    category = p_values->>'category',
    custom_category_name = nullif(p_values->>'custom_category_name', ''),
    participation_mode = p_values->>'participation_mode',
    name = p_values->>'name',
    venue_name = nullif(p_values->>'venue_name', ''),
    address = nullif(p_values->>'address', ''),
    city = nullif(p_values->>'city', ''),
    state = nullif(p_values->>'state', ''),
    zip = nullif(p_values->>'zip', ''),
    lat = nullif(p_values->>'lat', '')::double precision,
    lng = nullif(p_values->>'lng', '')::double precision,
    start_date = (p_values->>'start_date')::date,
    end_date = nullif(p_values->>'end_date', '')::date,
    reg_deadline = nullif(p_values->>'reg_deadline', '')::date,
    reg_url = nullif(p_values->>'reg_url', ''),
    entry_fee_cents = nullif(p_values->>'entry_fee_cents', '')::integer,
    rated = (p_values->>'rated')::boolean,
    rating_system = nullif(p_values->>'rating_system', ''),
    visibility = p_values->>'visibility',
    audience = p_values->>'audience',
    details = jsonb_set(
      coalesce(details, '{}'::jsonb),
      '{facets}',
      next_facets,
      true
    ),
    updated_at = now()
  where id = p_competition_id
  returning slug into updated_slug;

  if updated_slug is null then
    raise exception 'Competition not found' using errcode = 'P0002';
  end if;

  if p_sections is not null then
    perform public.replace_competition_sections(
      p_competition_id,
      p_sections
    );
  elsif p_values->>'category' <> 'chess' then
    update sections
    set min_rating = null, max_rating = null
    where competition_id = p_competition_id;
  end if;

  return updated_slug;
end;
$$;
