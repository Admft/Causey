-- Keep account personas intact while organization memberships grant scoped
-- staff authority. This also repairs claims made with the first 0029 version.

create or replace function public.claim_org_invitation(p_token text)
returns table (org_id uuid, org_slug text, org_name text, member_role text)
language plpgsql
security definer
set search_path = public, auth
as $$
#variable_conflict use_column
declare
  target public.org_invitations%rowtype;
  viewer_email text := lower(coalesce(auth.jwt()->>'email', ''));
begin
  if auth.uid() is null then
    raise exception 'not_authenticated';
  end if;

  select *
  into target
  from public.org_invitations i
  where i.token_hash = encode(digest(coalesce(p_token, ''), 'sha256'), 'hex')
  for update;

  if target.id is null
     or target.status <> 'pending'
     or target.expires_at <= now()
     or lower(target.email) <> viewer_email then
    raise exception 'invalid_invitation';
  end if;

  insert into public.org_memberships (org_id, profile_id, role, status)
  values (target.org_id, auth.uid(), target.role, 'active')
  on conflict (org_id, profile_id) do update
    set role = excluded.role, status = 'active';

  update public.org_invitations
  set status = 'claimed', claimed_by = auth.uid(), claimed_at = now()
  where id = target.id;

  return query
  select o.id, o.slug, o.name, target.role
  from public.organizations o
  where o.id = target.org_id;
end;
$$;

revoke execute on function public.claim_org_invitation(text)
  from public, anon;
grant execute on function public.claim_org_invitation(text)
  to authenticated;

-- The first 0029 version briefly rewrote existing parent/student claimants to
-- coach. Its self-authored role audit and same-transaction invitation claim
-- identify only those rows, so restore their prior persona if it was applied.
with affected_claimants as (
  select distinct on (e.actor_id)
    e.actor_id as profile_id,
    e.detail->>'from_role' as previous_role
  from public.audit_events e
  where e.action = 'profile.role_changed'
    and e.actor_id::text = e.entity_id
    and e.detail->>'to_role' = 'coach'
    and e.detail->>'from_role' in ('student', 'parent')
    and exists (
      select 1
      from public.org_invitations i
      where i.claimed_by = e.actor_id
        and i.status = 'claimed'
        and i.role in (
          'assistant_coach', 'coach', 'school_admin', 'district_admin'
        )
        and i.claimed_at between
          e.occurred_at - interval '2 seconds'
          and e.occurred_at + interval '2 seconds'
    )
  order by e.actor_id, e.occurred_at desc
)
update public.profiles p
set role = a.previous_role,
    updated_at = now()
from affected_claimants a
where p.id = a.profile_id
  and p.role = 'coach';

-- Global coach status is required only for standalone organizer records.
-- Organization tournaments derive authority from active scoped staff roles.
drop policy if exists "competitions_insert_coach" on public.competitions;
create policy "competitions_insert_coach"
  on public.competitions for insert
  with check (
    created_by = auth.uid()
    and source = 'organizer'
    and (
      (
        org_id is null
        and public.is_unlocked_coach(auth.uid())
      )
      or (
        org_id is not null
        and public.is_org_staff(org_id, auth.uid())
      )
    )
  );
