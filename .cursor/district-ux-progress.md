# District UX improvement progress

Living backlog for the continuous improvement loop. Mark items done with date + short note.

## Collaboration note
- **Primary loop (2026-08-06):** persona-audit → big-batch. Playbook: `.cursor/persona-audit-loop.md`.
- Emulate every role each tick; gather findings; ship one **surface-level** batch — not micro chrome.
- Prefer bigger shippable wins (whole role landing / flow / portal shell).
- Before committing, `git pull origin/dev` and run tests.
- Commit as Adam only — no Co-authored-by. Push `origin/dev`. Never touch `main` unless asked.
- Update this file + persona-audit-loop Active batch every tick.
- Old dual “one nit every 2m” UX/polish loops are retired.

## Major UI backlog (kimi-k3-max — prefer these)
- [x] Visual hierarchy overhaul: consistent spacing/typography rhythm across home, search, event, account; kill template-default feel (event/account section heads shipped in fc953a4; home + search shipped 2026-08-05)
- [x] Search results composition redesign (results + filters as one scannable system) — 2026-08-05
- [x] Org workspace visual redesign (coach home reads as one clear mission, not panel soup) — 2026-08-05 (426148a)

## Frontend polish shipped
- [x] Grounded the signed-out home role routing: “Or start as” label and the floating Parent / Coach cards are now one framed panel (“Also create an account as”) with two inset role rows, so the cards no longer float loose on the band. `RoleRouteCards` is no longer used on home (login kept its own inline routing line) — 2026-08-09
- [x] Closed the highest-priority workflow feedback gaps: returned public tournaments now show the platform note and resubmit after correction; parent Alerts includes named linked-student actions routed to Family; create/publish language and results distinguish platform review from immediate member/admin publication; public/account/admin failures no longer expose provider, migration, environment, or dev-server instructions — 2026-08-09
- [x] Early-build banner names the actual coverage gap: indexed US chess search works; fees/venues/events can be missing; other types and roster/family/district tools still change — 2026-08-09
- [x] District pitch wording (copy only, layout untouched): home band now has a direct ready-now / planned-next split. The existing inset names the district foundation already in place (school structure, role-based access, school-level participation), while the existing four-point strip names future work (guided setup, family follow-through, reporting over time, more competition types) — 2026-08-09
- [x] Founder conversation CTAs: home “Talk with the founding team” and `/districts` “Book a district pilot conversation” open the Google Calendar booking page (`lib/founding-team.ts`) — 2026-08-09
- [x] Pilot-safe discovery/setup repair: home district preview now shows private approval gates with no example school directory; mobile chess filters move above the search controls and open into a compact two-column layout; valid team links distinguish lookup outages from stale codes, with anon preview permission restored in `0040` — 2026-08-09
- [x] Header handoff: every viewport stays centered over the hero then FLIP-slides to the right (no justify snap); logo still fades in when the mark tucks under sticky chrome — 2026-08-08
- [x] iMessage/link preview card: `opengraph-image` + `twitter-image` render the Causey mark and wordmark on the canvas (1200×630 PNG); `apple-icon` uses the same mark; `metadataBase` is `https://app.causey.dev` — 2026-08-08
- [x] Hobby-safe product-email cron: Vercel Hobby only allows one cron/day, so `vercel.json` is `0 14 * * *` (14:00 UTC, ± ~1h) instead of `*/5`; login/auth mail is unchanged (Supabase SMTP). Restore `*/5` after Pro — 2026-08-08
- [x] Product build/readiness record: added a repository-evidenced 10,000-word report covering the complete product, Aug 3–8 build history, district and for-profit release gates, risks, acceptance criteria, and a phased Aug 2026–Jun 2027 planning timeline; companion interactive Canvas included; follow-up audit added the deferred `SEC-03` policy-helper exposure, missing PR CI, missing app-owned rate limits/CSP, and named-account admin-bootstrap risk — 2026-08-08
- [x] Live scrape snapshot refresh: TLA, CCA, OnlineReg, Chess-Results, FIDE, and TCA all rerun against Supabase; OnlineReg/FIDE now consume their AJAX feeds, Chess-Results submits its USA search form, zero-row runs fail closed, 1,028 rows absent upstream were archived without deleting saved references, and remaining generic registration homepages fall back to event-specific source pages — 2026-08-08
- [x] Header/subnav right-edge fix: brand-visible header is `justify-end` on the shared `max-w-6xl px-5 sm:px-8` shell, with `sm:pr-2.5` so Sign out / Sign up glyphs match Pathways’ padded label; home hero stays centered until the mark scrolls away — 2026-08-08
- [x] Platform tournament operations: admins can permanently delete one, selected, or every tournament through an audited database RPC with explicit confirmations; a separate Scrapers view dispatches any existing source (or all) through the long-running GitHub Actions workflow and shows recent run results — 2026-08-08
- [x] Sign-in page simplified (supersedes the 2026-08-08 two-col rebuild): one centered task column on the access-grid motif — heading, form card, and a single quiet role-routing line ("Start as a student / a parent / a coach or organizer") replacing the stacked role cards + coach disclosure that duplicated the form's own create-account link; invite/join states keep create-account panel first, now in the same centered column — 2026-08-08
- [x] Home account band rebuilt (again, supersedes the 2026-08-08 dead-zone fill): solid `brand-blue-soft` band instead of the washed-out /50 wash; duplicate Student card removed from the right column (the primary CTA already is the student route) and the orphan "Coach or organizer?" disclosure folded into a proper third role card — `RoleRouteCards` gained `exclude`/`includeCoach` props so login keeps student+parent+disclosure while home shows Parent + Coach cards; row-span gymnastics gone, both columns self-center — 2026-08-08
- [x] Sign-in page rebuild: centered single-column form replaced with the access-grid motif (sign-in is the access moment, §7) and a two-column composition — task copy left, white form card right spanning both rows and self-centering. Default state routes new visitors with shared `RoleRouteCards` + coach disclosure under the copy; invite/join states swap in a calm blue conversational panel (create-account first on mobile); dead claim links get a search next-step card. `RoleRouteCards` extracted from `HomeAccountPitch` so the role pitch has one source — 2026-08-08
- [x] Home account band dead zone: coach disclosure moved under the copy column (desktop `md:col-start-1`, capped at the copy measure) while the role cards span both grid rows and self-center — the lopsided gap under "Create a student account" is filled; mobile order unchanged (copy → role cards → coach) — 2026-08-08
- [x] Header/subnav lateral alignment: header container now matches the chess subnav (`px-5 sm:px-8`, brand absolute at the same left content edge) and the brand-visible right-shift transform lands the nav group's right edge exactly on the shared right content edge — the centered-hero → shift-right-on-scroll handoff is preserved (an earlier auth-pins-right-always approach was reverted per user); mobile/tablet keep the flush-right nav group, now on the same padding — 2026-08-08
- [x] Home district pitch rebuild: brochure two-col replaced with a product moment — illustrative district pilot preview card (mirrors the real command center: next step, school-readiness hairline list, setup progress bar, "no student roster" caption; labeled Illustrative) + the four pilot stages as a numbered 01–04 strip. Shipped `ScrollReveal`, the site's one shared scroll-reveal pattern (12px rise + fade, once on entry, small-group staggers, reduced-motion/no-JS safe per the loosened §5 motion rules) — 2026-08-08
- [x] Chess search 500: anon RLS no longer invokes `can_view_competition` or unpublished-manager `is_org_staff` (`0037`+`0038`); `/api/competitions` returns JSON on failure instead of a blank Next error that the UI treated as “couldn’t reach the API” — 2026-08-08
- [x] Home coverage path: merged the "Where these tournaments come from" band and the "Four more competition types" roadmap band into one §8.11 progress path (six live feeds → state affiliates → four more types) — the adjacent bands read as two unrelated sections; the scroll-triggered red line draw + node fills are the page's one mid-page motion moment (reduced-motion and no-JS get the finished path). `TournamentSources` stays on `/chess` as search provenance — 2026-08-08
- [x] Sources band column differentiation: "Adding soon" is now a contained soft-grey directory inset (repo's standard `border-line bg-surface-soft` panel) with a dense two-col state grid and see-all link, versus the open logo feed of "Indexing now" — the columns no longer read as one template stamped twice — 2026-08-08
- [x] Homepage rhythm rework (supersedes the 2026-08-07 five-surface rhythm): single-accent band plan — hero canvas → white bands joined by hairlines → one soft-blue account band as the only tinted moment; cut the redundant "Chess is ready" band (hero search already does that job and links `/chess`); section order is now act → trust → roadmap → district → convert; "Adding soon" names six real state affiliates (Tier 1 minus already-live TCA, topped up from Tier 2) with a dynamic-count see-all link instead of one generic row — 2026-08-08
- [x] Product email delivery: verified `mail.causey.dev` Resend integration; service-role outbox claiming; idempotent retries; invitation claims, deadline/7-day/1-day alerts, change/cancel/RSVP/announcement delivery; prefs-aware active-guardian routing; protected Vercel cron (`0036`) — 2026-08-08
- [x] District-readiness audit batch: public district pilot path, privacy/terms disclosure, separate-device parent→student handoff, fail-closed join links, role-safe assistant access, district-scale shell, aggregate CSV export, and explicit empty-state actions (`0035`) — 2026-08-08
- [x] Admin organizations overhaul: stat-filter strip, search + type filter, single scannable queue (pending first), on-demand detail panels with member/tournament counts, one-click verify / correction-note actions, district school roster + bulk verify inside the district panel, collapsible Add organization form — 2026-08-08
- [x] Admin TCA publish honesty: status counts + Published/Draft splits, stronger Published badge, bulk-publish follow-up that chess defaults to upcoming; search empty copy for source + ended listings — 2026-08-08
- [x] District pilot bootstrap: aggregate readiness model + one-next-action district command center; school create → admin claim → ownership handoff; district-grouped platform verification with guarded bulk verify; assisted-pilot runbook (`0034`) — 2026-08-08
- [x] Signed-in home account band: mirrors signed-out grid — copy + primary CTA left, descriptive next-step cards right — 2026-08-07
- [x] In-app alerts max-out: prefs-aware notification RPC + schedule/cancel dedupe; invite/RSVP/announcement/account producers; `/me/notifications` Needs attention + unread/mark-read; honest email-off copy; Alerts nav unread count — 2026-08-07
- [x] Home account pitch iPad fix: 2-col from md + capped role cards so signup bubbles don’t stretch full-bleed — 2026-08-07
- [x] Account Sign-in panel: official change-email + change-password forms (current password required); pending email status; `#signin` deep link — 2026-08-07
- [x] Calm `/account` UX: segmented Profile/Alerts/Family/Orgs panels (one job at a time), no mission dump; quieter alert prefs list — 2026-08-07
- [x] Home section color rhythm: canvas → white → soft grey → soft blue → white with token-based band joins (no flat accidental planes) — 2026-08-07
- [x] Account settings hub (`/account`): role-aware Profile, Sign-in, Alerts prefs, Search defaults, Family, Organizations; nav Account for everyone; Alerts inbox separate; `/me` plan-only — 2026-08-07
- [x] Home “Chess is ready” + signed-in pitch: two-column coverage/roadmap band; signed-in actions sit under copy instead of floating in empty right space — 2026-08-07
- [x] Admin tournament ready cue: drafts with complete location/details show Ready to publish / Needs details badges, plus a Ready to publish filter checkbox and select-ready bulk action — 2026-08-07
- [x] Kill empty soft mission bubbles + tablet layout: PortalMission is a compact left-rule; coach orgs use inline CTAs; home hero is two-column from md with overflow-safe header — 2026-08-07
- [x] Coach `/orgs` landing: dropped generic “mission” eyebrow, named the empty-roster job, and replaced equal org cards with a priority hairline directory — 2026-08-07
- [x] TCA scrape accuracy + admin bulk accept: detail parser captures venue/dates/ZIP so ready rows auto-publish; tournaments and moderation support select-many and publish-by-source drafts — 2026-08-07
- [x] Admin tournament source filter: dropdown now includes all live scrape sources (TCA, FIDE, OnlineReg, Chess-Results) from the shared ingestion list — 2026-08-07
- [x] Home brand handoff: the header starts with centered navigation while the hero Causey mark is visible, then reveals its logo and shifts navigation right after that mark scrolls away — 2026-08-07
- [x] Claim-link ops without email: People can reissue+copy pending invites and export bulk CSV claim links; login uses invitation preview for staff vs student handoff — 2026-08-08
- [x] Staff invitation onboarding: trusted preview, fail-closed dead links, no-DOB signup, preserved parent/student persona, membership-driven staff navigation and tournament authority (`0029`–`0030`) — 2026-08-07
- [x] Effective organization authority: owner replaces creator as authority after transfer; district admins retain child-school controls; event auth preserves context; moderation publish confirms (`0028`) — 2026-08-07
- [x] Platform organization verification: private review queue + correction notes, pending-by-default schools, org-admin status handoff, and database self-verification guard (`0027`) — 2026-08-07
- [x] District-safe organization lifecycle: platform-only district creation; no district student join/invite/roster paths; school-admin handoff; immutable org type; migration `0025` — 2026-08-07
- [x] Honest alerts center: real records first; automated/email delivery explicitly inactive; role-aware empty action; future preferences + truthful nav — 2026-08-07
- [x] Org admin people mission: join-link vs email-invite guidance; CSV demoted; copyable claim-path success — 2026-08-07
- [x] Coach empty-org join before create: overview + `/orgs` invite-students first when roster empty; student count meta — 2026-08-07
- [x] School-safe tournament manage: invite/reply/attendance mission, invite-first empty state, hairline replies, `#rsvps` + OrgSubnav fix — 2026-08-06
- [x] Student/parent activation: join-club-first student plan; family pending CTA + create-student handoff; Plan/Family copy aligned — 2026-08-06
- [x] Roster school-safe composition: mission (join → group → ready), student hairline list, groups for invites, staff demoted — 2026-08-06
- [x] Portal mobile sticky next-action: mission CTA pinned on phones; Alerts in mobile AuthNav — 2026-08-06
- [x] Moderation queue: applied `0024` columns (`submitted_for_review_at`, review fields, org `verification_status`) + clearer schema-gap error — 2026-08-06
- [x] Moderation-first admin home: pending-review mission + queue preview; create tasks demoted; Moderation leads subnav — 2026-08-06
- [x] Manage ↔ org workspace: OrgSubnav on manage/edit, pending_review/rejected slug lookup, roster deep-link from empty invite, admin tabs stay on roster — 2026-08-06
- [x] Mobile header nav: short labels (Orgs / Plan / Clubs), whitespace-nowrap + shrink-0, tighter gaps, hide scrollbar on overflow — 2026-08-06
- [x] Discovery conversion honesty: chess search copy + home coverage + student-primary account pitch — 2026-08-06
- [x] Parent desk registration inbox (RSVP + unfinished organizer registration; parent can mark complete) — 2026-08-06
- [x] Invite-first join auth: soft landing + Create student account primary; anon org preview (`0020`) — 2026-08-06
- [x] Coach org-home mission on `/orgs/[slug]` (resume draft → manage next → create-first) — 2026-08-06
- [x] Event next-action tree: one dominant step by viewer state; Save/rate demoted — 2026-08-06
- [x] Role workspaces differentiated: parent desk (`/family` action inbox), student plan (`/me` + nav/homePath), coach mission (`/orgs`), portal primitives — 2026-08-06
- [x] Search filter rail: sticky sidebar scrollbar no longer overlays filter controls (inner `pr-4` inset + soft-scroll thumb; column 240→256px — overlay bars ignore padding on the scroller) — 2026-08-06
- [x] Navigation chrome: chess search is now one tap away in the global header for everyone (signed out included), with active-state awareness across Chess/Family-or-orgs/Account/Admin links; mobile keeps a short "Chess" label so the cluster fits phones — 2026-08-05
- [x] Org workspace: one mission panel leads (resume freshest draft → next tournament with manage/RSVP → create-first-tournament empty state); extra drafts, other upcoming, and attending events demote to quiet hairline rows; "Create another tournament" drops to a text link when a mission exists — 2026-08-05 (426148a)
- [x] Search composition: applied rail filters restate as removable chips above the results (visible in every state, even with the rail collapsed/scrolled away), desktop rail goes sticky, and paging moves to the bottom row where "load more" happens — 2026-08-05
- [x] Home/search hierarchy: chess gets the one big coverage panel (unbuilt types demoted to a plain list), hero copy de-doubled, /chess search controls read as one labeled cluster, result count anchors the results header — 2026-08-05
- [x] Tournament display: make events easier to scan (date/venue/level sections, cleaner hierarchy on event cards) — 2026-08-05
- [x] Responsive audit: phone/tablet/desktop without clashing grids — 2026-08-05 (/chess filter rail collapses into a disclosure below lg)
- [x] Alive feel: intentional micro-interaction — 2026-08-05 (`.nudge-x`, card-lift focus-visible, reduced-motion)
- [x] Event page polish: hero/info without empty image chrome — 2026-08-05
- [x] Loading/empty states that feel designed — 2026-08-05 (route skeletons for /orgs + /family)

## Done
- [x] 2026-08-08 — Scrape outbound accuracy: every feed retains an event-specific destination when one exists instead of a generic registration homepage. US Chess resolves exact, year-aware Squarespace event pages; CCA stays on its event detail because ChessAction exposes only a homepage; dedupe prefers a lower-priority source's more specific registration page + cover. Images now prefer event cover → organizer/source homepage visual → empty without changing the registration link. Live cleanup: 23 Texas Chess Center links with 22 distinct event covers, 50 CCA + 364 TLA homepage links replaced, 86 unrecoverable legacy links cleared, and 80 upcoming hub rows backfilled with source visuals
- [x] 2026-08-08 — Admin tournament list and chess search now say when TCA publishes succeeded but stay visible / are past-dated; incomplete Unknown/00000 rows stay draft
- [x] 2026-08-07 — Scrape upserts preserve globally matched competition IDs across source collisions, preventing related sections from blocking imports; 42 staged TCA tournaments imported successfully
- [x] 2026-08-05 — External tournament entry now consistently says “organizer registration,” distinguishes it from Causey RSVPs, and tells families where to finish and how to confirm completion
- [x] 2026-08-05 — RSVP controls now show which answer is saving, confirm exactly what the organization can see, explain that the answer remains changeable, and recover from unexpected connection failures
- [x] 2026-08-05 — Platform moderation now shows the event, source, audience, and organizer context needed for a decision; rejected listings require a useful note; every decision confirms what changed and points to the next review or record
- [x] 2026-08-05 — Roster group changes now show action-specific progress, confirm what changed and what coaches can do next, guide the first empty state, and protect deletion with a student-safe confirmation
- [x] 2026-08-05 — Family link requests now confirm the privacy-safe handoff, tell parents exactly where students accept, and preserve the email for retry after unexpected failures
- [x] 2026-08-05 — Signed-in organization members see their own public/private tournaments in search with a bounded ranking lift that still keeps higher-interest public events discoverable
- [x] 2026-08-05 — Coach tournament invites distinguish an empty student roster from an already-invited roster, confirm exactly how many invitations were sent, and point to the next action
- [x] 2026-08-05 — Signup carries each role through plain-language account choices, roster-visible name guidance, and a next-step email confirmation handoff
- [x] 2026-08-05 — Join-link sign-in names the required student account and offers student-specific account creation without losing the invitation
- [x] 2026-08-05 — Tournament creation requires a stored cover, autosaves coach-only drafts, resumes from the organization workspace, and publishes after preview + audience review
- [x] 2026-08-05 — Join-link signup is student-specific, explains roster access, and preserves the invitation through sign-in and email confirmation
- [x] 2026-08-05 — Section headings settle into one rhythm (fc953a4)
- [x] 2026-08-05 — My tournaments Upcoming/Past timeline (c6e22b7)
- [x] 2026-08-05 — Link affordances feel alive and keyboard-equal (9bebe4a)
- [x] 2026-08-05 — Search popularity defaults + soonest-first (93c5de6)
- [x] 2026-08-05 — Search filters collapse on phones/tablets (ac1d334)
- [x] 2026-08-05 — Search provenance labels + plain-language source filter (8463cd0)
- [x] 2026-08-05 — My tournaments invitations first with in-place RSVP (3d4c477)
- [x] 2026-08-05 — Route-loading skeletons for /orgs + /family (da2b0d4)
- [x] 2026-08-05 — External registration “Did you register?” + My tournaments lists (a7701b5)
- [x] 2026-08-05 — Event pages without cover go text-first (541c7eb)
- [x] 2026-08-05 — Tournament cards scan by weekend/place/level (66067bc)
- [x] 2026-08-05 — Join links survive login/signup/email confirm (76fc71b)
- [x] 2026-08-05 — Tournament create details → audience/review → publish (c6d1003)
- [x] 2026-08-05 — Org workspace: tournaments lead, invites one click away (f01ef0c)
- [x] 2026-08-05 — Role-aware account next actions (e47932c)
- [x] 2026-08-05 — Escalation lockdown + draft→publish (migration 0016)
- [x] 2026-08-05 — Role-aware post-auth landing (a81e453)

## Open — P0/P1 UX leftovers
- [x] Tournament create flow: required image + persisted drafts — completed 2026-08-05 with cover upload, autosave/resume, preview, audience review, and publish validation
- [x] Signup / join-org copy + flow: student join links preserve invitations; generic signup now carries student, parent, and coach intent through account creation and confirmation
- [x] Search: org-member tournaments receive a bounded interest boost; stronger public interest and explicit soonest sorting still win
- [ ] Empty/error/success states that always name the next action
- [ ] Navigation consistency: same terms for org and event across pages (RSVP vs. organizer registration aligned 2026-08-05)

## Must have for a real district pilot (UX — gpt-5.6-sol-xhigh)
Pick these before polish. One major end-to-end win per tick.
- [x] District → school hierarchy — verified district tenant, child-school creation, readiness command center, school-admin claim/ownership handoff, and grouped platform verification — 2026-08-08
- [x] Bulk provisioning — CSV/email invites with claim links, invite status, reissue, bulk claim export, and Resend delivery; no shared passwords — 2026-08-08
- [x] Real role split — assistants now have read-only scoped staff access; coaches operate rosters/tournaments; school and district administrators lead with administration work (`0035`) — 2026-08-08
- [x] Audience-scoped events — public / district-only / school-only / invite-only enforced through tournament creation + RLS — 2026-08-08
- [x] Parent action list — family landing leads with per-child RSVP and unfinished organizer registration — 2026-08-06
- [x] Notifications that matter — invite, deadline, 7-day/1-day reminder, schedule change, cancel (with prefs + guardian routing) — 2026-08-08
- [x] District reporting — aggregate school counts for students, upcoming events, pending RSVPs, going, and attendance without browsing data — 2026-08-08

## Strongly needed for trust / ops (UX — gpt-5.6-sol-xhigh)
- [x] Org settings + ownership transfer
- [x] Assistant coaches / staff invites
- [x] Coach announcements
- [x] Attendance history / season view
- [x] Multi-section tournaments at create time
- [x] Tournament change history → notify trackers
- [x] Platform moderation for public org events
- [ ] Consistent empty/error/success “what’s next” + nav terms

## Already looks intentional (do not re-polish unless regressing)
- Home + `/chess` search (hierarchy, chips, mobile filters)
- Tournament cards + event pages (less dead chrome)
- Brand tokens, type pairing, light motion (`.nudge-x`, card-lift)
- Org workspace mission panel (426148a)
- Global header chess/account nav active states

## Still visually unfinished for districts (UI — kimi-k3-max)

### Biggest gap — role workspaces
- [x] Coach org home panel soup → one mission panel (426148a list; `/orgs/[slug]` mission 2026-08-06)
- [x] `/family`, `/me`, `/orgs` no longer share one recipe — parent desk / student plan / coach mission (2026-08-06)
- [x] Parent desk vs student plan vs coach mission differentiated (district overview still open)

### Chrome / IA
- [x] Header chess link for signed-in/out discovery (partial)
- [x] Personal Account settings hub at `/account` (profile/alerts/family/orgs); role workspaces stay mission-first
- [x] Header and org subnav distinguish district work with Schools / District staff / Reports / Settings — 2026-08-08
- [x] District landing uses a two-column command center + multi-school readiness directory and is prioritized from `/orgs` — 2026-08-08
- [ ] Roster / manage still feel like admin tables, not school-safe tools

## Account settings backlog (Exists / Wire / Pilot / Legal)

Legend: **Exists** shipped · **Wire** schema/UI partial · **Pilot** district-needed · **Legal** owner/legal gate · **Out** do not build

### Shared (all personal accounts)
- Display name, state, zip, chess interest, locked role readout — **Exists** (`/account` Profile)
- Home zip as search default — **Exists** (profile zip + Search section)
- Password reset from signed-in settings — **Exists** (link to forgot-password)
- Email view + confirmation status — **Exists**
- Alert type toggles + timezone + guardian routing + email-later — **Exists** UI / delivery **Wire**
- Change email · sign out all sessions — **Pilot**
- Delete account · data export — **Legal**
- US Chess ID / rating · grade/school year — **Pilot**
- Quiet hours · digest vs immediate — **Pilot** (after email)
- Persisted distance/source search prefs — **Pilot**
- Profile photo · marketing email · billing · themes · API keys — **Out**

### Student
- DOB → age band + under-13 copy — **Exists**
- Parent link accept/decline on `/account` + `/me` — **Exists**
- Leave club — **Pilot**
- Per-parent revoke from student side — **Pilot** (decline/revoke path exists via HouseholdRequestActions)

### Parent
- Linked students + unlink + family desk deep link — **Exists**
- Pending request count — **Exists**
- Per-child alert type routing / mute — **Pilot**
- Contact phone for coaches — **Legal** / **Pilot**

### Coach / school admin / district admin (personal thin; org deep links)
- Org list with Overview / Roster / People / Settings jumps — **Exists**
- Org rename, ownership, verification, join-code, People invites — **Exists** on org pages
- Default publish audience · cover defaults · attendance season · announcement defaults — **Pilot**
- Assistant coach permissions matrix — **Pilot**
- District school create — **Exists**; default state for new schools — **Pilot**
- Aggregate reporting scope — **Pilot**
- Platform admin stays `/admin` (link from `/account` when admin) — **Exists**

### Mobile
- [x] Search mobile pass (filter disclosure)
- [ ] Portals didn’t get a mobile pass — tall lists, no sticky “next action” on phone
- [ ] Subnav + banner + header can eat the viewport

### Feedback / trust
- [ ] Motion mostly stops at discovery; portals feel static
- [ ] No shared success/confirm visual language (RSVP, invite, save)
- [ ] Config/error dumps can look unfinished; provenance is present but quiet

## Recommended build sequence (audits 2026-08-05)
Evidence from schema audit, event-ops map, and role-workspace map. Prefer this order over picking random open boxes.

### Schema / UX foundation (do first — unblocks the rest)
1. **`0018` hierarchy + role split + governance** — `parent_org_id` / verification, split `is_org_coach` → `is_org_staff` / `is_org_admin` / `is_district_admin` (keep `is_org_coach` as staff alias for 0017 policies), staff invites, provision claim tables, ownership-transfer RPC. Extend `0016` column grants if touching `competitions`.
2. **Real role split in app** — mirror helpers in `lib/org-permissions.ts` + portal; stop treating coach ≡ admin ≡ creator in UI.
3. **Bulk provisioning UX** — CSV/email claim links on top of provision tables (join codes stay student-only).
4. **Public-event moderation gate** — `pending_review` (or `moderation_status`) + platform admin; public organizer publish must not skip review. Re-check `/admin` shell exists before assuming greenfield.
5. **Audience-scoped events** — `public` / `district` / `school` / `invite_only` + RLS; **requires hierarchy** or district/school audiences collapse to single-org private.

### Coach ops (can parallel after foundation starts)
6. Multi-section create/edit (schema + RLS already exist; only default Open section today).
7. Tournament change history → feeds tracker notifications.
8. Coach announcements (org page; low dependency).
9. Attendance season view (RPC + page; clarify RSVP history vs check-in).
10. Org settings + ownership transfer UI (RPC from step 1).
11. Notifications/reminders + prefs + guardian routing (needs email infra + change history).
12. District aggregate reports (needs hierarchy; aggregate only, no student browsing PII).

### Visual / portal shell (UI — kimi-k3-max; can start in parallel)
13. Extract shared portal primitives (mission panel, list row, success/confirm feedback, subnav tabs) — reuse `/family` mission panel + EntrantManager success patterns.
14. Portal layout + role-aware signed-in nav (beyond logo + auth + chess).
15. Differentiate `/family` (parent desk) vs `/me` (student plan) vs `/orgs` (coach mission) vs future district overview.
16. Mobile sticky next-action on portals; tame subnav + banner + header stack.
17. School-safe roster/manage composition; quieter config/error dumps; louder provenance.

### Hard dependencies (do not skip)
- District/school audiences and district reporting **block on hierarchy**.
- Tracker emails **block on change history** (+ email provider).
- Staff/admin roles **block on splitting `is_org_coach`** and a non-join-code invite path.
- Any new organizer-writable `competitions` column must append to the `0016` UPDATE grant whitelist.

## Notes for the agent
- Source audit: `~/.cursor/plans/causey_district_readiness_audit_baa4181f.plan.md`
- Roadmap: `ROADMAP.md`
- Prefer district-pilot / trust-ops majors over micro-polish. UX → `gpt-5.6-sol-xhigh`. UI → `kimi-k3-max`.
- Schema truth: district is still a cosmetic `organizations.type`; coach/admin collapsed via `is_org_coach`; join codes always grant `student`.
- Last UX tick: 2026-08-05 — aligned external tournament entry around “organizer registration,” kept it distinct from Causey RSVPs, and named the next action in every state.
- Next UX: start sequence item 1 — `0018` hierarchy + role-split helpers + staff/provision tables (then app mirrors).
- Last polish tick: 2026-08-05 — global header nav: persistent chess link + active states + mobile-safe cluster.
- Next polish: sequence item 13–15 — portal primitives + role workspace differentiation.
- Last persona batch (2026-08-06): portal mobile sticky next-action + Alerts in AuthNav. Next: roster school-safe or district landing (schema-gated).
- Tick 13 audit (2026-08-07): empty-roster→join on `/orgs/[slug]` still P1; Active batch locked as coach empty-org join-before-create (overview ± `/orgs` hint). People/settings deferred.
- Business direction confirmed 2026-08-07: Causey is intended to be for-profit. Do not invent pricing; packaging and the school/district buyer journey still need owner decisions.
- Tick 15: alerts surface made honest. For-profit/minor-data follow-up is not merely copy: DOB minimization and public data disclosures need an explicit owner/legal decision.
- Tick 15 follow-up: audit found P0 district lifecycle leaks. Migration `0025` reserves district creation for platform admins, locks governance fields, blocks district student/school-admin membership and invitations, and excludes districts from join-code flows. App mirrors those boundaries and sends new schools to admin delegation.
- Platform admin user access (2026-08-07): `/admin/users` now provides paginated account search by display name/email plus confirmed, audited account-role and platform-admin changes. Search terms stay out of URLs, email remains behind an admin-checked RPC, the abuse kill switch is read-only, and self-access/concurrent last-admin removal are blocked.
- Tick 16: organization verification is now a governed workflow. Migration `0027` blocks direct self-verification and keeps correction notes private; platform admins get a pending-first queue, while organization admins see the decision and next step in Settings.
- Tick 16 audit follow-up: migration `0028` removes creator-derived authority after ownership transfer and centralizes child-school/tournament checks in database helpers. Also preserved event return paths through login, confirmed public publication, and distinguished migration gaps from user-search outages.
- Tick 17: migrations `0029`–`0030` make claim links a trustworthy staff onboarding flow. Anonymous previews are privacy-minimized, dead links fail before signup, and invitation signup skips student DOB. Existing parent/student personas remain intact; active organization roles add staff navigation and scoped tournament authority instead of overwriting global account access.
- Tick 18 (2026-08-08): claim-link ops without email — People reissue+copy for pending invites, CSV bulk claim-link export, and login handoff that uses the invitation preview so staff vs student account creation stays aligned.
- Business constraint (2026-08-08, tightened 2026-08-09): no partner district or school may be added to the public site until the right paperwork is signed. Keep zero names, logos, speculative directories, or counts public; the home district card now explains private approval gates instead of previewing example schools. When approvals land, provisioning is an ops task, not a build task: platform-admin district creation (`0025`), assisted-pilot runbook (`0034`), pending-by-default school verification.
