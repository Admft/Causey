-- IP/user request buckets for public and authenticated abuse controls.
-- Writes go through a definer RPC so anon cannot read other actors' counters.

create table if not exists public.rate_limit_buckets (
  bucket text not null,
  actor_key text not null,
  window_start timestamptz not null,
  hit_count integer not null default 0,
  primary key (bucket, actor_key, window_start)
);

alter table public.rate_limit_buckets enable row level security;

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
  if p_bucket not in ('search', 'signup', 'join_code', 'claim', 'csv_import') then
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

comment on function public.consume_rate_limit(text, text, integer, integer) is
  'Increments an allowlisted bucket and returns true when the caller is still under the max.';
