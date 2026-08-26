-- Public event comments, nearest-zip lookup for location capture, and
-- rate-limit buckets for those writes. Comments are visible to anyone who
-- can already see the competition (RLS exists-check). Author label is a
-- display-name snapshot so other profile fields never leak.

create table if not exists public.competition_comments (
  id uuid primary key default gen_random_uuid(),
  competition_id uuid not null references public.competitions (id) on delete cascade,
  user_id uuid not null references public.profiles (id) on delete cascade,
  body text not null,
  author_label text not null,
  created_at timestamptz not null default now(),
  constraint competition_comments_body_len
    check (char_length(body) between 1 and 800),
  constraint competition_comments_author_label_len
    check (char_length(author_label) between 1 and 80)
);

create index if not exists competition_comments_event_created_idx
  on public.competition_comments (competition_id, created_at);

comment on table public.competition_comments is
  'Signed-in notes on a competition page. Not a messenger; no private threads.';

alter table public.competition_comments enable row level security;

revoke all on table public.competition_comments from public, anon, authenticated;
grant select on table public.competition_comments to anon, authenticated;
grant insert, delete on table public.competition_comments to authenticated;

create or replace function public.stamp_competition_comment()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
declare
  label text;
begin
  if auth.uid() is distinct from new.user_id then
    raise exception 'comment_author_mismatch' using errcode = '42501';
  end if;

  new.body := btrim(new.body);
  if new.body is null or char_length(new.body) < 1 then
    raise exception 'comment_body_required' using errcode = '23514';
  end if;
  if char_length(new.body) > 800 then
    raise exception 'comment_body_too_long' using errcode = '23514';
  end if;

  select nullif(btrim(display_name), '')
    into label
  from public.profiles
  where id = new.user_id;

  new.author_label := left(coalesce(label, 'Member'), 80);
  new.created_at := now();
  return new;
end;
$$;

drop trigger if exists stamp_competition_comment on public.competition_comments;
create trigger stamp_competition_comment
  before insert on public.competition_comments
  for each row
  execute function public.stamp_competition_comment();

create policy "comments_select_if_competition_visible"
  on public.competition_comments for select
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = competition_id
    )
  );

create policy "comments_insert_own"
  on public.competition_comments for insert
  to authenticated
  with check (
    auth.uid() = user_id
    and exists (
      select 1
      from public.competitions c
      where c.id = competition_id
    )
  );

create policy "comments_delete_own_or_platform_admin"
  on public.competition_comments for delete
  to authenticated
  using (
    auth.uid() = user_id
    or public.is_platform_admin()
  );

-- KNN zip lookup for browser geolocation → profile/signup zip.
create index if not exists zips_earth_idx
  on public.zips using gist (ll_to_earth(lat, lng));

create or replace function public.nearest_zip(
  p_lat double precision,
  p_lng double precision
)
returns text
language sql
stable
security invoker
set search_path = public
as $$
  select z.zip
  from public.zips z
  where p_lat is not null
    and p_lng is not null
    and p_lat between -90 and 90
    and p_lng between -180 and 180
  order by ll_to_earth(z.lat, z.lng) <-> ll_to_earth(p_lat, p_lng)
  limit 1;
$$;

revoke all on function public.nearest_zip(double precision, double precision)
  from public;
grant execute on function public.nearest_zip(double precision, double precision)
  to anon, authenticated;

comment on function public.nearest_zip(double precision, double precision) is
  'Returns the closest seeded US ZIP to a WGS84 point, or null when zips are empty.';

create or replace function public.consume_rate_limit(
  p_bucket text,
  p_actor_key text,
  p_max integer,
  p_window_seconds integer
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  window_seconds integer := greatest(coalesce(p_window_seconds, 60), 1);
  max_hits integer := greatest(coalesce(p_max, 1), 1);
  window_ts timestamptz;
  current_count integer;
begin
  if p_bucket not in (
    'search',
    'signup',
    'join_code',
    'claim',
    'csv_import',
    'comment',
    'geo'
  ) then
    raise exception 'invalid_rate_limit_bucket';
  end if;
  if p_actor_key is null or length(p_actor_key) < 8 or length(p_actor_key) > 200 then
    raise exception 'invalid_rate_limit_actor';
  end if;

  window_ts := to_timestamp(
    floor(extract(epoch from clock_timestamp()) / window_seconds) * window_seconds
  );

  insert into public.rate_limit_buckets as bucket
    (bucket, actor_key, window_start, hit_count)
  values (p_bucket, p_actor_key, window_ts, 1)
  on conflict (bucket, actor_key, window_start)
  do update set hit_count = bucket.hit_count + 1
  returning bucket.hit_count into current_count;

  return current_count <= max_hits;
end;
$$;

revoke all on function public.consume_rate_limit(text, text, integer, integer)
  from public;
grant execute on function public.consume_rate_limit(text, text, integer, integer)
  to anon, authenticated;
