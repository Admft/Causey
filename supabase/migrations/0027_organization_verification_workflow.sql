-- Platform-governed organization verification with private review notes.
-- Run after 0026_platform_user_directory.sql.

create table public.organization_verification_reviews (
  org_id uuid primary key
    references public.organizations (id) on delete cascade,
  status text not null
    check (status in ('pending', 'verified', 'rejected')),
  note text,
  reviewed_by uuid not null
    references public.profiles (id) on delete restrict,
  reviewed_at timestamptz not null default now(),
  check (
    status <> 'rejected'
    or length(trim(coalesce(note, ''))) between 1 and 1000
  ),
  check (note is null or length(note) <= 1000)
);

alter table public.organization_verification_reviews enable row level security;
revoke all on public.organization_verification_reviews
  from public, anon, authenticated;
grant select on public.organization_verification_reviews to authenticated;

create policy "organization_admins_read_verification_review"
  on public.organization_verification_reviews for select
  to authenticated
  using (
    public.is_platform_admin()
    or public.can_administer_org(org_id, auth.uid())
  );

create or replace function public.guard_organization_verification()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  if current_user in ('postgres', 'supabase_admin', 'service_role') then
    return new;
  end if;

  if old.verification_status is distinct from new.verification_status
     or old.verified_at is distinct from new.verified_at
     or old.verified_by is distinct from new.verified_by then
    if not public.is_platform_admin() then
      raise exception 'organization_verification_requires_platform_admin';
    end if;
  end if;

  return new;
end;
$$;

drop trigger if exists guard_organization_verification
  on public.organizations;
create trigger guard_organization_verification
  before update on public.organizations
  for each row execute function public.guard_organization_verification();

revoke execute on function public.guard_organization_verification()
  from public, anon, authenticated;

create or replace function public.review_organization_verification(
  p_org_id uuid,
  p_status text,
  p_note text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  actor uuid := auth.uid();
  clean_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  if actor is null or not public.is_platform_admin() then
    raise exception 'platform_admin_required';
  end if;
  if p_status not in ('pending', 'verified', 'rejected') then
    raise exception 'invalid_verification_status';
  end if;
  if p_status = 'rejected' and clean_note is null then
    raise exception 'rejection_note_required';
  end if;
  if clean_note is not null and length(clean_note) > 1000 then
    raise exception 'verification_note_too_long';
  end if;

  update public.organizations
  set
    verification_status = p_status,
    verified_at = case when p_status = 'verified' then now() else null end,
    verified_by = case when p_status = 'verified' then actor else null end,
    updated_at = now()
  where id = p_org_id;

  if not found then
    raise exception 'organization_not_found';
  end if;

  insert into public.organization_verification_reviews (
    org_id,
    status,
    note,
    reviewed_by,
    reviewed_at
  )
  values (
    p_org_id,
    p_status,
    case when p_status = 'rejected' then clean_note else null end,
    actor,
    now()
  )
  on conflict (org_id) do update
  set
    status = excluded.status,
    note = excluded.note,
    reviewed_by = excluded.reviewed_by,
    reviewed_at = excluded.reviewed_at;
end;
$$;

revoke execute on function public.review_organization_verification(
  uuid,
  text,
  text
) from public, anon;
grant execute on function public.review_organization_verification(
  uuid,
  text,
  text
) to authenticated;
