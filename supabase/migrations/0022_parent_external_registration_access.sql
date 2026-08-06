-- Let linked parents see and update a student's organizer-registration
-- tracking so the family desk can show unfinished registration actions.

drop policy if exists "external_registrations_select_own"
  on public.external_registrations;
drop policy if exists "external_registrations_select_own_or_parent"
  on public.external_registrations;
create policy "external_registrations_select_own_or_parent"
  on public.external_registrations for select
  using (
    user_id = auth.uid()
    or public.is_parent_of(auth.uid(), user_id)
  );

drop policy if exists "external_registrations_insert_own"
  on public.external_registrations;
drop policy if exists "external_registrations_insert_own_or_parent"
  on public.external_registrations;
create policy "external_registrations_insert_own_or_parent"
  on public.external_registrations for insert
  with check (
    (
      user_id = auth.uid()
      or public.is_parent_of(auth.uid(), user_id)
    )
    and exists (
      select 1
      from public.competitions c
      where c.id = external_registrations.competition_id
        and c.status = 'published'
        and c.reg_url is not null
    )
  );

drop policy if exists "external_registrations_update_own"
  on public.external_registrations;
drop policy if exists "external_registrations_update_own_or_parent"
  on public.external_registrations;
create policy "external_registrations_update_own_or_parent"
  on public.external_registrations for update
  using (
    user_id = auth.uid()
    or public.is_parent_of(auth.uid(), user_id)
  )
  with check (
    user_id = auth.uid()
    or public.is_parent_of(auth.uid(), user_id)
  );
