# District pilot runbook

This runbook is for Causey-assisted district pilots, including two districts
running concurrently. Chess is still the broadest active competition surface,
but the public directories now also cover speech and debate, STEM, arts, and
writing with smaller permitted source sets. Product email is delivered through
the verified `mail.causey.dev` Resend integration.

## 1. Prepare the pilot environment

1. Run `npm run validate:migrations`, link the intended Supabase project, and
   inspect `supabase migration list`. Migration
   `0044_database_security_remediation.sql` is the minimum security gate:
   do not provision either district unless the target ledger and schema effects
   include every versioned file through `0044`. Also apply every newer
   migration in the branch, currently through
   `0071_count_platform_admins.sql` (including
   `0045_atomic_district_school_creation.sql`,
   `0046_district_hosted_reporting.sql`,
   `0060_district_admin_activity.sql`,
   `0061_search_competitions_radius.sql`,
   `0062_rate_limits.sql`,
   `0069_p1_isolation_email_comments.sql`, and
   `0070_p2_origin_reports_invites.sql`). A clean filename check alone
   does not prove the target database is current. `PENDING_SCRAPE.sql` was
   removed after integration; do not restore or apply a copy of that scratch
   file.
   Duplicate `0015` and `0016` versions are a historical baseline and must not
   be renamed after application. For a fresh project, apply both files in each
   duplicate group in exact filename order using a controlled SQL-editor/psql
   checklist and record both filenames in the deployment log. For an existing
   project, verify the schema effects and migration ledger before any
   `migration repair` or `db push`.
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
8. Do not run `npm run seed:supabase` against the pilot or production project
   without explicit data-owner approval. The command upserts fixed demo IDs,
   illustrative qualification rules, and sample ZIP data.
9. Before the scheduled retention purge is enabled, take a backup and run
   `PURGE_DRY_RUN=1 npm run purge:stale` with the target project's credentials.
   Review the cutoff and candidate count before allowing the destructive run.

## 2. Provision and verify the district

1. Sign in as a platform administrator.
2. Open `/admin/organizations`.
3. Create the district record with its official name and state.
4. Verify the district only after checking its identity with the pilot owner.
5. Open the district workspace and confirm the next action says to add its
   first school.

Districts are platform-created. Do not create a district as a generic coach
organization or attach students directly to the district.

For two concurrent pilots, complete these steps for District A and then
District B as separate records. Do not reuse a district record, school
workspace, district-administrator membership, invitation, or provisioning
batch between them. Before creating schools, open both district workspaces in
separate tabs and confirm each workspace has a different organization ID in
the platform operations record.

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

## 7. Run the concurrent two-district isolation smoke

Use non-production test accounts approved for the pilot check. Keep one
platform-admin session, one District A administrator session, and one District
B administrator session distinguishable. Never copy student or staff data
between districts to make the test pass.

1. As platform admin, confirm `/admin/organizations` lists District A and
   District B as separate district rows. Expand each row and confirm its school
   list contains only schools whose `parent_org_id` is that district.
2. Verify District A schools from District A's bulk action, then District B
   schools from District B's action. Never combine the selections. Confirm the
   first action does not change any District B school. The database operation
   must reject a mixed-district set if a stale or crafted request submits one.
3. In the District A administrator session, create one District A school,
   invite its school administrator, claim the invitation with the intended
   account, transfer ownership, and activate one student. Repeat independently
   in District B with District B accounts.
4. Confirm the District A administrator can see only District A child schools,
   memberships, readiness rows, and People/Roster actions. Directly requesting
   a District B workspace or report must return not-found/forbidden behavior,
   not a partially populated page.
5. Repeat the previous check from the District B administrator session against
   District A.
6. Run one tournament invitation/RSVP/attendance workflow at one school in
   each district. Also create one district-hosted competition in each district
   and record distinct RSVP/attendance values. Use different test accounts in
   each district.
7. Open District A Reports and download its participation CSV. Confirm every
   `School-hosted` row belongs to District A, its one `District-hosted` row has
   a blank school and active-student value, and neither scope includes the
   District B smoke. Confirm district-hosted activity was not added to a school
   row. Repeat for District B. Confirm each response is private/no-store.
8. While signed in as District A administrator, request District B's CSV URL.
   Confirm no CSV is returned. Repeat in the opposite direction.
9. Return to the platform-admin queue. Confirm both districts and their child
   schools remain independently grouped and each verification review/audit
   result names only the organization acted on.
10. Record the target project, migration ledger through `0044` plus all newer
    branch migrations, test-account IDs, organization IDs, timestamps, and
    pass/fail result in the private deployment log. Do not put participant
    names or claim tokens in that log.

Stop onboarding if any school, membership, readiness row, report count, CSV
row, verification result, or admin grouping appears under the other district.
Preserve the IDs and timestamps for investigation; do not repair the symptom
by moving the record manually.

## 8. Record pilot limitations

Tell pilot participants before onboarding:

- Chess search is usable, but listing data can be incomplete.
- Product email depends on the verified Resend sending domain; staff retain
  fallback claim links when delivery is delayed or suppressed.
- Registration on scraped events remains on the organizer's website.
- Causey does not provide payments or student-to-student messaging.
## 9. Backup restore drill

On Supabase Pro, daily backups are retained 7 days. PITR is off unless
the project enables it. Confirm the current backup and PITR settings in
the dashboard before a paid cohort; do not assume PITR is on.

Before a paid student cohort:

1. In the Supabase dashboard, take a backup of the target project (or confirm
   PITR is on if the plan includes it).
2. Restore that backup into a throwaway project, not production.
3. Confirm a platform admin can sign in, a district report CSV still opens, and
   `search_competitions_in_radius` returns a zip search.
4. Record the date, operator, source project, restore project, and pass/fail
   in the private deployment log. Do not copy student rows into chat or git.
   Completing this checklist in git is not a completed drill.

## 10. Production hostname and observability

- Use one public hostname: `https://app.causey.dev`. Do not advertise
  `app.causey.com` unless that domain is attached to the Vercel project.
- Production must be a green deploy. A failed `main` promotion is not a
  launch. Preview SSO can stay on for `*.vercel.app` URLs.
- Set optional `SENTRY_DSN` in Vercel production. Empty local `.env` stays
  silent. After a test 500, confirm the event arrives.
- Custom SMTP and Auth rate limits are still required before a school signup
  burst. Hobby cron still runs the product-email worker once a day; trigger
  `/api/cron/product-email` by hand after a large invite if mail cannot wait.

## 11. Live RLS smoke is ops, not a unit test

Section 7 must be executed against the migration-current Supabase project with
two real admin sessions. Static `tests/multi-district-isolation.test.ts`
coverage does not replace that run. Record pass/fail privately before
onboarding the second district.
