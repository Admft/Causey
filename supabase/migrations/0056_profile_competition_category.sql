-- Optional public-directory shortcut for account navigation.
-- Interests remain a separate multi-select preference; neither field defaults
-- existing or new accounts to chess.

alter table public.profiles
  add column if not exists preferred_competition_category text;

alter table public.profiles
  alter column preferred_competition_category drop not null,
  alter column preferred_competition_category set default null;

alter table public.profiles
  drop constraint if exists profiles_preferred_competition_category_check;
alter table public.profiles
  add constraint profiles_preferred_competition_category_check
  check (
    preferred_competition_category is null
    or preferred_competition_category in (
      'chess',
      'debate',
      'stem',
      'arts',
      'writing'
    )
  );

comment on column public.profiles.preferred_competition_category is
  'Optional single public-directory shortcut. Independent from multi-select interests.';

-- Keep the existing own-row / household read policies and own-row update policy.
-- SQL grants remain a second boundary: authenticated users may edit this
-- preference but still cannot edit role or role_unlocked.
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name,
  date_of_birth,
  age_band,
  state,
  zip,
  interests,
  preferred_competition_category,
  updated_at
) on public.profiles to authenticated;

-- Replace the effective signup trigger from 0011. Missing interests now means
-- no selected interests, and a missing shortcut remains null.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  chosen_role text := coalesce(new.raw_user_meta_data->>'role', 'student');
  dob date;
  band text;
  years int;
  preferred_category text :=
    nullif(new.raw_user_meta_data->>'preferred_competition_category', '');
  selected_interests text[] := array[]::text[];
begin
  if chosen_role not in ('student', 'coach', 'parent') then
    chosen_role := 'student';
  end if;

  begin
    dob := nullif(new.raw_user_meta_data->>'date_of_birth', '')::date;
  exception when others then
    dob := null;
  end;

  band := nullif(new.raw_user_meta_data->>'age_band', '');
  if band is null and dob is not null then
    years := date_part('year', age(current_date, dob))::int;
    if years < 10 then
      band := 'u10';
    elsif years < 12 then
      band := 'u12';
    elsif years < 14 then
      band := 'u14';
    elsif years < 18 then
      band := 'u18';
    else
      band := '18plus';
    end if;
  end if;
  if band is not null
     and band not in ('u10', 'u12', 'u14', 'u18', '18plus') then
    band := null;
  end if;

  if preferred_category is not null
     and preferred_category not in (
       'chess',
       'debate',
       'stem',
       'arts',
       'writing'
     ) then
    preferred_category := null;
  end if;

  if jsonb_typeof(new.raw_user_meta_data->'interests') = 'array' then
    selected_interests := array(
      select jsonb_array_elements_text(new.raw_user_meta_data->'interests')
    );
  end if;

  insert into public.profiles (
    id,
    role,
    display_name,
    date_of_birth,
    age_band,
    state,
    zip,
    interests,
    preferred_competition_category,
    role_unlocked
  )
  values (
    new.id,
    chosen_role,
    coalesce(new.raw_user_meta_data->>'display_name', ''),
    dob,
    band,
    nullif(new.raw_user_meta_data->>'state', ''),
    nullif(new.raw_user_meta_data->>'zip', ''),
    selected_interests,
    preferred_category,
    true
  )
  on conflict (id) do nothing;

  return new;
end;
$$;
