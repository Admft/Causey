-- Platform administration: isolated admin identities, least-privilege RLS,
-- append-only audit history, and profile-role hardening.
-- Run after 0014_recommendations_insights.sql.

create table public.platform_admins (
  profile_id uuid primary key references public.profiles (id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.platform_admins enable row level security;
revoke all on public.platform_admins from public, anon, authenticated;

-- Deliberately takes no profile id: callers may only ask about themselves.
create or replace function public.is_platform_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (
    select 1
    from platform_admins a
    where a.profile_id = auth.uid()
  );
$$;

revoke execute on function public.is_platform_admin() from public, anon;
grant execute on function public.is_platform_admin() to authenticated;

-- Promote the named existing account. Failing loudly is safer than deploying
-- an admin shell with no administrator.
do $$
declare
  target_id uuid;
begin
  select u.id into target_id
  from auth.users u
  join public.profiles p on p.id = u.id
  where lower(u.email) = 'adam.mophat@gmail.com'
  limit 1;

  if target_id is null then
    raise exception
      'Create and confirm the Causey account adam.mophat@gmail.com before applying 0015_platform_admins.sql';
  end if;

  insert into public.platform_admins (profile_id)
  values (target_id)
  on conflict (profile_id) do nothing;
end
$$;

-- Profiles previously allowed owners to update every column, including role.
-- Keep the existing own-row RLS policy and limit SQL grants to editor fields.
revoke update on public.profiles from anon, authenticated;
grant update (
  display_name,
  date_of_birth,
  age_band,
  state,
  zip,
  interests,
  updated_at
) on public.profiles to authenticated;

-- Direct organization inserts must obey the same coach/admin gate as the app.
drop policy if exists "orgs_insert_authenticated" on public.organizations;
create policy "orgs_insert_coach_or_platform_admin"
  on public.organizations for insert
  to authenticated
  with check (
    auth.uid() = created_by
    and (
      public.is_unlocked_coach(auth.uid())
      or public.is_platform_admin()
    )
  );

-- Platform admins receive explicit policies. Existing public/member/coach
-- policies remain intact and continue to scope non-admin users.
create policy "platform_admins_select_all_orgs"
  on public.organizations for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform_admins_update_all_orgs"
  on public.organizations for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admins_select_all_memberships"
  on public.org_memberships for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform_admins_insert_memberships"
  on public.org_memberships for insert
  to authenticated
  with check (public.is_platform_admin());

create policy "platform_admins_update_memberships"
  on public.org_memberships for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admins_delete_memberships"
  on public.org_memberships for delete
  to authenticated
  using (public.is_platform_admin());

create policy "platform_admins_select_all_competitions"
  on public.competitions for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform_admins_insert_competitions"
  on public.competitions for insert
  to authenticated
  with check (
    public.is_platform_admin()
    and created_by = auth.uid()
  );

create policy "platform_admins_update_competitions"
  on public.competitions for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admins_select_all_sections"
  on public.sections for select
  to authenticated
  using (public.is_platform_admin());

create policy "platform_admins_insert_sections"
  on public.sections for insert
  to authenticated
  with check (public.is_platform_admin());

create policy "platform_admins_update_sections"
  on public.sections for update
  to authenticated
  using (public.is_platform_admin())
  with check (public.is_platform_admin());

create policy "platform_admins_delete_sections"
  on public.sections for delete
  to authenticated
  using (public.is_platform_admin());

-- Existing section/entrant helpers should recognize a platform admin without
-- turning an organization membership into a platform role.
create or replace function public.can_manage_competition(
  p_competition_id uuid,
  p_profile_id uuid
)
returns boolean
language sql stable security definer set search_path = public
as $$
  select (
    p_profile_id = auth.uid()
    and public.is_platform_admin()
  )
  or exists (
    select 1
    from competitions c
    where c.id = p_competition_id
      and (
        c.created_by = p_profile_id
        or (
          c.org_id is not null
          and public.is_org_coach(c.org_id, p_profile_id)
        )
      )
  );
$$;

create table public.admin_audit_log (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid not null references public.profiles (id) on delete restrict,
  action text not null,
  target_type text not null,
  target_id uuid not null,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index admin_audit_log_created_at_idx
  on public.admin_audit_log (created_at desc);
create index admin_audit_log_target_idx
  on public.admin_audit_log (target_type, target_id);

alter table public.admin_audit_log enable row level security;

create policy "platform_admins_read_audit_log"
  on public.admin_audit_log for select
  to authenticated
  using (public.is_platform_admin());

revoke all on public.admin_audit_log from public, anon, authenticated;
grant select on public.admin_audit_log to authenticated;

-- The trigger writes in the same transaction as the admin mutation, so a
-- successful create/edit/status change always has an audit record.
create or replace function public.audit_platform_admin_mutation()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  target uuid;
  payload jsonb;
begin
  if not public.is_platform_admin() then
    if tg_op = 'DELETE' then
      return old;
    end if;
    return new;
  end if;

  if tg_op = 'DELETE' then
    target := old.id;
  else
    target := new.id;
  end if;

  if tg_table_name = 'organizations' then
    if tg_op = 'DELETE' then
      payload := jsonb_build_object(
        'name', old.name,
        'slug', old.slug,
        'type', old.type
      );
    else
      payload := jsonb_build_object(
        'name', new.name,
        'slug', new.slug,
        'type', new.type
      );
    end if;
  elsif tg_table_name = 'competitions' then
    if tg_op = 'DELETE' then
      payload := jsonb_build_object(
        'name', old.name,
        'slug', old.slug,
        'status', old.status,
        'source', old.source
      );
    elsif tg_op = 'INSERT' then
      payload := jsonb_build_object(
        'name', new.name,
        'slug', new.slug,
        'status', new.status,
        'source', new.source
      );
    else
      payload := jsonb_build_object(
        'name', new.name,
        'slug', new.slug,
        'previous_status', old.status,
        'status', new.status,
        'source', new.source
      );
    end if;
  else
    payload := '{}'::jsonb;
  end if;

  insert into public.admin_audit_log (
    actor_id,
    action,
    target_type,
    target_id,
    details
  )
  values (
    auth.uid(),
    lower(tg_op),
    tg_table_name,
    target,
    payload
  );

  if tg_op = 'DELETE' then
    return old;
  end if;
  return new;
end;
$$;

revoke execute on function public.audit_platform_admin_mutation()
  from public, anon, authenticated;

create trigger audit_platform_admin_organizations
  after insert or update or delete on public.organizations
  for each row execute function public.audit_platform_admin_mutation();

create trigger audit_platform_admin_competitions
  after insert or update or delete on public.competitions
  for each row execute function public.audit_platform_admin_mutation();
