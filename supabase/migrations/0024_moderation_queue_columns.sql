-- Minimal moderation queue support without applying the full 0018 district
-- foundation. Adds columns the admin review UI and approve/reject actions need.

alter table public.organizations
  add column if not exists verification_status text not null default 'pending';

alter table public.organizations
  drop constraint if exists organizations_verification_status_check;
alter table public.organizations
  add constraint organizations_verification_status_check
  check (verification_status in ('pending', 'verified', 'rejected'));

alter table public.competitions
  add column if not exists submitted_for_review_at timestamptz;
alter table public.competitions
  add column if not exists reviewed_at timestamptz;
alter table public.competitions
  add column if not exists reviewed_by uuid
    references public.profiles (id) on delete set null;
alter table public.competitions
  add column if not exists moderation_note text;

alter table public.competitions
  drop constraint if exists competitions_status_check;
alter table public.competitions
  add constraint competitions_status_check
  check (status in ('draft', 'pending_review', 'published', 'rejected', 'archived'));

create index if not exists competitions_pending_review_idx
  on public.competitions (submitted_for_review_at)
  where status = 'pending_review';

-- Organizer public publishes become pending_review unless a platform admin
-- is writing the row (admin approve still goes straight to published).
create or replace function public.enforce_public_event_moderation()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.source = 'organizer'
     and new.org_id is not null
     and coalesce(new.audience, 'public') = 'public'
     and new.status = 'published'
     and not public.is_platform_admin() then
    new.status := 'pending_review';
    new.submitted_for_review_at := coalesce(new.submitted_for_review_at, now());
  end if;
  return new;
end;
$$;

drop trigger if exists competitions_public_moderation on public.competitions;
create trigger competitions_public_moderation
  before insert or update of status, audience on public.competitions
  for each row execute function public.enforce_public_event_moderation();
