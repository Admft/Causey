-- Organizations (schools/clubs) + competition visibility for multi-tenant events.
-- Run after 0009_accounts.sql.
-- Scraped events stay visibility='public', org_id null (global pool).

create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  type text not null default 'school'
    check (type in ('school', 'club', 'team', 'district')),
  state text check (state is null or char_length(state) = 2),
  created_by uuid default auth.uid() references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.org_memberships (
  org_id uuid not null references public.organizations (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('student', 'coach', 'admin')),
  status text not null default 'active'
    check (status in ('active', 'invited', 'removed')),
  created_at timestamptz not null default now(),
  primary key (org_id, profile_id)
);

create index if not exists org_memberships_profile_idx
  on public.org_memberships (profile_id);

create table if not exists public.household_links (
  parent_profile_id uuid not null references public.profiles (id) on delete cascade,
  child_profile_id uuid not null references public.profiles (id) on delete cascade,
  status text not null default 'pending'
    check (status in ('pending', 'active', 'revoked')),
  created_at timestamptz not null default now(),
  primary key (parent_profile_id, child_profile_id),
  check (parent_profile_id <> child_profile_id)
);

-- Competition tenancy / visibility (global public vs org-private).
alter table public.competitions
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public', 'private'));

alter table public.competitions
  add column if not exists org_id uuid references public.organizations (id) on delete set null;

alter table public.competitions
  add column if not exists created_by uuid default auth.uid()
    references public.profiles (id) on delete set null;

alter table public.competitions
  add column if not exists details jsonb not null default '{}'::jsonb;

create index if not exists competitions_org_idx
  on public.competitions (org_id)
  where org_id is not null;

create index if not exists competitions_visibility_idx
  on public.competitions (visibility, status);

alter table public.organizations enable row level security;
alter table public.org_memberships enable row level security;
alter table public.household_links enable row level security;

-- Orgs: members can read; creators can insert/update.
create policy "orgs_select_member_or_public_name"
  on public.organizations for select
  using (
    exists (
      select 1 from public.org_memberships m
      where m.org_id = organizations.id
        and m.profile_id = auth.uid()
        and m.status = 'active'
    )
    or created_by = auth.uid()
  );

create policy "orgs_insert_authenticated"
  on public.organizations for insert
  with check (auth.uid() = created_by);

create policy "orgs_update_admin"
  on public.organizations for update
  using (
    created_by = auth.uid()
    or exists (
      select 1 from public.org_memberships m
      where m.org_id = organizations.id
        and m.profile_id = auth.uid()
        and m.role = 'admin'
        and m.status = 'active'
    )
  );

create policy "memberships_select_own_org"
  on public.org_memberships for select
  using (
    profile_id = auth.uid()
    or exists (
      select 1 from public.org_memberships mine
      where mine.org_id = org_memberships.org_id
        and mine.profile_id = auth.uid()
        and mine.status = 'active'
    )
  );

create policy "memberships_insert_admin_or_self_invite"
  on public.org_memberships for insert
  with check (
    exists (
      select 1 from public.organizations o
      where o.id = org_id and o.created_by = auth.uid()
    )
    or exists (
      select 1 from public.org_memberships m
      where m.org_id = org_memberships.org_id
        and m.profile_id = auth.uid()
        and m.role in ('admin', 'coach')
        and m.status = 'active'
    )
  );

create policy "household_select_participants"
  on public.household_links for select
  using (parent_profile_id = auth.uid() or child_profile_id = auth.uid());

create policy "household_insert_parent"
  on public.household_links for insert
  with check (parent_profile_id = auth.uid());

create policy "household_update_participants"
  on public.household_links for update
  using (parent_profile_id = auth.uid() or child_profile_id = auth.uid());

-- Replace broad published-read with public + org-member visibility.
drop policy if exists "published competitions are public" on public.competitions;
create policy "published competitions readable by visibility"
  on public.competitions for select
  using (
    status = 'published'
    and (
      visibility = 'public'
      or created_by = auth.uid()
      or (
        org_id is not null
        and exists (
          select 1 from public.org_memberships m
          where m.org_id = competitions.org_id
            and m.profile_id = auth.uid()
            and m.status = 'active'
        )
      )
    )
  );

drop policy if exists "sections of published competitions are public" on public.sections;
create policy "sections of readable competitions"
  on public.sections for select
  using (
    exists (
      select 1 from public.competitions c
      where c.id = sections.competition_id
        and c.status = 'published'
        and (
          c.visibility = 'public'
          or c.created_by = auth.uid()
          or (
            c.org_id is not null
            and exists (
              select 1 from public.org_memberships m
              where m.org_id = c.org_id
                and m.profile_id = auth.uid()
                and m.status = 'active'
            )
          )
        )
    )
  );
