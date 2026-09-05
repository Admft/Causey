-- Family discovery RSVP: a linked parent (or the student themselves) can
-- create a going / not_going row on a published public listing without a
-- club or school invite. Organizer-site registration is still a separate
-- family mark-complete step — Causey does not import Tabroom/US Chess RSVPs.
-- Run after 0079_event_recommendation_alerts.sql.

drop policy if exists "entrants_insert_manager"
  on public.competition_entrants;
create policy "entrants_insert_manager"
  on public.competition_entrants for insert
  to authenticated
  with check (
    invited_by = auth.uid()
    and (
      public.can_invite_to_competition(
        competition_id,
        profile_id,
        auth.uid()
      )
      or (
        status in ('going', 'not_going')
        and responded_by = auth.uid()
        and (
          (profile_id = auth.uid() and response_source = 'self')
          or (
            public.is_parent_of(auth.uid(), profile_id)
            and response_source = 'parent'
          )
        )
        and exists (
          select 1
          from public.competitions c
          where c.id = competition_entrants.competition_id
            and c.status = 'published'
            and c.visibility = 'public'
            and c.audience = 'public'
        )
      )
    )
  );

comment on policy "entrants_insert_manager" on public.competition_entrants is
  'Coaches invite roster members. Linked parents and the student may insert going/not_going on published public listings.';
