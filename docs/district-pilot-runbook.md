# District pilot runbook

This runbook is for one Causey-assisted district pilot. It assumes chess is
the active competition surface and product email is delivered through the
verified `mail.causey.dev` Resend integration.

## 1. Prepare the pilot environment

1. Link the intended Supabase project and inspect `supabase migration list`.
   Apply every SQL migration through
   `0036_product_email_delivery.sql`, skipping
   `PENDING_SCRAPE.sql`. This repository currently has duplicate numeric
   prefixes for `0015` and `0016`; on a fresh project, apply those files in
   filename order through the SQL editor instead of assuming `db push` can
   track both files under one version.
2. Confirm the platform-admin profiles required by migration `0015` exist
   before applying that migration to a fresh project.
3. Run the escalation checks against a local Supabase stack:

   ```bash
   supabase start
   ./scripts/verify-0016.sh
   ```

4. Load the full ZIP lookup:

   ```bash
   npm run seed:zips
   ```

5. Configure `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`,
   `SUPABASE_SERVICE_ROLE_KEY`, `RESEND_API_KEY`, `CRON_SECRET`, and
   `DATA_SOURCE=supabase`.
6. Configure Supabase Auth custom SMTP before inviting a real cohort. This
   covers signup, confirmation, and password reset. The Resend product-email
   integration separately sends claims, reminders, and app notifications.
7. Confirm `mail.causey.dev` is verified in Resend and run the protected
   `/api/cron/product-email` route once before onboarding participants.
   On Hobby the Vercel cron runs once a day (~14:00 UTC); invite/reminder
   mail can wait until that run unless you trigger the route by hand.

## 2. Provision and verify the district

1. Sign in as a platform administrator.
2. Open `/admin/organizations`.
3. Create the district record with its official name and state.
4. Verify the district only after checking its identity with the pilot owner.
5. Open the district workspace and confirm the next action says to add its
   first school.

Districts are platform-created. Do not create a district as a generic coach
organization or attach students directly to the district.

## 3. Create and delegate each school

For every participating school:

1. From the district workspace, open Settings → District schools.
2. Create the school with its official name and state.
3. Causey redirects to the school People page. Create a
   `school_admin` invitation.
4. Confirm Causey queued the invitation email. Keep the generated claim link
   as a fallback through the district's approved communication channel.
5. After the administrator claims the account, open school Settings →
   Ownership and transfer ownership to them.
6. Return to the district workspace and confirm the school advances to
   student provisioning.

The district administrator keeps parent-district authority after ownership
transfer. The school administrator owns day-to-day school settings.

## 4. Verify schools as platform operations

1. Return to `/admin/organizations`.
2. Find the schools grouped under the verified parent district.
3. Review each school's identity.
4. Select only pending schools in that district and use **Verify selected**.
5. Use the individual review form instead when a school needs a correction
   note or rejection.

Bulk verification intentionally rejects unverified parents, mixed districts,
non-school records, and schools that are not pending.

## 5. Provision students and staff

1. Open each school Roster page.
2. Share the student join link for normal student onboarding.
3. Use People for assistant coaches, coaches, and one-off claim invitations.
4. For a staff CSV, export the generated claim links and distribute them
   directly. Never send shared passwords.
5. Confirm at least one student is active so the district workspace marks the
   school ready for the pilot.

Do not add students to the district organization. Students belong to school
workspaces.

## 6. Run the pilot workflow smoke

At one school:

1. Create a tournament draft.
2. Preview and publish with the intended audience.
3. Invite at least one rostered student.
4. Respond to the invitation as the student or linked parent.
5. Track organizer registration separately when the tournament uses an
   external registration URL.
6. After the event, mark attendance from the manage page.
7. Confirm the district Reports page shows aggregate school counts without
   exposing browsing, saved-event, or search activity.
8. Confirm invite, RSVP, announcement, and tournament-change updates appear
   in `/me/notifications` according to preferences.
9. Confirm enabled product-email alerts arrive once and active linked
   guardians receive student reminders only when guardian routing is enabled.

## 7. Record pilot limitations

Tell pilot participants before onboarding:

- Chess search is usable, but listing data can be incomplete.
- Product email depends on the verified Resend sending domain; staff retain
  fallback claim links when delivery is delayed or suppressed.
- Registration on scraped events remains on the organizer's website.
- Causey does not provide payments or student-to-student messaging.
- Account deletion/export, legal agreements for student data, production
  observability, and live-RLS automation remain rollout gates beyond this
  assisted pilot.
