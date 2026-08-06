-- Rank discovery with real, de-duplicated interest instead of fabricated
-- popularity. One person counts once per tournament whether they save it,
-- start external registration, or do both.

alter table public.competitions
  add column if not exists interest_count integer not null default 0
    check (interest_count >= 0);

comment on column public.competitions.interest_count is
  'Distinct users who saved the tournament or opened/confirmed external registration. Maintained by database triggers.';

create index if not exists saved_competitions_competition_idx
  on public.saved_competitions (competition_id);

create index if not exists external_registrations_competition_idx
  on public.external_registrations (competition_id);

create index if not exists competitions_interest_start_idx
  on public.competitions (status, interest_count desc, start_date, id);

create or replace function public.refresh_competition_interest_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  target_competition_id uuid;
begin
  if tg_op = 'DELETE' then
    target_competition_id := old.competition_id;
  else
    target_competition_id := new.competition_id;
  end if;

  update public.competitions c
  set interest_count = (
    select count(*)::integer
    from (
      select s.user_id
      from public.saved_competitions s
      where s.competition_id = target_competition_id

      union

      select r.user_id
      from public.external_registrations r
      where r.competition_id = target_competition_id
        and r.status in ('opened', 'registered')
    ) interested_users
  )
  where c.id = target_competition_id;

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.refresh_competition_interest_count()
  from public, anon, authenticated;

drop trigger if exists saved_competitions_refresh_interest
  on public.saved_competitions;
create trigger saved_competitions_refresh_interest
  after insert or delete
  on public.saved_competitions
  for each row execute function public.refresh_competition_interest_count();

drop trigger if exists external_registrations_refresh_interest
  on public.external_registrations;
create trigger external_registrations_refresh_interest
  after insert or delete or update of status
  on public.external_registrations
  for each row execute function public.refresh_competition_interest_count();

-- Backfill only tournaments with existing interest; the new column default
-- already covers every other row without rewriting its updated_at timestamp.
with interest_counts as (
  select interested.competition_id, count(distinct interested.user_id)::integer as interest_count
  from (
    select competition_id, user_id
    from public.saved_competitions

    union all

    select competition_id, user_id
    from public.external_registrations
    where status in ('opened', 'registered')
  ) interested
  group by interested.competition_id
)
update public.competitions c
set interest_count = counts.interest_count
from interest_counts counts
where c.id = counts.competition_id
  and c.interest_count is distinct from counts.interest_count;

-- Ranking data is system-maintained. Keep organizer edits on the fields the
-- tournament workflow owns while preventing clients from setting popularity.
revoke update on public.competitions from anon, authenticated;
grant update (
  slug,
  name,
  category,
  organizer_name,
  venue_name,
  address,
  city,
  state,
  zip,
  lat,
  lng,
  start_date,
  end_date,
  reg_deadline,
  reg_url,
  entry_fee_cents,
  rated,
  rating_system,
  series_id,
  status,
  image_url,
  visibility,
  org_id,
  details
) on public.competitions to authenticated;
