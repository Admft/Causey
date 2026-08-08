-- Public chess search uses the anon key. Migration 0018 put can_view_competition
-- in the shared SELECT policy, then revoked EXECUTE from anon. Postgres still
-- checks that helper when planning the query, so /api/competitions 500s with
-- "permission denied for function can_view_competition".
-- Split policies: anon only needs the public+published clause.

grant execute on function public.can_view_competition(uuid, uuid)
  to authenticated;

drop policy if exists "published competitions readable by audience"
  on public.competitions;
create policy "published public competitions readable"
  on public.competitions for select
  using (audience = 'public' and status = 'published');
create policy "published restricted competitions readable by viewer"
  on public.competitions for select
  to authenticated
  using (public.can_view_competition(id, auth.uid()));

drop policy if exists "sections of readable competitions" on public.sections;
create policy "sections of public competitions"
  on public.sections for select
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = sections.competition_id
        and c.audience = 'public'
        and c.status = 'published'
    )
  );
create policy "sections of restricted competitions"
  on public.sections for select
  to authenticated
  using (
    exists (
      select 1
      from public.competitions c
      where c.id = sections.competition_id
        and public.can_view_competition(c.id, auth.uid())
    )
  );
