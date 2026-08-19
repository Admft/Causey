-- District-readable admin activity without opening raw audit_events SELECT.
-- Returns a privacy-minimized, allowlisted feed scoped to one district and its
-- child schools. Invitation emails and unrelated profile/role events stay out.

create or replace function public.get_district_admin_activity(
  p_district_id uuid,
  p_limit integer default 50
)
returns table (
  id bigint,
  occurred_at timestamptz,
  action text,
  scope_org_id uuid,
  scope_org_name text,
  scope_org_type text,
  actor_display_name text,
  summary jsonb
)
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  v_limit integer := least(greatest(coalesce(p_limit, 50), 1), 100);
begin
  if auth.uid() is null
     or not public.is_district_admin(p_district_id, auth.uid())
     or not exists (
       select 1
       from public.organizations district
       where district.id = p_district_id
         and district.type = 'district'
     ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  return query
  with scoped_orgs as (
    select district.id, district.name, district.type::text as org_type
    from public.organizations district
    where district.id = p_district_id
      and district.type = 'district'
    union all
    select school.id, school.name, school.type::text as org_type
    from public.organizations school
    where school.parent_org_id = p_district_id
      and school.type = 'school'
  ),
  scoped_events as (
    select
      event.id,
      event.occurred_at,
      event.action,
      event.actor_id,
      case
        when event.entity_type = 'organizations'
          and event.entity_id ~ '^[0-9a-fA-F-]{36}$'
          then event.entity_id::uuid
        when event.entity_type in ('org_invitations', 'org_announcements')
          and coalesce(event.detail->>'org_id', '') ~ '^[0-9a-fA-F-]{36}$'
          then (event.detail->>'org_id')::uuid
        when event.entity_type = 'competitions'
          then competition.org_id
        else null
      end as resolved_org_id,
      jsonb_strip_nulls(
        jsonb_build_object(
          'role', event.detail->>'role',
          'verification_from', event.detail->>'verification_from',
          'verification_to', event.detail->>'verification_to',
          'from', event.detail->>'from',
          'to', event.detail->>'to',
          'visibility', event.detail->>'visibility',
          'title', event.detail->>'title',
          'name', event.detail->>'name',
          'type', event.detail->>'type',
          'status', event.detail->>'status',
          'owner_changed', event.detail->'owner_changed',
          'parent_changed', event.detail->'parent_changed'
        )
      ) as summary
    from public.audit_events event
    left join public.competitions competition
      on event.entity_type = 'competitions'
     and competition.id::text = event.entity_id
    where event.action in (
      'organization.created',
      'organization.settings_changed',
      'organization.invitation_created',
      'organization.invitation_claimed',
      'organization.invitation_revoked',
      'organization.invitation_expired',
      'organization.announcement_published',
      'competition.created',
      'competition.status_changed'
    )
  )
  select
    scoped.id,
    scoped.occurred_at,
    scoped.action,
    org.id as scope_org_id,
    org.name as scope_org_name,
    org.org_type as scope_org_type,
    actor.display_name as actor_display_name,
    scoped.summary
  from scoped_events scoped
  inner join scoped_orgs org
    on org.id = scoped.resolved_org_id
  left join public.profiles actor
    on actor.id = scoped.actor_id
  order by scoped.occurred_at desc, scoped.id desc
  limit v_limit;
end;
$$;

revoke all on function public.get_district_admin_activity(uuid, integer)
  from public, anon;
grant execute on function public.get_district_admin_activity(uuid, integer)
  to authenticated;

comment on function public.get_district_admin_activity(uuid, integer) is
  'District-admin activity feed for one district and its child schools. Does not grant table SELECT on audit_events.';
