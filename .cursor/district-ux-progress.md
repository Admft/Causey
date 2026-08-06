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
- [ ] Visual hierarchy overhaul: consistent spacing/typography rhythm across home, search, event, account; kill template-default feel (event/account section heads shipped in fc953a4; home + search remain)
- [ ] Search results composition redesign (results + filters as one scannable system)
- [ ] Org workspace visual redesign (coach home reads as one clear mission, not panel soup)

## Frontend polish shipped
- [x] Tournament display: make events easier to scan (date/venue/level sections, cleaner hierarchy on event cards) — 2026-08-05
- [x] Responsive audit: phone/tablet/desktop without clashing grids — 2026-08-05 (/chess filter rail collapses into a disclosure below lg)
- [x] Alive feel: intentional micro-interaction — 2026-08-05 (`.nudge-x`, card-lift focus-visible, reduced-motion)
- [x] Event page polish: hero/info without empty image chrome — 2026-08-05
- [x] Loading/empty states that feel designed — 2026-08-05 (route skeletons for /orgs + /family)

## Done
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
- [ ] Tournament create flow: required image + persisted drafts (preview → audience → publish already exists)
- [ ] Signup / join-org copy + flow: student-specific join signup shipped 2026-08-05; broader role-copy audit remains
- [ ] Search: org-member boosting without burying public discovery
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
- Next UX: finish tournament create (required cover + drafts) and/or signup copy.
- Next polish: home/search visual hierarchy or search results composition redesign.
