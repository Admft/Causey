-- Accounts: profiles + favorites + difficulty ratings (student MVP).
-- Coach/parent roles exist on profiles but product features stay locked.
-- Run in Supabase SQL editor after 0001–0008.

create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role text not null check (role in ('student', 'coach', 'parent')),
  display_name text not null default '',
  age_band text check (
    age_band is null
    or age_band in ('u10', 'u12', 'u14', 'u18', '18plus')
  ),
  state text check (state is null or char_length(state) = 2),
  zip text check (zip is null or zip ~ '^\d{5}$'),
  interests text[] not null default '{}',
  role_unlocked boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column public.profiles.role_unlocked is
  'Students are unlocked on signup. Coach/parent stay false until maker/family ships.';

create table if not exists public.saved_competitions (
  user_id uuid not null references public.profiles (id) on delete cascade,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, competition_id)
);

create table if not exists public.competition_ratings (
  user_id uuid not null references public.profiles (id) on delete cascade,
  competition_id uuid not null references public.competitions (id) on delete cascade,
  score smallint not null check (score between 1 and 10),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (user_id, competition_id)
);

create index if not exists saved_competitions_user_idx
  on public.saved_competitions (user_id);
create index if not exists competition_ratings_competition_idx
  on public.competition_ratings (competition_id);

alter table public.profiles enable row level security;
alter table public.saved_competitions enable row level security;
alter table public.competition_ratings enable row level security;

create policy "profiles_select_own"
  on public.profiles for select
  using (auth.uid() = id);

create policy "profiles_update_own"
  on public.profiles for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

create policy "profiles_insert_own"
  on public.profiles for insert
  with check (auth.uid() = id);

create policy "saved_select_own"
  on public.saved_competitions for select
  using (auth.uid() = user_id);

create policy "saved_insert_own"
  on public.saved_competitions for insert
  with check (auth.uid() = user_id);

create policy "saved_delete_own"
  on public.saved_competitions for delete
  using (auth.uid() = user_id);

create policy "ratings_select_own"
  on public.competition_ratings for select
  using (auth.uid() = user_id);

create policy "ratings_insert_own"
  on public.competition_ratings for insert
  with check (auth.uid() = user_id);

create policy "ratings_update_own"
  on public.competition_ratings for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create policy "ratings_delete_own"
  on public.competition_ratings for delete
  using (auth.uid() = user_id);

-- Auto-create profile from signup metadata.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  unlocked boolean;
begin
  if chosen_role not in ('student', 'coach', 'parent') then
    chosen_role := 'student';
  end if;
  unlocked := (chosen_role = 'student');

  insert into public.profiles (id, role, display_name, age_band, state, zip, interests, role_unlocked)
  values (
    new.id,
    chosen_role,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    nullif(new.raw_user_meta_data->>'age_band', ''),
    nullif(new.raw_user_meta_data->>'state', ''),
    nullif(new.raw_user_meta_data->>'zip', ''),
    case
      when new.raw_user_meta_data ? 'interests'
        then array(select jsonb_array_elements_text(new.raw_user_meta_data->'interests'))
      else array['chess']::text[]
    end,
    unlocked
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
