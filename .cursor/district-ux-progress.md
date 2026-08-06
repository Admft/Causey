# District UX improvement progress

Living backlog for the continuous improvement loop. Mark items done with date + short note.

## Collaboration note (two agents run in parallel — user requested)
- **UX agent** (gpt-5.6-sol xhigh): workflow/IA/role tasks from the P0/P1 UX list.
- **Frontend polish agent** (kimi-k3 max): visual feel, responsiveness, composition, tournament display.
- Prefer **bigger shippable wins** over tiny chrome (a whole surface or flow slice, not “nudge one arrow”).
- Own different files when possible. If you both need the same file, prefer the smallest change or skip and take another item.
- Before committing, `git pull origin dev` and run tests so parallel work merges cleanly.
- Commit as Adam only — no Co-authored-by. Push `origin/dev`. Never touch `main` unless asked.
- Update this file every tick.

## Major UI backlog (kimi-k3-max — prefer these)
- [x] Visual hierarchy overhaul: consistent spacing/typography rhythm across home, search, event, account; kill template-default feel (event/account section heads shipped in fc953a4; home + search shipped 2026-08-05)
- [x] Search results composition redesign (results + filters as one scannable system) — 2026-08-05
- [x] Org workspace visual redesign (coach home reads as one clear mission, not panel soup) — 2026-08-05 (426148a)

## Frontend polish shipped
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

## Open — P0/P1 UX (do these first)
- [x] Tournament create flow: required image + persisted drafts — completed 2026-08-05 with cover upload, autosave/resume, preview, audience review, and publish validation
- [x] Signup / join-org copy + flow: student join links preserve invitations; generic signup now carries student, parent, and coach intent through account creation and confirmation
- [x] Search: org-member tournaments receive a bounded interest boost; stronger public interest and explicit soonest sorting still win
- [ ] Empty/error/success states that always name the next action
- [ ] Navigation consistency: same terms for org, event, RSVP, register across pages

## Open — P2 (after P1)
- [ ] Bulk invite UX (CSV/email claim links) — district/school staff first
- [ ] Coach announcements on org page
- [ ] Assistant coach invite path
- [ ] Org settings (rename, type/state, ownership transfer)
- [ ] Notification preferences + deadline reminders
- [ ] Parent linked-children action list

## Notes for the agent
- Source audit: `~/.cursor/plans/causey_district_readiness_audit_baa4181f.plan.md`
- Roadmap: `ROADMAP.md`
- Parallel UX + polish loops stay on (user requested). Prefer bigger wins.
- Last UX tick: 2026-08-05 — completed the platform-admin public tournament review flow with decision-ready context, required return notes, and recoverable success/error states.
- Next UX: audit event RSVP and registration language for consistent terms and explicit next actions.
- Last polish tick: 2026-08-05 — global header nav: persistent chess link + active states + mobile-safe cluster.
- Next polish: family workspace composition, or empty/error/success-state visual pass.
