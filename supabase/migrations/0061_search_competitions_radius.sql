-- Zip search must use the earthdistance GiST index instead of downloading a
-- bounding box and haversine-filtering in the app. SECURITY INVOKER keeps
-- anon/authenticated RLS (public published vs viewer-scoped restricted).

create or replace function public.search_competitions_in_radius(
  p_lat double precision,
  p_lng double precision,
  p_radius_miles double precision,
  p_category text default null,
  p_q text default null,
  p_state text default null,
  p_source text default null,
  p_date_from date default null,
  p_date_to date default null,
  p_timing text default 'upcoming',
  p_sort text default 'popular',
  p_limit integer default 20,
  p_offset integer default 0
)
returns table (
  id uuid,
  distance_miles double precision,
  total_count bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  with origin as (
    select
      ll_to_earth(p_lat, p_lng) as earth,
      greatest(coalesce(p_radius_miles, 50), 0) * 1609.344 as radius_meters
  ),
  filtered as (
    select
      c.id,
      c.interest_count,
      c.start_date,
      case
        when c.lat is not null and c.lng is not null then
          earth_distance(
            (select earth from origin),
            ll_to_earth(c.lat, c.lng)
          ) / 1609.344
        else null
      end as distance_miles
    from public.competitions c, origin
    where c.status = 'published'
      and c.canonical_id is null
      and (p_category is null or c.category = p_category)
      and (p_state is null or c.state = p_state)
      and (p_source is null or c.source = p_source)
      and (p_date_from is null or c.start_date >= p_date_from)
      and (p_date_to is null or c.start_date <= p_date_to)
      and (
        p_q is null
        or c.name ilike
          '%' || replace(replace(replace(p_q, '\', '\\'), '%', '\%'), '_', '\_')
          || '%' escape '\'
      )
      and (
        case coalesce(p_timing, 'upcoming')
          when 'upcoming' then coalesce(c.end_date, c.start_date) >= current_date
          when 'ended' then coalesce(c.end_date, c.start_date) < current_date
          else true
        end
      )
      and (
        (
          c.lat is not null
          and c.lng is not null
          and earth_box(
            (select earth from origin),
            (select radius_meters from origin)
          ) @> ll_to_earth(c.lat, c.lng)
          and earth_distance(
            (select earth from origin),
            ll_to_earth(c.lat, c.lng)
          ) <= (select radius_meters from origin)
        )
        or (
          c.lat is null
          and c.lng is null
          and c.participation_mode = 'online'
        )
      )
  )
  select
    f.id,
    f.distance_miles,
    count(*) over() as total_count
  from filtered f
  order by
    case
      when coalesce(p_sort, 'popular') = 'soonest' then f.start_date
      else null
    end asc nulls last,
    case
      when coalesce(p_sort, 'popular') = 'soonest' then null
      else floor(coalesce(f.distance_miles, 0) / 25)
    end asc,
    case
      when coalesce(p_sort, 'popular') = 'soonest' then null
      else f.interest_count
    end desc,
    f.start_date asc,
    f.id asc
  limit least(greatest(coalesce(p_limit, 20), 1), 200)
  offset greatest(coalesce(p_offset, 0), 0);
$$;

revoke all on function public.search_competitions_in_radius(
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  integer,
  integer
) from public;
grant execute on function public.search_competitions_in_radius(
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  integer,
  integer
) to anon, authenticated;

comment on function public.search_competitions_in_radius(
  double precision,
  double precision,
  double precision,
  text,
  text,
  text,
  text,
  date,
  date,
  text,
  text,
  integer,
  integer
) is
  'Pages published competitions within radius using earthdistance; includes online events without coordinates.';
