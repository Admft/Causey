# Causey product build, weekly review, district readiness, and future timeline

**Evidence date:** Saturday, August 8, 2026  
**Weekly window:** Monday, August 3 through Saturday, August 8, 2026  
**Repository:** Causey web application  
**Current branch reviewed:** `dev` at `a450f25`  
**Document purpose:** Explain what Causey is, what has already been built, what changed this week, what remains incomplete, and the work required to become ready for school-district use and a sustainable for-profit business.

---

## 1. Executive summary

Causey is an early-stage competition discovery and school coordination product. Its working discovery surface is scholastic chess. The product is no longer only a tournament-search prototype: the repository now contains a substantial account system, organization and district hierarchy, tournament operations, student and parent workflows, platform administration, data ingestion, notifications, email delivery, reporting, moderation, and security controls.

The current product can support an **assisted, tightly managed pilot** when the production environment is configured correctly and every pilot is reviewed manually. It is **not yet a self-serve district platform, a completed procurement package, or a generally available paid product**.

The clearest description of the current state is:

- Public chess discovery is usable, but coverage and some source data remain incomplete.
- Students can discover, save, track, RSVP to, and plan around tournaments.
- Parents can link to students and see child-specific actions.
- Coaches can create organizations, build rosters and groups, create tournament drafts, publish scoped tournaments, invite participants, manage RSVPs, communicate announcements, and record attendance.
- School and district administrators have distinct authority and workflows.
- Districts can contain schools, provision staff, delegate ownership, and review aggregate participation.
- Platform administrators have a separate moderation and operations shell.
- Six ingestion sources are represented in the scraping pipeline.
- In-app notifications and Resend-backed product email are implemented.
- Privacy and terms disclosures exist and correctly state that legal compliance review is not complete.
- The application builds successfully and its current automated unit/integration-style suite passes.

The largest remaining readiness work is not another homepage redesign. The remaining work is mostly trust, operations, legal, lifecycle, and commercialization:

1. Prove authorization and row-level security against a live disposable Supabase environment.
2. Complete account export, deletion, retention, consent, and student-data procedures.
3. Finish production observability, alerting, backups, recovery drills, and incident response.
4. Validate all migrations, secrets, cron jobs, email flows, and ingestion jobs in staging and production.
5. Conduct accessibility, privacy, security, and district procurement reviews.
6. Add district-grade identity and deprovisioning where pilot buyers require it.
7. Define pricing, contracts, invoicing, support, service levels, and ownership of day-to-day operations.
8. Run one narrow district pilot and use observed evidence before expanding.

No district names, partner counts, prices, compliance certifications, or adoption numbers should be published until they are real and approved. The repository itself records that districts should not be presented as partners before letters of intent are signed.

---

## 2. How to read this report

This report uses four status labels:

- **Built:** The repository contains a real implementation and the current product can perform the workflow when its required services and migrations are configured.
- **Built but pilot-dependent:** The implementation exists, but it still depends on manual operations, configuration, external service verification, or a controlled pilot.
- **Partial:** A meaningful implementation exists, but a required lifecycle, control, or production validation is incomplete.
- **Not built:** The capability is planned, represented by a seam, or discussed in documentation, but there is no complete product workflow.

This is an engineering and product assessment, not a legal certification. FERPA, COPPA, state student-privacy laws, accessibility obligations, contract terms, and data-processing requirements require qualified review.

The report is based on:

- The application routes and components.
- Supabase migrations through `0039`.
- Server actions, authorization helpers, data layers, and email code.
- The ingestion pipeline and its operating documentation.
- The project roadmap, setup guide, district pilot runbook, and UX progress log.
- Git history for August 3–8.
- A fresh local production build on August 8.
- A fresh automated test run on August 8.
- The current Vercel project and deployment history visible on August 8.

---

## 3. Verified engineering snapshot as of August 8

### Repository and weekly activity

- The reviewed branch is `dev`.
- The reviewed HEAD is commit `a450f25`.
- The working tree was clean when this report began.
- The repository has 167 commits on the reviewed `dev` history.
- The August 3–8 window contains 120 `dev` commits when merge commits are included.
- Activity recorded by day:
  - Monday, August 3: no application commit on `dev`.
  - Tuesday, August 4: no application commit on `dev`.
  - Wednesday, August 5: 50 commits.
  - Thursday, August 6: 21 commits.
  - Friday, August 7: 31 commits.
  - Saturday, August 8: 18 commits.
- The net weekly diff changes 360 files when downloaded fixture assets are included.
- Excluding the large `ingestion/fixtures/incoming/` website bundle, the net weekly diff changes 240 files with approximately 37,352 insertions and 2,020 deletions.
- The raw weekly insertion count is much larger because full source-site fixtures, images, scripts, style sheets, and PDFs were added for scraper development. That bulk should not be mistaken for application code.

### Build and test verification

- `npm test` passed on August 8.
- 39 test files passed.
- 237 tests passed.
- `npm run build` passed.
- Next.js compiled, type-checked, linted, collected page data, and generated its static routes successfully.
- The production build contains public discovery, account, family, organization, district, platform-admin, API, auth callback, calendar, registration handoff, and cron routes.

### Deployment evidence

- A Vercel project named `causey` exists.
- Ready preview deployments exist for the `dev` branch.
- A ready production deployment exists from the `main` branch.
- The latest local HEAD passed a production build, but deployment parity must still be checked after every release. A local build is evidence of compilability, not evidence that every production secret, migration, cron, email, and permission path is healthy.

---

## 4. What Causey has become

Causey began as a public tournament-discovery experience. The product now has three connected layers.

### Layer 1: Public discovery

Anyone can browse chess tournaments, search by location, apply filters, inspect event details, understand source provenance, review eligibility, and leave Causey to complete registration on an organizer’s site.

### Layer 2: Personal coordination

Students and parents can turn discovery into a plan. They can save events, receive recommendations, respond to organization invitations, track external registration status, add calendar events, receive reminders, and review upcoming activity.

### Layer 3: School and district operations

Authorized adults can create and verify organizations, provision staff, manage rosters and groups, create tournaments, control audiences, invite students, collect RSVPs, mark attendance, communicate announcements, and review aggregate district reporting.

The product’s strategic advantage is the connection between these layers. A directory alone is easy to copy. A school operations tool alone can become disconnected from the public competition ecosystem. Causey’s opportunity is to connect discovery, family action, school coordination, and district-level visibility without turning student activity into unrestricted surveillance.

---

## 5. Detailed inventory of what has been built

## 5.1 Public homepage and product framing

**Status: Built**

The homepage is a discovery-first entry point rather than a generic software landing page.

Built elements include:

- A chess-search entry point.
- A product-wide early-build posture.
- Clear statements that chess is the usable surface today.
- Honest statements that coverage is incomplete.
- A role-routing account section for students, parents, and coaches.
- A source and future-coverage path.
- A district pilot section.
- A district preview explicitly labeled as illustrative.
- Shared navigation and a scroll-based brand handoff.
- Responsive spacing and alignment work across phone, tablet, and desktop.
- Reusable scroll-reveal behavior with reduced-motion handling.

The homepage does not claim named district partners, a complete nationwide dataset, or readiness for all competition types.

## 5.2 Chess tournament search

**Status: Built, with data-quality limits**

The `/chess` surface supports:

- Search by ZIP code and radius.
- State filtering.
- Grade-band filtering.
- Rating-band filtering.
- Entry-fee filtering.
- Date-window filtering.
- Source filtering.
- Popularity and timing-aware result ordering.
- A bounded relevance lift for a signed-in user’s organization tournaments.
- Applied-filter chips that remain visible near results.
- Mobile and tablet filter disclosure.
- Result counts.
- Progressive loading.
- Event source and provenance labels.
- Upcoming and past-event handling.
- Friendly API failure handling instead of a blank framework error.

Important limits:

- Mock mode only knows ZIP codes in the sample ZIP dataset.
- Production requires the complete ZIP table.
- Search depends on published, canonical tournament records.
- Source coverage is still incomplete.
- Some scraped fields may be absent or need human review.
- Search quality is only as trustworthy as source freshness, deduplication, location resolution, and publication review.

## 5.3 Tournament cards and event pages

**Status: Built**

Tournament cards and event pages include:

- Date and weekend-oriented scanning.
- Venue and location.
- Level or standing labels.
- Source provenance.
- Cover images when trustworthy images are available.
- Text-first presentation when no cover exists.
- Fee visibility, including “not listed” behavior rather than a fake zero.
- Sections and eligibility badges.
- Organizer registration links.
- Causey RSVP controls for hosted events.
- Save, recommendation, and rating actions.
- “Going from your club” context for authorized organization members.
- Calendar download through an `.ics` route.
- A clear next-action tree based on viewer state.
- External registration tracking that distinguishes clicking the organizer’s site from actually registering.
- A “Did you register?” follow-up.
- Parent visibility into unfinished organizer registration.
- Event pathway context.
- Edit and management surfaces for authorized organizers.
- Cancellation/archive behavior.

The product intentionally keeps scraped-event registration on the organizer’s website. Causey must not present an outbound click as a completed registration.

## 5.4 Qualification pathways

**Status: Engine built; production truth remains partial**

Built elements include:

- A pure recursive qualification engine.
- A `/pathways` explorer.
- Event-page pathway panels.
- Series and qualification-rule data structures.
- Placement-to-next-opportunity traversal.
- High-confidence series matching after ingestion.
- Pathway enrichment states such as none, uncertain, and known.
- Automated tests for qualification behavior.
- A rule that scrapers and AI enrichment may not directly invent qualification edges.

The major limitation is content verification:

- Some seeded rules are illustrative scaffolding.
- Official citations and `verified_on` dates must be maintained.
- Qualification structures can change annually.
- A correct engine with incorrect rules is still a trust failure.

## 5.5 Accounts and authentication

**Status: Built**

The account system includes:

- Supabase email/password authentication.
- Student, parent, and coach/organizer account entry points.
- Role-aware signup guidance.
- Role-aware post-authentication landing.
- Email confirmation callback handling.
- Forgot-password and reset-password workflows.
- Account profile editing.
- Display name, state, ZIP code, and competition interest.
- Student date of birth and derived age band.
- Email and password change forms.
- Confirmation status.
- Notification preferences.
- Search defaults.
- Family and organization shortcuts.
- An account settings shell that separates jobs instead of showing one giant form.
- Invitation and join context preserved through login, signup, and confirmation.
- Dead invitation handling that fails closed.
- Staff claim signup that does not force student date-of-birth collection.

Known gaps:

- Self-service account export is not built.
- Self-service account deletion is not built.
- A documented retention and deletion engine is not built.
- Full session-management controls are incomplete.
- District-managed SSO is not built.
- Automatic district rostering and deprovisioning are not built.

## 5.6 Student experience

**Status: Built, with profile/history gaps**

The student experience includes:

- A role-specific `/me` landing.
- Upcoming and past tournament planning.
- Invitations requiring action.
- RSVP controls.
- Saved and recommended events.
- Organization membership.
- Join-by-code onboarding.
- Calendar downloads.
- External-registration tracking.
- Notifications.
- Parent-link request handling.
- A “join a club first” activation path for a student without an organization.

Still needed:

- Tournament results and placement history.
- Optional US Chess ID and verified rating.
- Profile-level tournament history.
- School-year and grade progression rules.
- Clear leave/transfer workflows.
- Complete account data controls.

## 5.7 Parent and family experience

**Status: Built**

The `/family` experience includes:

- Parent-to-student link requests.
- Student acceptance/decline handling.
- Child-specific action lists.
- Pending RSVP actions.
- Unfinished external registration actions.
- Organization and tournament context.
- Links that survive separate-device handoff.
- Privacy-aware messaging about what the parent and student must do.
- Notification routing to active linked guardians when enabled.

Still needed:

- A formal under-13 consent model approved by counsel and district policy.
- Per-child and per-notification routing controls.
- Better support for family changes, revocation, custody edge cases, and disputed links.
- Complete export/deletion behavior for linked accounts.

## 5.8 Coach and organization workspaces

**Status: Built**

Organization functionality includes:

- School, club, team, and district organization concepts.
- A distinct district lifecycle.
- Organization creation for allowed non-district roles.
- Organization join codes for students.
- Roster management.
- Group management.
- Staff and student role separation.
- Organization overview with one dominant next mission.
- Empty-roster guidance.
- Tournament-focused coach landing.
- Organization settings.
- Rename and state changes.
- Immutable organization type.
- Ownership transfer.
- Verification status.
- Correction notes.
- People management.
- Staff invitations.
- Assistant-coach access.
- Claim links.
- Invitation reissue.
- Copyable fallback links.
- Bulk CSV claim-link export.
- Coach announcements.
- Attendance and season reporting.

The current capability model distinguishes:

- Broad staff workspace access.
- Read-only assistant-coach access.
- Coach/operator authority.
- School administration.
- District administration.
- Platform administration.

Still needed:

- A buyer-approved, explicit permission matrix in product and contracts.
- More granular custom staff roles if districts require them.
- Reliable transfer and deprovisioning between schools.
- Better large-roster search, pagination, and bulk operations.
- Operational audit views for organization administrators.

## 5.9 Tournament creation and organizer operations

**Status: Built**

Organizer tournament functionality includes:

- Draft-first creation.
- Autosave and resumable drafts.
- Draft links.
- Cover upload.
- Cover storage policies.
- Completeness checks.
- Multi-section creation.
- Grade and rating limits.
- Preview.
- Audience review.
- Public, district-only, school-only, and invite-only scopes.
- Moderation of public organizer events.
- Edit after publication.
- Cancellation/archive.
- Roster invitations.
- RSVP review.
- Attendance marking.
- Registration-link handling.
- Change notifications.
- Management pages that preserve organization context.

Still needed:

- Capacity and waitlist management.
- Results and placement entry.
- Stronger revision-history UI.
- Refund and payment workflows if Causey later accepts fees.
- A complete image policy, moderation process, and rights record.
- Organizer-level performance reporting and reconciliation.

## 5.10 District and school hierarchy

**Status: Built for an assisted pilot**

The district foundation includes:

- Platform-only district creation.
- Parent district to child school hierarchy.
- District administrators.
- School administrators.
- Distinct coach and assistant capabilities.
- Guided school creation.
- School administrator invitation.
- Claim-link onboarding.
- Ownership transfer to the school administrator.
- Continued parent-district authority after school ownership transfer.
- Verification workflow.
- District-grouped school review.
- Guarded bulk verification.
- School readiness calculations.
- A district command center.
- A “one next action” setup flow.
- District-scale navigation.
- Audience-scoped tournaments.
- Aggregate reports by school.
- CSV export of aggregate reporting.
- Guardrails against directly attaching students to the district organization.

This is a meaningful district workflow, not only district-themed copy.

Why it is still an assisted pilot:

- Causey staff must create and verify districts.
- The district and Causey must complete legal and operational review.
- Human owners must distribute or supervise fallback claim links.
- Production email and authentication delivery must be verified.
- Pilot support and escalation remain manual.
- District identity, school identity, and staff authority still require human checking.
- Procurement, privacy, security, and commercial terms are not packaged for self-service.

## 5.11 District reporting

**Status: Built for aggregate pilot reporting**

District reporting includes school-level aggregates for:

- Student participation.
- Upcoming tournaments.
- Pending RSVPs.
- “Going” responses.
- Attendance.

The design intentionally avoids giving district administrators a default district-wide feed of student browsing, searches, saves, or private planning behavior.

Still needed:

- Buyer validation of which measures are useful.
- Metric definitions and data-quality documentation.
- Date-range and season comparison depth.
- Export auditing.
- Retention rules for report data.
- Suppression rules for very small groups if privacy review requires them.
- Production analytics that distinguish product adoption from competition participation.

## 5.12 Platform administration

**Status: Built**

The separate `/admin` shell includes:

- A moderation-first landing page.
- Public tournament moderation.
- Bulk moderation controls.
- Organization verification.
- Correction notes.
- District-grouped school verification.
- Bulk school verification.
- Platform user search.
- Governed account role changes.
- Platform-admin access changes.
- Last-admin protections.
- Self-access protections.
- Tournament creation and editing.
- Source and status filtering.
- Ready-to-publish cues.
- Bulk publishing.
- Published/draft visibility.
- Single, selected, and all-tournament deletion through an admin-checked RPC.
- Scraper dispatch.
- Recent scraper-run visibility.
- Admin audit events for sensitive operations such as scraper dispatch.

Still needed:

- Replace migration-time platform-admin bootstrapping tied to named email accounts with a documented, environment-safe bootstrap and recovery procedure.
- A complete searchable audit-log interface.
- Case management for support and incidents.
- Appeals and escalation workflows.
- Break-glass access procedures.
- Stronger separation of support access from routine platform-admin authority.
- Admin action monitoring and anomaly detection.

## 5.13 In-app notifications

**Status: Built**

The notification system includes:

- A `/me/notifications` inbox.
- Unread counts in navigation.
- “Needs attention” grouping.
- Mark-read actions.
- Notification preferences.
- Invitation notifications.
- Registration-deadline reminders.
- Seven-day and one-day reminders.
- Schedule changes.
- Cancellations.
- RSVP updates.
- Announcements.
- Account-related notifications.
- Dedupe and scheduling behavior.

This week the product moved from an honest “email is not yet active” state to a real email-delivery implementation.

## 5.14 Product email

**Status: Built, but requires production operations**

The product email implementation includes:

- Resend delivery.
- A verified `mail.causey.dev` sending-domain assumption in the runbook.
- A protected cron route.
- A service-role-only outbox claim.
- Concurrency-safe batch locking.
- Retry attempts.
- Provider message IDs.
- Idempotent reminder behavior.
- Preferences-aware delivery.
- Active-guardian routing.
- Invitation claim email.
- Tournament reminder email.
- Schedule, cancellation, RSVP, announcement, and account email.
- A Vercel cron schedule.

Production requirements still include:

- Confirm the sending domain remains verified.
- Confirm SPF, DKIM, and DMARC posture.
- Confirm suppression, bounce, and complaint handling.
- Monitor delivery failures and stuck outbox records.
- Verify unsubscribe/preference requirements with counsel.
- Establish sender reputation and volume controls.
- Run cron and guardian-routing tests in staging before each major release.

## 5.15 Data ingestion and tournament supply

**Status: Built, operationally demanding**

The ingestion pipeline includes source-specific scrapers for:

- US Chess upcoming tournaments.
- Continental Chess Association.
- OnlineRegistration.cc.
- Chess-Results.
- FIDE Calendar.
- Texas Chess Association.

The pipeline implements:

- Listing and detail fetching.
- Character-set handling.
- Source-specific parsing.
- Zod normalization.
- Staging files.
- Stable source identity.
- Fingerprints.
- Cross-source deduplication.
- Canonical records.
- Competition-source history.
- Image extraction and fallback.
- Location resolution.
- ZIP and coordinate publication gates.
- Fee parsing.
- Section parsing.
- Source-aware registration links.
- Series matching.
- Pathway triage/enrichment.
- Scrape run logging.
- Stale-record handling.
- Zero-row fail-closed behavior.
- Scheduled GitHub Actions ingestion.
- Optional Docker execution.
- Admin-triggered scraper dispatch.
- Workflow concurrency protection.

Data-quality work completed this week includes:

- Preserving covers when a retry lacks an image.
- Keeping event-specific registration destinations where possible.
- Replacing generic homepage links where a specific source page exists.
- Separating image fallback from registration destination.
- Capturing Texas event details, ZIPs, dates, venues, registration links, and pictures.
- Improving FIDE, OnlineReg, and Chess-Results feed handling.
- Archiving records that disappeared upstream without deleting user references.

Ongoing risks:

- Source HTML can change without notice.
- Scraping rights and source terms require review.
- Some source pages omit ZIP, fee, section, or registration details.
- Automated publication must remain conservative.
- A successful fetch is not the same as accurate data.
- Every source needs freshness, row-count, error, and publication monitoring.
- Qualification rules need curation even when event ingestion is automated.

## 5.16 Data architecture

**Status: Built**

The app uses a typed data-source seam:

- `DATA_SOURCE=mock` reads labeled seed JSON.
- `DATA_SOURCE=supabase` uses the production-style database path.
- Public discovery can run locally without external services.
- Account, organization, district, and admin functionality require Supabase.

The schema includes:

- Competitions.
- Sections.
- Series.
- Qualification rules.
- ZIP coordinates.
- Profiles.
- Saved competitions.
- Ratings/reviews.
- Organizations.
- Organization memberships.
- Groups.
- Group memberships.
- Tournament entrants.
- Attendance.
- Household links.
- Recommendations.
- External registration state.
- Tournament drafts and covers.
- District hierarchy.
- Verification state.
- Provisioning and staff invitations.
- Moderation fields.
- Platform admins.
- Admin audit events.
- Notifications and preferences.
- Email outbox state.
- Competition sources and scrape runs.

The migration series runs through `0039`, but duplicate `0015` and `0016` prefixes make fresh-database application a special operational concern. The repository documentation gives different historical “apply through” references in places, so production must use one authoritative migration checklist.

## 5.17 Authorization and security controls

**Status: Substantial implementation; live verification incomplete**

Built protections include:

- Supabase Row Level Security.
- Server-side authorization helpers.
- Platform-admin checks.
- Organization staff, coach, admin, school-admin, and district-admin boundaries.
- District lifecycle restrictions.
- Platform-only district creation.
- Verification state protected from self-approval.
- Public organizer moderation.
- Owner authority replacing creator authority after transfer.
- Assistant coaches excluded from operator mutations.
- Expiring staff claim links.
- Privacy-minimized anonymous claim previews.
- Role-safe invitation signup.
- Fail-closed invalid links.
- Restricted service-role functions.
- Admin-checked destructive operations.
- Last-platform-admin protection.
- Audited role and admin changes.

The largest technical security gap is proof:

- Many tests inspect SQL text and pure authorization helpers.
- The repository still needs a repeatable live Supabase authorization matrix.
- Negative tests must prove one role cannot cross school, organization, district, or platform boundaries.
- Every migration must be tested against a fresh database and an upgrade database.
- Service-role secrets, GitHub tokens, cron secrets, and email keys need rotation and access ownership.

There is also one explicitly deferred authorization-hardening item:

- Migration `0016_escalation_lockdown.sql` states that audit finding `SEC-03` is not resolved.
- Several RLS policies depend on `SECURITY DEFINER` helper functions that remain in an exposed schema.
- Simply revoking function execution would break the policies, so the helpers must be moved to an unexposed schema and every dependent policy rebuilt and tested in a dedicated migration.
- This should be treated as an open security architecture item, not as a completed part of the escalation lockdown.

Application-layer abuse controls also need explicit ownership:

- No Causey-owned request rate-limiting or throttling implementation was found in the reviewed TypeScript and configuration.
- No application Content Security Policy was found in the reviewed configuration.
- Supabase and Vercel defaults may provide platform protections, but those defaults need to be documented, configured, tested, and supplemented for login, invitation, search, export, admin, and cron abuse cases.

## 5.18 Privacy and terms

**Status: Public disclosures built; legal program incomplete**

The product has `/privacy` and `/terms`.

The disclosures correctly state:

- Causey is unfinished.
- Student data is collected.
- Date of birth is used to derive age-band guidance.
- Roster, invitation, RSVP, attendance, saved-event, and family-link information is processed.
- Staff and platform administrators receive scoped access.
- District administrators receive aggregate reporting rather than unrestricted browsing data.
- External organizer websites have their own privacy practices.
- Self-service export and deletion are still being built.
- A district pilot requires a separate agreement.
- The existence of a privacy page does not itself establish FERPA, COPPA, or state-law compliance.

Still needed:

- Counsel-approved privacy policy and terms.
- A district data-processing agreement.
- A student-data inventory and data-flow map.
- Role-based purpose and lawful-processing documentation.
- Under-13 consent and parent/guardian process.
- Data retention schedules.
- Account and tenant deletion procedures.
- Subprocessor list.
- Security addendum.
- Breach notification procedure.
- Records for source data, image rights, and organizer content.
- State-by-state review where required.

## 5.19 Design system and user experience

**Status: Built and actively refined**

The project has:

- A documented design system.
- Shared Tailwind tokens.
- Brand red as the primary accent.
- Reusable field, CTA, section, card, and layout patterns.
- An early-build banner.
- Responsive public and portal layouts.
- Role-specific landings.
- One-next-action portal patterns.
- Loading skeletons.
- Empty states.
- Success and recovery language.
- Confirmation for destructive actions.
- Reduced-motion behavior.
- Keyboard-conscious link and card affordances.
- External-link marks and labels.

Still needed:

- A complete WCAG 2.2 AA audit.
- Screen-reader testing.
- Keyboard-only task testing.
- Zoom and reflow validation.
- Color-contrast verification.
- Field-error and focus-management review.
- Testing with coaches using a phone at an event.
- Testing with parents and students who have no product context.
- Consistent success, error, and navigation language across every workflow.

## 5.20 Testing and quality

**Status: Good early automated foundation; incomplete production coverage**

The 39 test files cover:

- Qualification.
- Filtering.
- Competition timing.
- Search ranking.
- Slugs.
- Organization codes.
- RSVP behavior.
- Event standing.
- ICS generation.
- Ingestion parsing.
- Section parsing.
- Source normalization.
- Image extraction.
- Deduplication.
- Ingestion operations.
- Location resolution.
- Tournament readiness.
- Draft behavior.
- Claim paths.
- Organization permissions.
- Platform-admin access.
- Admin tournament operations.
- District readiness.
- District lifecycle guardrails.
- Role capability boundaries.
- Staff onboarding.
- Organization verification.
- Effective authority.
- Notifications.
- Product email.
- Authentication landing and next-path routing.

Missing or underdeveloped coverage:

- There is no pull-request CI workflow that runs `npm test` and `npm run build`; the only repository workflow currently present is tournament ingestion.
- Browser end-to-end tests for complete role journeys.
- Live RLS tests against Supabase.
- Email delivery integration tests in a non-production account.
- Accessibility automation.
- Visual regression tests.
- Load and concurrency tests.
- Backup/restore tests.
- Production smoke tests after deployment.
- Contract tests for source scrapers.
- Failure injection for cron, email, and ingestion.

---

## 6. What existed before this week

The project began in mid-July 2026.

### July 16–20: discovery foundation

The early repository established:

- Next.js project structure.
- Initial database concepts.
- US Chess scraping experiments.
- CCA scraping.
- Tournament types.
- Search.
- State-affiliate planning.
- Early source automation.
- Initial UI and loading work.
- An early-build banner.

### July 27–28: accounts and coordination foundation

The product expanded beyond public search:

- Signup and login.
- Student profiles and date of birth.
- Parent portal.
- Organization concepts.
- Join codes.
- Groups.
- Hosted tournaments.
- Entrants and RSVP.
- Household links.
- Organization attendance.
- Recommendations.
- Community difficulty scoring.
- “Going from your club.”
- Password reset.
- Calendar download.
- Student schedule.
- Tournament editing and cancellation.

By the beginning of this week, Causey already had the beginnings of a public directory and role-aware coordination product. What it did not yet have was a trustworthy district lifecycle, a mature admin control plane, production product email, or a coherent set of role-specific workspaces.

---

## 7. What was built this week

## 7.1 Monday, August 3

**Application activity on `dev`: no commit recorded.**

A documentation-only Cursor Cloud setup commit exists on a side branch, but it is not part of the reviewed `dev` application history.

This does not prove no design, planning, or local work happened. It only means no application change landed on `dev` that day.

## 7.2 Tuesday, August 4

**Application activity on `dev`: no commit recorded.**

As with Monday, Git history does not show a landed application change on the reviewed branch.

## 7.3 Wednesday, August 5

**Recorded activity: 50 commits.**

Wednesday was the major expansion day. The product moved from a promising portal foundation toward a governed multi-role application.

### Platform administration

Built or expanded:

- A platform-admin shell.
- Admin navigation.
- Admin tournament operations.
- A user-management path.
- Initial platform-admin access setup.
- Moderation and management interfaces.

### Security and authority

Built or expanded:

- Escalation lockdown.
- Safer profile and role changes.
- Platform-admin boundaries.
- Draft and publication policy tightening.
- Search-interest ranking migration support.
- Authorization tests.

### Tournament creation

Built or expanded:

- Resumable tournament drafts.
- Autosave.
- Cover requirements.
- Cover policies.
- Preview-before-publish.
- Audience review.
- Double-submit protection.
- Lost-resume-link prevention.
- Draft defaults and schema hardening.
- Organizer registration language.

### Student, parent, and coach workflows

Built or expanded:

- Role-aware post-sign-in landing.
- Role-aware account next actions.
- Coach workspace tournament focus.
- Invitations preserved through account creation.
- Student-specific join authentication.
- Family-link handoff clarity.
- RSVP progress, success, and recovery.
- Coach invitation guidance.
- Roster group progress and recoverability.

### Search and public discovery

Built or expanded:

- Global header access to chess search.
- Home and search visual hierarchy.
- Responsive filter composition.
- Sticky desktop filter rail.
- Applied-filter chips.
- Search provenance.
- Popular tournament handling.
- Soonest-first behavior.
- Bounded organization relevance.
- Improved tournament-card scanning.
- Text-first event pages without covers.

### Moderation

Built or expanded:

- Decision-ready public tournament review.
- Event, source, audience, and organizer context.
- Rejection-note requirements.
- Clear result and next-review states.

### Ingestion

Built or expanded:

- A major scraper rework.
- Additional hub source support.
- Dedupe and normalization work.
- Source fixtures and parser coverage.
- Manager interfaces tied to the new operations.

### UX system

Built or expanded:

- Unified section-heading rhythm.
- Keyboard-equal micro-interactions.
- Organization and family loading states.
- Organization workspace redesign around one mission.
- Upcoming/past tournament timeline.
- A documented UX improvement loop.

Wednesday established many of the structural pieces that later district work depended on: drafts, moderation, admin authority, role-aware routing, and reliable invitation context.

## 7.4 Thursday, August 6

**Recorded activity: 21 commits.**

Thursday focused on making the new structure understandable and usable by each role.

### Role-specific workspaces

Built or expanded:

- Student plan.
- Parent action desk.
- Coach mission workspace.
- Distinct navigation destinations.
- First useful action for each role.

### Event next actions

Built or expanded:

- A dominant next action on event pages.
- Demoted secondary save/rate controls.
- Better distinction between Causey RSVP and organizer registration.

### Organization activation

Built or expanded:

- Invite-first student join links.
- Empty-roster guidance.
- Organization home that leads with the next tournament mission.
- School-safe roster layout.
- Coach tournament-management layout.

### Parent operations

Built or expanded:

- Parent registration inbox.
- Visibility into incomplete external organizer registration.
- Parent action guidance.

### Platform moderation

Built or expanded:

- Moderation-first admin home.
- Schema support for moderation fields.
- Clearer migration-gap failures.
- Admin terminology fixes.

### Tournament covers and build reliability

Built or expanded:

- Cover-storage bucket migration.
- Restored cover upload.
- Safe behavior where an admin draft ID does not yet exist.
- Production build fixes.
- Draft hardening.

### Responsive portals

Built or expanded:

- Mobile sticky next actions.
- Smaller mobile navigation labels.
- Better portal behavior on narrow screens.

Thursday turned Wednesday’s structural work into role-directed workflows.

## 7.5 Friday, August 7

**Recorded activity: 31 commits.**

Friday was the major governance and operations day.

### District lifecycle

Built or expanded:

- Platform-only district creation.
- District-safe organization lifecycle.
- Restrictions against district student enrollment.
- School administrator handoff.
- District authority over child schools.
- District provisioning inside the correct lifecycle.

### Organization verification

Built or expanded:

- Governed verification.
- Pending-by-default schools.
- Private correction notes.
- Self-verification prevention.
- Verification status visible to organization administrators.

### Ownership and authority

Built or expanded:

- Ownership transfer that revokes stale creator authority.
- Centralized effective-organization authority.
- Preserved event return paths.
- Publication confirmation.

### Platform user access

Built or expanded:

- Paginated platform user search.
- Email and display-name lookup through admin-checked data access.
- Governed profile-role changes.
- Governed platform-admin changes.
- Last-admin protection.
- Self-access protection.
- Audit records.

### Staff onboarding

Built or expanded:

- Trusted staff invitation preview.
- Fail-closed expired or invalid claims.
- Staff signup without student DOB.
- Preservation of an existing parent or student persona.
- Membership-driven staff navigation.
- Scoped tournament authority.

### Alerts and account settings

Built or expanded:

- Honest alerts center.
- In-app notification records.
- Notification inbox.
- Notification preferences.
- Account settings hub.
- Profile, sign-in, alerts, search, family, and organizations sections.
- Change-email and change-password forms.

### Texas Chess Association ingestion

Built or expanded:

- TCA source migration.
- TCA scraper.
- Archive pagination.
- Event-detail parsing.
- Date, venue, ZIP, registration, and picture extraction.
- Transparent source-compatible scraper identity.
- Image preservation across retries.
- Source filters in admin.
- Bulk publication.
- Handling of source collisions and related section records.

### Homepage and navigation

Built or expanded:

- Brand/nav handoff based on hero visibility.
- Signed-in account section.
- Home layout and color-rhythm refinements.
- Tablet fixes.

Friday closed several critical trust gaps identified earlier in the week and made the district model materially real.

## 7.6 Saturday, August 8

**Recorded activity: 18 commits.**

Saturday integrated district readiness, email, admin operations, data quality, and another broad product presentation pass.

### Claim-link operations

Built or expanded:

- Claim-link reissue.
- Copyable fallback links.
- Bulk CSV claim-link export.
- Staff-versus-student claim routing.
- Narrowed allowed claim account roles.
- Invitation hash compatibility.

### Product email

Built or expanded:

- Resend product email.
- Outbox claims.
- Retry and locking behavior.
- Invitation email.
- Reminder email.
- Change, cancellation, RSVP, announcement, and account email.
- Preference handling.
- Active-guardian routing.
- Protected cron delivery.

### District pilot readiness

Built or expanded:

- Public district pilot page.
- Privacy page.
- Terms page.
- Separate-device parent/student handoff.
- District-scale shell.
- Aggregate CSV export.
- Stronger role-capability boundaries.
- Explicit empty-state actions.
- School readiness model.
- District command center.
- School creation and delegation flow.
- District-grouped verification.
- Bulk school verification.
- District pilot runbook.

### Public search reliability

Built or expanded:

- Anonymous public-competition RLS policies.
- Removal of anonymous calls into staff-oriented unpublished-event policy checks.
- JSON API error responses.
- Resolution of the anonymous chess-search 500 path.

### Platform tournament and scraper operations

Built or expanded:

- Audited tournament deletion RPC.
- Delete one, selected, or all tournaments.
- Explicit destructive confirmations.
- Separate scraper administration page.
- Dispatch of any configured source or all sources through GitHub Actions.
- Recent scrape-run visibility.
- Dispatch audit events.

### Data quality

Built or expanded:

- Full live-source refresh work.
- Feed-specific handling for OnlineReg, FIDE, and Chess-Results.
- Zero-row failure behavior.
- Archival of records missing upstream without destroying references.
- More event-specific outbound destinations.
- Source-image fallback.
- Texas publish-success clarity.
- Draft retention for incomplete location records.

### Homepage and sign-in presentation

Built or expanded:

- Homepage rhythm rebuilt around one restrained accent band.
- Source and roadmap sections merged into a coverage path.
- Live sources visually separated from “adding soon” sources.
- District pilot preview redesigned as a product workflow.
- Account-role cards extracted and reused.
- Sign-in rebuilt as a focused access moment.
- Header and chess-subnavigation alignment.
- Navigation spacing and edge behavior.
- Scroll-reveal motion rules.

Saturday’s most important work was not only visual. It delivered production email, district pilot documentation, public legal disclosures, anonymous-search policy fixes, and platform operations.

---

## 8. What this week changed strategically

At the start of the week, Causey was best described as:

> A chess discovery app with account and organization features.

At the end of the week, it is more accurate to describe it as:

> An early-build scholastic chess discovery and coordination platform with distinct student, parent, coach, school, district, and platform-operations workflows.

The week resolved or materially reduced several earlier architectural risks:

- District is now a hierarchy, not only an organization label.
- Public organizer events now have draft and moderation behavior.
- Platform administration now has a separate shell.
- Staff access no longer depends on a reusable student join code.
- Ownership transfer changes effective authority.
- Assistant access is separated from coach mutation authority.
- Organization verification is governed.
- Public anonymous search no longer relies on staff policy helpers.
- Product notifications now include an email-delivery path.
- The district product has an assisted-pilot runbook.

The remaining risks are therefore less about whether a district workflow can be represented and more about whether Causey can operate, prove, support, contract, and scale that workflow safely.

---

## 9. Current readiness verdict

## 9.1 Ready now

Causey is ready for:

- Local product development.
- Public demonstration with labeled mock data.
- Internal testing with Supabase.
- Public chess-search preview with clear incomplete-data language.
- Controlled testing of role workflows.
- Causey-assisted setup of a small pilot environment.
- Manual verification and moderation.
- Carefully supervised invitation, RSVP, attendance, and aggregate-reporting tests.

## 9.2 Ready only with conditions

Causey can support one assisted district pilot only if:

- The district has signed the appropriate pilot and data agreements.
- The production/staging Supabase stack is fully migrated.
- Every environment secret is configured and owned.
- The full ZIP dataset is loaded.
- Auth SMTP is configured and tested.
- Resend product email is configured and tested.
- The protected cron runs successfully.
- The pilot district and schools are manually verified.
- Causey staff supervise provisioning.
- Support and escalation owners are named.
- The district is told the product’s limitations.
- No unverified pathway or listing claim is presented as guaranteed.
- Access is tested across every pilot role before student onboarding.

## 9.3 Not ready yet

Causey is not ready for:

- Open self-serve district signup.
- Unsupervised district-wide rollout.
- A claim of completed FERPA, COPPA, or state-law compliance.
- A claim of complete nationwide chess coverage.
- A claim that qualification pathways are fully verified.
- A procurement promise without legal/security review.
- A paid subscription launch without contracts, invoicing, entitlements, and support operations.
- In-app payment collection.
- Student-to-student messaging.
- Automatic SIS/roster synchronization.
- Non-chess public-directory launch.

---

## 10. What must be built for school-district readiness

## 10.1 Student-data governance

**Priority: Release blocker for a real student rollout**

Build and approve:

- A complete data inventory.
- A data-flow diagram from browser to Supabase, Resend, Vercel, GitHub Actions, and any AI enrichment service.
- A documented purpose for every student field.
- A decision on whether full DOB must be retained after age-band derivation.
- A retention schedule by data category.
- A tenant-offboarding process.
- Account export.
- Account deletion.
- District-directed deletion.
- Guardian/student link deletion rules.
- Backup deletion expectations.
- A subprocessor list.
- A security and privacy contact.
- A legal request workflow.
- A data-breach workflow.

Acceptance criteria:

- A district can ask what is collected, why, where it is stored, who can access it, how long it remains, and how it is deleted, and Causey can answer with approved documentation and executable procedures.

## 10.2 Under-13 and guardian handling

**Priority: Release blocker where younger students participate**

Build or formally define:

- Age-appropriate signup.
- Parent/guardian notice and consent where required.
- School-authorized consent paths where legally appropriate.
- Revocation.
- Parent/student disagreement handling.
- Guardian routing controls.
- Restrictions on direct communications.
- Minimal email content.
- Safe support verification.

Acceptance criteria:

- An under-13 student cannot silently bypass the required district or guardian process.
- A guardian can understand and manage the link.
- Causey can prove what authorization path was used.

## 10.3 Live authorization testing

**Priority: Technical release blocker**

Build:

- A disposable Supabase test environment.
- Seeded users for every role.
- Positive and negative tests for every RLS policy and privileged function.
- Cross-school tests.
- Cross-district tests.
- Removed-member tests.
- Expired-invitation tests.
- Ownership-transfer tests.
- Last-admin tests.
- Anonymous-search tests.
- Service-role-only function tests.
- Migration upgrade tests.

Acceptance criteria:

- CI proves that each role can perform allowed tasks and cannot read or mutate prohibited records.
- Tests execute against the database, not only against SQL text.

## 10.4 Identity, provisioning, and deprovisioning

**Priority: Required before scalable district adoption**

Build:

- Staff invitation revocation.
- User deprovisioning without deleting personal history.
- School transfer.
- Graduated-student lifecycle.
- Duplicate-account resolution.
- District-domain verification.
- Optional Google Workspace identity.
- Optional Microsoft Entra identity.
- An evaluation path for roster/SIS integrations only when buyer demand is confirmed.
- A workspace switcher for multi-school staff if pilots require it.

Acceptance criteria:

- A district can onboard, change, and remove staff and students without shared passwords, orphaned access, or manual database edits.

## 10.5 Auditing and administrative accountability

**Priority: Required for paid district operations**

Build:

- Searchable audit-log UI.
- Actor, target, action, reason, timestamp, and relevant before/after context.
- Export audit events.
- Role-change audit events.
- Ownership-transfer audit events.
- Verification and moderation history.
- Support-case references.
- Retention and access rules for audit records.
- Alerts for suspicious admin activity.

Acceptance criteria:

- Causey can reconstruct who changed access, exported information, approved an organization, published or deleted an event, and why.

## 10.6 Reliability and observability

**Priority: Release blocker for a paid service**

Build:

- Error monitoring.
- Structured server logs.
- Request tracing for critical workflows.
- Email-outbox health.
- Scraper-source health.
- Cron health.
- Database connection and query monitoring.
- Availability checks.
- User-visible incident communication.
- Alert thresholds.
- On-call ownership.
- Runbooks.

Critical monitored journeys:

- Signup and email confirmation.
- Login.
- Claim invitation.
- Join organization.
- Create and publish tournament.
- RSVP.
- Parent action.
- Product-email delivery.
- Search.
- District report.
- Admin verification.
- Scrape and publish.

Acceptance criteria:

- A critical failure is detected by Causey before a district has to report it.
- An owner, severity, and response procedure exist for every critical alert.

## 10.7 Backups, recovery, and continuity

**Priority: Release blocker for stored student data**

Build:

- Documented backup configuration.
- Restore procedure.
- Restore drills.
- Recovery point and recovery time objectives.
- Secret-loss and key-rotation procedure.
- Data-corruption response.
- Scraper rollback/reconciliation.
- Email retry and dead-letter handling.
- A process for disabled third-party services.

Acceptance criteria:

- Causey has successfully restored a test environment from backup and documented the elapsed time, data loss window, and responsible owner.

## 10.8 Accessibility

**Priority: District procurement and equitable-use requirement**

Complete:

- WCAG 2.2 AA audit.
- Keyboard navigation.
- Screen-reader testing.
- Focus order.
- Error announcement.
- Form labeling.
- Contrast.
- Zoom/reflow.
- Reduced motion.
- Touch-target testing.
- PDF/CSV accessibility considerations where applicable.
- A Voluntary Product Accessibility Template if buyers request one.

Acceptance criteria:

- Core tasks can be completed with keyboard and screen reader, at 200–400% zoom, and without relying on color or motion.

## 10.9 District implementation operations

**Priority: Required for every pilot**

Build and document:

- Pilot owner.
- District owner.
- School owner.
- Verification checklist.
- Data import template.
- Staff training.
- Parent/student communication templates.
- Support hours.
- Escalation channel.
- Incident contacts.
- Pilot success criteria.
- Exit and deletion plan.
- Post-pilot review.

Acceptance criteria:

- The pilot can be run by following a repeatable playbook rather than relying on undocumented founder knowledge.

## 10.10 Procurement package

**Priority: Required before repeatable district sales**

Prepare:

- Master services agreement.
- Data-processing agreement.
- Security addendum.
- Privacy policy.
- Terms of service.
- Insurance review.
- Subprocessor list.
- Accessibility statement.
- Security questionnaire responses.
- Data retention summary.
- Incident response summary.
- Support and service-level commitments.
- Pricing proposal.
- Order form.
- Renewal and termination terms.

Acceptance criteria:

- A district procurement, legal, privacy, accessibility, and IT review can proceed without inventing answers in real time.

---

## 11. What must be built for for-profit readiness

District readiness and for-profit readiness overlap, but they are not the same.

## 11.1 Ideal customer and buyer

Decide:

- Whether the primary buyer is a district, individual school, chess program, club, organizer, or family.
- Whether discovery remains free.
- Which coordination capabilities belong in paid plans.
- Whether a district contract includes all schools.
- Whether clubs outside districts use a separate plan.
- Whether organizers pay for hosted-event operations.

Do not choose pricing before the buyer and delivered outcome are clear.

## 11.2 Packaging and entitlements

Build:

- Product plans.
- Feature-entitlement model.
- Tenant subscription state.
- Trial/pilot state.
- Contract start and end dates.
- Seat, school, event, or usage limits only if the business model truly needs them.
- Grace periods.
- Suspension behavior.
- Renewal behavior.
- Admin visibility into account state.

The product should not scatter plan checks through UI components. Entitlements should be centralized, auditable, and testable.

## 11.3 Pricing

Decide through customer evidence:

- The unit of value.
- Pilot pricing.
- Annual contract structure.
- School versus district packaging.
- Optional organizer services.
- Minimum contract size.
- Discounts.
- Renewal expectations.

No invented price should be published in the current product.

## 11.4 Billing and finance operations

Build or integrate:

- Quotes.
- Order forms.
- Invoices.
- Payment collection for Causey subscriptions.
- Tax and accounting workflow.
- Refund/credit policy.
- Renewal notices.
- Failed-payment handling.
- Revenue reporting.
- Contract and billing ownership.

This is separate from collecting tournament entry fees. Causey can sell software without becoming the payment processor for every tournament.

## 11.5 Sales and customer success

Build a repeatable process for:

- Lead qualification.
- Discovery calls.
- Pilot proposal.
- Security/legal review.
- Implementation.
- Training.
- Launch.
- Adoption review.
- Renewal.
- Expansion.
- Offboarding.

Track real outcomes such as:

- Schools provisioned.
- Staff activated.
- Students invited and activated.
- RSVP completion.
- Registration follow-through.
- Attendance recorded.
- Time saved for coaches.
- District reporting usefulness.
- Support volume.

Avoid vanity metrics and fabricated impact claims.

## 11.6 Support

Build:

- Support intake.
- Severity levels.
- Response targets.
- Ownership.
- Knowledge base.
- Admin support tools.
- Safe account verification.
- Escalation.
- Incident communication.
- Status communication.
- After-action reviews.

Paid users must know how to receive help and what Causey promises.

## 11.7 Product analytics

Build privacy-conscious analytics for:

- Search success.
- Zero-result searches.
- Event-detail opens.
- Registration-link opens.
- Self-reported registration completion.
- RSVP completion.
- Invitation claim.
- Staff activation.
- School setup completion.
- Notification delivery and action.
- Report usage.
- Funnel abandonment.

Requirements:

- Do not use student data for targeted advertising.
- Avoid unnecessary student-level behavioral profiles.
- Define event retention.
- Deduplicate noisy events.
- Exclude secrets and sensitive data.
- Give operators enough evidence to improve the product without building a surveillance system.

## 11.8 Unit economics

Measure:

- Hosting and database cost.
- Email cost.
- AI-enrichment cost.
- Scraper maintenance cost.
- Support time.
- District onboarding time.
- Sales-cycle time.
- Contract value.
- Renewal and churn.

The current AI pathway enrichment already includes batching, caching, heuristics, and caps. Similar cost discipline should apply to every external service.

---

## 12. Proposed future timeline

This timeline is a planning proposal, not a promise. Dates should move when legal review, district schedules, buyer feedback, or technical evidence requires it.

## Phase 0: Evidence and stabilization

**Target window: August 10–21, 2026**

Primary objective:

> Make the current build reproducible, observable, and safe enough to test as one controlled system.

Work:

- Freeze feature sprawl for the critical paths.
- Establish one authoritative migration order through `0039`.
- Create fresh staging and production migration checklists.
- Apply migrations to a disposable environment.
- Add a pull-request CI workflow that runs tests, build/type checks, and migration-policy verification.
- Add live RLS role/tenant matrix tests.
- Resolve `SEC-03` by relocating policy helper functions to an unexposed schema and rebuilding dependent policies.
- Define application and platform rate limits for authentication, claims, search, exports, admin mutations, and cron endpoints.
- Add and verify a Content Security Policy suitable for Supabase, Resend-driven links, and required application assets.
- Load the full ZIP dataset.
- Verify source secrets and token scopes.
- Verify Auth SMTP.
- Verify Resend domain and delivery.
- Verify cron authentication and idempotency.
- Run all six scrapers in staging.
- Add source freshness and row-count alerts.
- Run complete role-journey smoke tests.
- Confirm current `dev` and production parity.
- Remove or relocate unnecessary bulk incoming website assets and PDFs from the long-term repository history where appropriate.
- Review fixture licensing and sensitive-content risk.
- Add baseline error monitoring.

Exit criteria:

- Fresh database setup succeeds from documentation.
- Every critical role path passes.
- Every prohibited cross-role path fails.
- Search, email, cron, ingestion, and reports have health evidence.
- One release checklist exists.

## Phase 1: Pilot legal and data readiness

**Target window: August 17–September 4, 2026**

Primary objective:

> Make the assisted pilot governable, explainable, and contractable.

Work:

- Complete the student-data inventory.
- Decide DOB minimization.
- Define under-13 handling.
- Draft district pilot agreement and data-processing terms.
- Define retention and deletion.
- Build account export.
- Build account deletion.
- Build district-directed deletion operations.
- Publish an approved subprocessor list.
- Create incident and breach runbooks.
- Define pilot support.
- Define pilot success measures.
- Prepare district and school onboarding materials.
- Keep public partner claims at zero until signed authorization exists.

Exit criteria:

- Legal and product owners approve the pilot package.
- Data export and deletion work end to end.
- Pilot participants receive clear notices.
- Support and incident owners are named.

## Phase 2: First assisted district pilot

**Target window: September 7–October 2, 2026**

Primary objective:

> Run one narrow pilot and learn from real school behavior before scaling.

Recommended scope:

- One district or a tightly bounded equivalent.
- One to three schools.
- A small number of staff.
- A limited student cohort.
- Chess only.
- No in-app tournament payments.
- No student-to-student messaging.
- Causey-assisted provisioning.
- Manual verification.

Pilot work:

- Provision district and schools.
- Invite administrators and coaches.
- Transfer school ownership.
- Verify schools.
- Invite students.
- Create at least one scoped tournament.
- Collect RSVPs.
- Track external registration where relevant.
- Send reminders.
- Record attendance.
- Review aggregate district reporting.
- Test support and incident escalation.
- Interview every role.

Exit criteria:

- No unresolved critical access-control issue.
- Email and notifications are reliable enough for the cohort.
- Staff can operate without database assistance for routine tasks.
- Parents understand RSVP versus organizer registration.
- District reports answer a real buyer question.
- Pilot data can be exported and deleted.
- A written pilot review identifies what to keep, change, or stop.

## Phase 3: Paid district readiness

**Target window: October 5–November 20, 2026**

Primary objective:

> Convert a successful assisted pilot into a repeatable paid district offering.

Work:

- Searchable audit-log UI.
- Strong deprovisioning and transfers.
- Optional district domain verification.
- SSO evaluation and implementation based on buyer requirements.
- Improved large-roster and staff operations.
- Accessibility remediation and buyer documentation.
- Monitoring, alerts, on-call, and incident response.
- Backup restoration drill.
- Procurement package.
- Pricing and order form.
- Subscription entitlement model.
- Invoice and finance workflow.
- Customer-success playbook.
- Release and change-management process.

Exit criteria:

- A second district can be onboarded from a playbook.
- Legal, privacy, security, accessibility, and IT questions have approved answers.
- Paid entitlements and contract state are represented safely.
- Operations no longer depend on one person remembering every step.

## Phase 4: Product depth and retention

**Target window: November 23, 2026–January 29, 2027**

Primary objective:

> Increase recurring value for students, families, coaches, and districts.

Candidate work:

- Results and placements.
- Student tournament history.
- Optional US Chess ID and verified rating.
- Eligibility pre-filtering.
- School directory with opt-in controls.
- “My school is going” search filter.
- Capacity and waitlist for hosted events.
- Better season and trend reporting.
- Improved announcement and change history.
- Organizer reconciliation where real data is available.
- Quiet hours and digest preferences.
- Mobile event-day operations.

Exit criteria:

- Users return for a reason beyond the next search.
- Coaches can close the event lifecycle.
- District reporting reflects validated program outcomes.
- Every new student-data field has a documented purpose and policy.

## Phase 5: Scale and integrations

**Target window: February–June 2027**

Primary objective:

> Reduce manual onboarding and support only after the product has repeatable demand.

Candidate work:

- Google or Microsoft district identity at broader scale.
- Roster/SIS integration chosen from actual buyer demand.
- Webhooks and integration API.
- More robust organizer integrations.
- Advanced operational analytics.
- Automated anomaly review.
- More state-affiliate feeds.
- Additional geographic search optimization.
- Multi-region and performance work if measured load requires it.
- More complete support console.

Exit criteria:

- Integrations reduce demonstrated manual work.
- Security boundaries remain testable.
- Cost and support scale are understood.
- Expansion is driven by customer evidence, not feature theater.

## Phase 6: Additional public competition directories

**Earliest sensible window: after chess quality and district operations are stable**

Possible categories already named in product direction include STEM, debate, arts, and writing.

Current foundation as of August 11, 2026: authorized organizations can create,
edit, publish, and coordinate these types plus a named custom type. District
administrators can host district-wide or for a connected school. This is an
internal coordination capability, not evidence of a usable public directory.

Do not expand only by adding category buttons.

Each category requires:

- Reliable source coverage.
- Category-specific taxonomy.
- Eligibility logic.
- Registration semantics.
- District workflow fit.
- Source rights review.
- Moderation rules.
- Data-quality ownership.
- A real user cohort.

Exit criteria:

- Chess is operationally stable.
- Another category has a validated buyer and participant need.
- Causey can support the new category without weakening existing data quality.

---

## 13. Product backlog by urgency

## Immediate blockers

- Live RLS and tenant tests.
- Resolution of the deferred `SEC-03` policy-helper exposure.
- Pull-request CI for tests, production build, and authorization checks.
- Defined rate limits and abuse controls for sensitive public and authenticated endpoints.
- A tested application Content Security Policy.
- Account export.
- Account deletion.
- Retention and deletion procedure.
- Under-13/guardian decision.
- Production observability.
- Backup/restore drill.
- Incident response.
- Migration reproducibility.
- Staging-to-production release checklist.
- Accessibility audit.
- Legal pilot agreement.
- Data-processing agreement.
- Verified qualification content plan.

## Required for repeatable paid district sales

- Searchable audit logs.
- Deprovisioning.
- School transfer.
- Duplicate-account resolution.
- District identity/domain verification.
- SSO where required.
- Procurement documentation.
- Pricing and order form.
- Entitlements.
- Invoicing.
- Support process.
- Customer-success process.
- Security questionnaire package.
- Accessibility statement/VPAT where required.

## High-value product depth

- Results and placements.
- Tournament history.
- Student rating profile.
- School-going search.
- Opt-in school directory.
- Waitlists and capacity.
- Better season reporting.
- Event revision history.
- More granular reminders.
- Mobile attendance improvements.

## Later and high-risk

- In-app tournament payments.
- Real-time coach-parent messaging.
- Student messaging.
- Broad self-serve district signup.
- Automated SIS synchronization.
- New competition categories.

High-risk features require safety, moderation, payment, legal, and operational design before implementation.

---

## 14. Key risks

## Data trust risk

Scraped dates, locations, fees, sections, registration links, and pathways can be wrong or stale.

Mitigation:

- Conservative publication.
- Provenance.
- Source health.
- Human review.
- Correction path.
- Material-change notifications.
- Verified rules and citations.

## Minor-data risk

Causey stores DOB-derived information, school participation, family links, invitations, RSVPs, and attendance.

Mitigation:

- Minimize.
- Scope.
- Encrypt and restrict.
- Document purpose.
- Retain only as needed.
- Provide access/export/deletion.
- Obtain required authorization.

## Authorization drift

The permission model spans SQL migrations, RLS helpers, server actions, data queries, and UI checks.

Mitigation:

- Live role matrix tests.
- Relocate exposed `SECURITY DEFINER` policy helpers and close the explicitly deferred `SEC-03` item.
- Central capabilities.
- Least privilege.
- Audit logs.
- Migration review.
- Negative tests.

## Abuse and browser-policy risk

No Causey-owned application rate limiter or Content Security Policy was found in the reviewed implementation.

Mitigation:

- Inventory Vercel and Supabase default protections.
- Define limits by endpoint and actor.
- Protect login, invitation preview/claim, search, report export, admin mutations, scraper dispatch, and cron.
- Add monitoring and alerting for repeated denials and suspicious patterns.
- Add a tested Content Security Policy with the smallest required source list.
- Document emergency blocking and token-rotation procedures.

## Environment bootstrap risk

The platform-admin migration promotes two named email accounts and fails if they do not already exist. This is safer than silently creating an admin-less environment, but it couples fresh deployment to specific people and manual sequencing.

Mitigation:

- Replace personal-email coupling with a documented secure bootstrap mechanism.
- Require a second-admin recovery path.
- Audit every bootstrap and recovery action.
- Test fresh-environment and disaster-recovery bootstrap procedures.

## Operational concentration

Current workflows rely heavily on founder knowledge and assisted operations.

Mitigation:

- Runbooks.
- Named owners.
- Release checklist.
- Support process.
- Incident process.
- Customer implementation playbook.

## Repository hygiene

Large downloaded website bundles and PDFs were committed as fixtures this week.

Risks:

- Repository size.
- Licensing.
- Unexpected sensitive content.
- Noisy review.
- Dependency-like scripts and assets that are not maintained code.

Mitigation:

- Keep only minimal, purpose-built fixtures.
- Document source and use.
- Remove unnecessary binaries and third-party assets.
- Scan retained files.
- Prefer small sanitized HTML fixtures.

## Commercial risk

The product can be technically impressive without proving who pays, why, and how often.

Mitigation:

- Narrow pilot.
- Buyer interviews.
- Measured time saved.
- Contract evidence.
- Explicit pricing research.
- No fabricated traction.

## Scope risk

Non-chess categories, payments, messaging, and heavy integrations could distract from making the current system trustworthy.

Mitigation:

- Chess first.
- Pilot first.
- Release gates.
- Evidence before expansion.

---

## 15. Recommended operating principles

1. Keep discovery useful without requiring a district account.
2. Keep district reporting aggregate by default.
3. Never imply that an external-registration click means registration succeeded.
4. Never let AI invent qualification rules or official status.
5. Keep platform administration separate from school operations.
6. Use named, expiring staff claims; never shared passwords.
7. Preserve one dominant next action for each role.
8. Treat empty, error, success, and destructive states as part of the feature.
9. Require evidence before publishing partner, coverage, adoption, or impact claims.
10. Expand competition categories only when supply and operations are ready.
11. Build integrations in response to real district requirements.
12. Do not call the product compliant until qualified reviewers approve the full program.

---

## 16. Recommended metrics for the pilot

Metrics should measure whether the workflow works, not create a student surveillance system.

### Activation

- Staff invitations sent.
- Staff claims completed.
- Schools completing setup.
- Students invited.
- Students activated.
- Parent links completed.

### Workflow completion

- Tournament drafts completed.
- Tournaments published.
- Invitations answered.
- External registration follow-ups completed.
- Attendance recorded.
- Reports opened/exported.

### Reliability

- Signup email success.
- Product-email success.
- Cron success.
- Scraper freshness.
- Search API error rate.
- Claim-link failure rate.
- Support incidents.

### User value

- Coach time required to prepare a tournament.
- Parent understanding of the next action.
- Student ability to find a relevant event.
- District ability to answer participation questions.
- Staff willingness to use the product again.

### Safety and trust

- Access-control incidents.
- Incorrect organization claims.
- Moderation corrections.
- Data export requests completed.
- Deletion requests completed.
- Listing corrections.
- Email complaints.

Do not publish these metrics until the sample, methodology, and permission to share are clear.

---

## 17. The next ten actions

If only ten things happen next, they should be:

1. Create a fresh staging Supabase project and prove the complete migration order through `0039`.
2. Build and run a live RLS authorization matrix for every role and tenant boundary.
3. Complete account export, deletion, and retention procedures.
4. Make the under-13 and DOB-minimization decision with counsel.
5. Add production error monitoring, cron monitoring, email-outbox monitoring, and scraper health.
6. Perform and document a backup restoration drill.
7. Complete accessibility testing and fix core-task failures.
8. Finalize the assisted-pilot agreement, data terms, support plan, and incident contacts.
9. Run one small, chess-only district pilot with explicit exit criteria.
10. Use pilot evidence to define pricing, paid entitlements, and the repeatable implementation playbook.

---

## 18. Final assessment

Causey has moved unusually quickly from a public tournament finder to a real multi-role coordination platform. The codebase contains genuine school and district workflow depth: hierarchy, scoped authority, claim provisioning, verification, moderation, tournament operations, RSVP, attendance, aggregate reporting, notifications, email, and platform administration.

That does not make it finished.

The current app is best treated as a technically substantial early build with an assisted-pilot path. The next stage should emphasize proof and operations over surface-area growth. The product needs to demonstrate that it can protect student information, enforce tenant boundaries, recover from failure, support real users, pass district review, and deliver a repeatable outcome worth paying for.

If those foundations are completed and one narrow pilot succeeds, Causey will have a credible path to becoming:

- A trustworthy public competition discovery product.
- A useful student and family planning tool.
- A practical coach operations system.
- A district-level participation coordination platform.
- A sustainable for-profit software business.

Until then, the honest public position remains:

> Chess search is usable, the school workflow is real, and the product is still an assisted early build with incomplete data and unfinished rollout controls.

---

## 19. Primary repository evidence

Key product and operations sources:

- `README.md`
- `ROADMAP.md`
- `SETUP.md`
- `docs/district-pilot-runbook.md`
- `.cursor/district-ux-progress.md`
- `CAUSEY-DESIGN-SYSTEM.txt`
- `anti-vibecode-rules.txt`
- `package.json`
- `app/`
- `components/`
- `lib/actions/`
- `lib/auth/`
- `lib/data/`
- `lib/email/`
- `ingestion/`
- `ingestion/README.md`
- `supabase/migrations/0001_init.sql` through `supabase/migrations/0039_admin_tournament_operations.sql`
- `tests/`
- `.github/workflows/ingest.yml`
- `vercel.json`

Verification performed for this report:

- `git status --short --branch`
- Git log for August 3–8, 2026
- Weekly diff and change counts
- `npm test`
- `npm run build`
- Vercel project and deployment inspection

