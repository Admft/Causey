# District UX improvement progress

Living backlog for the continuous UX loop. Mark items done with date + short note.
Pick the highest-impact **open** item each tick. Prefer workflow clarity over chrome.

## Collaboration note (two agents run in parallel)
- **UX agent** (gpt-5.6-sol xhigh): workflow/IA/role tasks from this file.
- **Frontend polish agent** (kimi-k3 max): visual feel, responsiveness, tournament display.
- Own different files when possible. If you both need the same file, prefer the smallest change or skip and take another item.
- Before committing, `git pull origin dev` and run tests so parallel work merges cleanly.

## Frontend polish backlog (kimi-k3 max)
- [ ] Tournament display: make events easier to scan (date/venue/level sections, cleaner hierarchy on event cards)
- [ ] Responsive audit: phone/tablet/desktop without clashing grids, cramped cards, or orphaned CTAs
- [ ] Alive feel: intentional micro-interaction (hover/focus states, smooth layout shifts) — max 2–3 per page, respect prefers-reduced-motion
- [ ] Visual hierarchy: consistent spacing/typography rhythm; kill anything that reads template-default
- [ ] Event page polish: hero/info/register actions feel composed, not stacked
- [ ] Loading/empty states that feel designed (not dead)

## Done
- [x] 2026-08-05 — Join links now survive login, signup, and email confirmation so new students return to the organization invitation
- [x] 2026-08-05 — Tournament creation now separates details from audience review, with an explicit publish step
- [x] 2026-08-05 — Org workspace clarity: hosted tournaments lead the coach view, invite management is one click away, and join codes live with the roster
- [x] 2026-08-05 — Role-aware account next actions; family prioritizes unanswered RSVPs and orgs surface pending invitations first
- [x] 2026-08-05 — Escalation lockdown + draft→publish tournaments (migration 0016, PublishTournamentPanel)
- [x] 2026-08-05 — Role-aware post-auth landing: login/signup/callback use `homePathForRole` (parent→/family, coach/student→/orgs); `?next=` still wins

## Open — P0/P1 UX (do these first)
- [ ] Tournament create flow: required image, preview, audience, then publish (guided steps) — details → audience/review → publish shipped 2026-08-05; image upload and persisted drafts remain
- [ ] Signup / join-org copy + flow: match real unlocks; remove contradictory coach language — join-link auth handoff shipped 2026-08-05; broader copy audit remains
- [ ] External registration tracking: Register → registration_opened → “Did you register?” → My tournaments
- [ ] My tournaments workspace: Registration needed / Registered / Invited / Upcoming / Past
- [ ] Search defaults: popularity + provenance; org’s own events boosted for members without burying public discovery
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
- Last tick: 2026-08-05 — preserved organization invitations through account creation
