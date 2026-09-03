# Agent 9 — Discovery and families

## Scope covered
`app/page.tsx`, `app/chess/page.tsx`, `app/debate/page.tsx`, `app/stem/page.tsx`, `app/arts/page.tsx`, `app/writing/page.tsx`, `app/event/[slug]/page.tsx`, `app/event/[slug]/register/route.ts`, `app/event/error.tsx`, `app/event/loading.tsx`, `app/family/page.tsx`, `app/family/loading.tsx`, `app/me/page.tsx`, `app/me/notifications/page.tsx`, `app/signup/page.tsx`, `app/login/page.tsx`, `app/layout.tsx`, `app/not-found.tsx`, `app/error.tsx`, `lib/category-discovery.ts`, `lib/home-featured.ts`, `lib/data/home-featured.ts`, `lib/home-my-tournaments.ts`, `lib/data/home-my-tournaments.ts`, `lib/competition-comments.ts`, `lib/data/competition-comments.ts`, `lib/actions/comments.ts`, `lib/auth/home-path.ts`, `lib/data/portal.ts` (`getChildrenWithEvents`, `getMyEntrantRows`), `lib/schemas.ts` (search filters), `lib/rate-limit.ts`, `supabase/migrations/0066_competition_comments_and_home_geo.sql`, `components/EarlyBuildBanner.tsx`, `components/SearchClient.tsx`, `components/SearchFilters.tsx`, `components/CategoryDiscoveryPage.tsx`, `components/CategorySources.tsx`, `components/TournamentSources.tsx`, `components/ChessSubnav.tsx`, `components/HomeHeroCard.tsx`, `components/HomeHeroSearch.tsx`, `components/HomeHeroMyTournaments.tsx`, `components/HomeHeroNext.tsx`, `components/HomeFeaturedSection.tsx`, `components/HomeFeaturedRail.tsx`, `components/HomeCoveragePath.tsx`, `components/HomeDistrictPitch.tsx`, `components/HomeAccountPitch.tsx`, `components/CompetitionComments.tsx`, `components/CompetitionCard.tsx`, `components/SignupForm.tsx`, `components/LoginForm.tsx`, `components/ParentStudentSignupGate.tsx`, `components/StudentAccountHandoff.tsx`, `components/FamilyRegistrationActions.tsx`, `components/AlreadySignedInSignup.tsx`, `components/LinkChildForm.tsx`, `components/MissingZipCard.tsx`, `components/AuthNav.tsx`, `components/SiteHeader.tsx`, `components/DisciplineFacetSwitch.tsx`, `components/RsvpButtons.tsx`, `components/ExternalRegistrationPanel.tsx`.

Scrapers were not audited except where UI copy over-promises coverage.

## Verdict
**Partial** — Chess search plus Family/Plan RSVP and organizer-registration follow-through are a real first-run loop for students and parents. The slice is not ready for ~20k mixed-type users, paying clubs as a discovery surface, or custom district portals: the honesty banner is unmounted, homepage featured is chess-only, STEM share metadata still claims VEX, a missing registration URL is labeled “club invitation,” and public comments stamp student display names with no report path or under-13 gate. Non-chess directories are honest in-page and thin in inventory; writing has no upcoming rows.

## Keep
- Per-directory honesty in `DISCOVERY_CATEGORIES` (description, empty copy, active vs reference sources) and `HomeCoveragePath` source bars.
- `SearchClient` loading skeletons, zip validation, error + load-more error, empty-result copy, shareable URL state, mobile filter disclosure.
- Family desk: one “who needs you” mission, RSVP vs organizer registration split, separate-device student signup gate, link-request success, loading skeleton.
- Plan: role next-actions, pending parent-link accept, RSVP inbox, collapsed saved items, “Causey RSVP is not organizer entry.”
- Signup confirmation state, parent-already-signed-in gate, optional zip, no chess default on the hero picker.
- Event error/retry and loading skeletons; fee “not listed”; featured nearby-empty fallback copy.
- Footer coverage caveat (the only site-wide honesty strip actually mounted).

## Findings
1. Site chrome · `EarlyBuildBanner` is never imported; first-run honesty is footer-only · 20k phone users never see the coverage caveat above the fold; homepage mobile copy is only “Pick a type, then search by zip,” and `HomeHeroNext` is `max-md:hidden` · **P0** · **S** · `components/EarlyBuildBanner.tsx`; `app/layout.tsx` (`SiteHeader` + footer only); `app/page.tsx` hero paragraphs; `HomeHeroNext`.

2. Homepage featured · rail is chess + organizer photos only · debate/STEM/arts/writing first-run still looks like a chess product; paying-club and district events are not the preview · **P0** · **M** · `getHomeFeaturedCompetitions` / `PHOTO_FILTERS` in `lib/data/home-featured.ts`; `homeFeaturedCopy` (“See more chess tournaments”) in `lib/home-featured.ts`; `HomeFeaturedSection`.

3. `/stem` metadata · claims “coverage starts with VEX robotics” · contradicts indexed sources (Purple Comet + Texas science fair; VEX is 403 / not indexed) and `HomeCoveragePath` · search/social snippets over-promise · **P0** · **S** · `app/stem/page.tsx` `metadata.description` vs `lib/category-discovery.ts` STEM `activeSources` / VEX reference note.

4. Event next-step · no `reg_url` ⇒ `primaryAction === "invite_only"` with copy “This event is hosted on Causey” · public indexed listings without a registration URL (or org events that are public but not invite-gated) tell families they need a club invite instead of the source page · **P0** · **M** · `primaryAction` and invite-only block in `app/event/[slug]/page.tsx`; `source_url` is only passed into chess `PathwayStatusPanel`.

5. Comments · public thread stamps `display_name`, no report, no under-13 block, silent 50-row cap · at 20k this is abuse + student-privacy risk on every public event (including district-visible listings) · **P0** · **M** · `stamp_competition_comment` in `0066_…sql`; `postCompetitionComment`; `CompetitionComments`; `COMPETITION_COMMENTS_PAGE_LIMIT = 50` with no “more” UI.

6. Signup → discovery shortcut · interests are collected, `preferred_competition_category` is always `null` · a STEM/writing student still lands on the generic homepage chooser until they find Account settings · **P1** · **S** · `SignupForm` `data: { … preferred_competition_category: null }`; `app/page.tsx` `parseDiscoveryCategory(profile?.preferred_competition_category)`.

7. Search state filter · hardcoded `["AZ","CA","FL","IL","MO","NJ","NY","TX"]` · national 20k users cannot filter their state and may read those eight as the coverage map · **P1** · **S** · `STATES` in `components/SearchFilters.tsx`.

8. Non-chess facets · STEM/debate/arts/writing chips advertise robotics, biology, PF, poetry, etc. with almost no rows · first-run empty results look like a broken search rather than a one-source directory · **P1** · **M** · `DisciplineFacetSwitch` + STEM/writing `facets` in `lib/category-discovery.ts` vs `emptyDescription` (honest only after the empty state).

9. Family copy · “Not in any club yet” / “RSVPs tell the club who’s coming” · district families and custom portals still get club language; there is no district-branded discovery or school calendar on `/family` · **P1** · **M** · `app/family/page.tsx` empty org line and `missionDescription`; global `app/page.tsx` featured + coverage.

10. Login · no already-signed-in branch (signup has `AlreadySignedInSignup` / parent gate) · a signed-in parent reopening `/login` can think they failed or create a second-session mess · **P2** · **S** · `app/login/page.tsx` vs `app/signup/page.tsx`.

11. Plan loading · `/family` has `loading.tsx`; `/me` does not · first-run students wait on a blank main while invitations load · **P2** · **S** · `app/family/loading.tsx` exists; no `app/me/loading.tsx`.

12. Event sections · heading always renders; empty `sections` is a blank list · STEM/arts/writing rows with no divisions look unfinished · **P2** · **S** · `competition.sections.map` in `app/event/[slug]/page.tsx` with no empty copy.

13. Chess sources lead · “then … every USCF state affiliate” in the same breath as live feeds · the right column correctly says reference-only; the lead still over-promises for first-run · **P2** · **S** · `TournamentSources` intro vs `AffiliatePreviewColumn`.

14. Writing directory · upcoming empty by design; Timing: All is required · acceptable honesty, not 20k “writing search” · **P1** (product gap, not a copy lie) · **L** (needs permitted live cycles, not UI polish) · `writing` `emptyDescription` / `activeSources` in `lib/category-discovery.ts`.

## Must-build before go-live
1. Mount `EarlyBuildBanner` in site chrome (or put the same chess-vs-other coverage sentence on the mobile homepage hero). Restore a mobile path to coverage/featured.
2. Rewrite `/stem` metadata to match indexed sources; never name VEX as coverage.
3. Split event primary CTA: org invite-only vs public listing with no `reg_url` (offer `source_url` / “confirm on the organizer’s page,” do not say “hosted on Causey” unless it is).
4. Comments for 20k: report/hide, under-13 cannot post (or comments off on public pages), paginate past 50, do not treat display-name snapshot as enough privacy.
5. On signup, set `preferred_competition_category` from the first chosen interest (or a required single shortcut) so Find and homepage honor it.
6. Replace the eight-state filter with a full US list or states that actually appear in results.
7. Disable or badge facets with zero published rows; keep writing’s Timing: All empty path.
8. Family/Plan copy: school/district vs club from org type; if custom district portals exist, first-run parents need that calendar, not only global chess featured.
9. Already-signed-in login gate (mirror signup).
10. Empty-sections copy on the event page; `/me` loading skeleton.

## Open questions for the owner
- Keep public event comments at all for under-13 and district-hosted events, or staff/coach-only notes?
- Homepage featured: chess-only forever, or follow account shortcut / mix types even when photos are sparse?
- District families: stay on the global Causey homepage, or is a custom portal required as the first-run discovery surface?
- Writing (and empty STEM disciplines): stay public with honest empty states, or hide the directory until a live cycle exists?
