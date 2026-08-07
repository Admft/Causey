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
- [ ] District → school hierarchy — verified district tenant, create schools under it, delegate school admins (today orgs are mostly flat clubs)
- [ ] Bulk provisioning — CSV/email invites with claim links, invite status, no shared passwords
- [ ] Real role split — district admin vs school admin vs coach vs student (coach/admin are still collapsed in places)
- [ ] Audience-scoped events — public / district-only / school-only / invite-only (not just public/private)
- [ ] Parent action list — “this child needs RSVP / register / reminder” as the landing, not a generic portal
- [ ] Notifications that matter — invite, deadline, 7-day/1-day reminder, schedule change, cancel (with prefs + guardian routing)
- [ ] District reporting — aggregate by school (counts, attendance, who’s going) without dumping student-level browsing data

## Strongly needed for trust / ops (UX — gpt-5.6-sol-xhigh)
- [ ] Org settings + ownership transfer
- [ ] Assistant coaches / staff invites
- [ ] Coach announcements
- [ ] Attendance history / season view
- [ ] Multi-section tournaments at create time
- [ ] Tournament change history → notify trackers
- [ ] Platform moderation for public org events
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
- [ ] Header still thin for signed-in district work — needs real product IA beyond logo + auth + chess
- [ ] No district-scale layout (multi-school); everything stays a narrow single-org column
- [ ] Roster / manage still feel like admin tables, not school-safe tools

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
