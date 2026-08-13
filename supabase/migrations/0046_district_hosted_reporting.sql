-- Keep district-hosted competition activity separate from child-school rows.
-- There is no durable entrant-to-school attribution on a district-hosted
-- competition, so allocating these counts across schools would be misleading.

create or replace function public.get_district_hosted_rollup(
  p_district_id uuid
)
returns table (
  upcoming_tournaments bigint,
  invitations_pending bigint,
  going_count bigint,
  attended_this_season bigint
)
language plpgsql
stable
security definer
set search_path = public
as $$
begin
  if auth.uid() is null
     or not public.is_district_admin(p_district_id, auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  select
    count(distinct competition.id) filter (
      where competition.start_date >= current_date
        and competition.status in ('published', 'pending_review')
    ) as upcoming_tournaments,
    count(distinct (entrant.competition_id, entrant.profile_id)) filter (
      where entrant.status = 'invited'
    ) as invitations_pending,
    count(distinct (entrant.competition_id, entrant.profile_id)) filter (
      where entrant.status = 'going'
    ) as going_count,
    count(distinct (entrant.competition_id, entrant.profile_id)) filter (
      where entrant.status = 'attended'
        and competition.start_date >=
          date_trunc('year', current_date)::date
    ) as attended_this_season
  from public.competitions competition
  left join public.competition_entrants entrant
    on entrant.competition_id = competition.id
  where competition.org_id = p_district_id;
end;
$$;

revoke all on function public.get_district_hosted_rollup(uuid)
  from public, anon;
grant execute on function public.get_district_hosted_rollup(uuid)
  to authenticated;
