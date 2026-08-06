# District UX improvement progress

Living backlog for the continuous UX loop. Mark items done with date + short note.
Pick the highest-impact **open** item each tick. Prefer workflow clarity over chrome.

## Collaboration note (two agents run in parallel)
- **UX agent** (gpt-5.6-sol xhigh): workflow/IA/role tasks from this file.
- **Frontend polish agent** (kimi-k3 max): visual feel, responsiveness, tournament display.
- Own different files when possible. If you both need the same file, prefer the smallest change or skip and take another item.
- Before committing, `git pull origin dev` and run tests so parallel work merges cleanly.

## Frontend polish backlog (kimi-k3 max)
- [x] Tournament display: make events easier to scan (date/venue/level sections, cleaner hierarchy on event cards) — 2026-08-05
- [x] Responsive audit: phone/tablet/desktop without clashing grids, cramped cards, or orphaned CTAs — 2026-08-05 (/chess filter rail no longer buries results on phone/tablet: collapses into a disclosure below lg; other pages already stack single-column)
- [x] Alive feel: intentional micro-interaction (hover/focus states, smooth layout shifts) — max 2–3 per page, respect prefers-reduced-motion — 2026-08-05 (`.nudge-x` ported from the design-system checklist; arrow/external marks nudge on hover AND keyboard focus; card-lift now answers focus-visible too; all covered by the reduced-motion kill switch)
- [ ] Visual hierarchy: consistent spacing/typography rhythm; kill anything that reads template-default
- [x] Event page polish: hero/info/register actions feel composed, not stacked — 2026-08-05 (hero half: no-image events go text-first; register-flow composition covered by UX P1 "External registration tracking")
- [x] Loading/empty states that feel designed (not dead) — 2026-08-05 (route skeletons for /orgs + /family account surfaces; search already had skeletons)

## Done
- [x] 2026-08-05 — Link affordances feel alive and keyboard-equal: shared `.nudge-x` utility (design-system §10/§16, brand easing) drives every → / ↗ mark on home, footer, and sources; card-lift and the nudge now also trigger on focus-visible; the two hand-rolled `group-hover:translate-x-1` arrows that ignored prefers-reduced-motion are replaced by the guarded utility
- [x] 2026-08-05 — Search now defaults to honest popularity from distinct saves and registration starts (migration 0016), keeps nearer distance bands ahead of farther events, and offers an explicit soonest-first option
- [x] 2026-08-05 — Search filters no longer wall off results on phones/tablets: below lg the rail collapses behind a "Narrow it down · N applied" disclosure (aria-expanded, motion-safe chevron, Clear filters still reachable); desktop 220px sidebar unchanged
- [x] 2026-08-05 — Search provenance is explicit on every tournament card and event page, with plain-language source filtering for scraped, organizer-provided, and Causey-entered listings
- [x] 2026-08-05 — My tournaments now puts unanswered coach invitations first and lets students RSVP without leaving the workspace
- [x] 2026-08-05 — Account surfaces no longer hang on the old screen while data loads: `app/orgs/loading.tsx` + `app/family/loading.tsx` mirror each page's header/panel/row structure with the shared `.skeleton` pulse (reduced-motion safe, `role="status"` labels)
- [x] 2026-08-05 — External registration handoff: signed-in users get a “Did you register?” confirmation after leaving for the organizer site, with Registration needed / Registered lists in My tournaments
- [x] 2026-08-05 — Event pages without a cover image go text-first: dead grey 2:1 placeholder removed, featured mark moves inline with the eyebrow (same pattern as cards)
- [x] 2026-08-05 — Tournament cards scan by weekend: date chip + weekday date line, venue/city/distance line, section levels (U900 · K-8 …), fee pinned top-right, no empty image chrome
- [x] 2026-08-05 — Join links now survive login, signup, and email confirmation so new students return to the organization invitation
- [x] 2026-08-05 — Tournament creation now separates details from audience review, with an explicit publish step
- [x] 2026-08-05 — Org workspace clarity: hosted tournaments lead the coach view, invite management is one click away, and join codes live with the roster
- [x] 2026-08-05 — Role-aware account next actions; family prioritizes unanswered RSVPs and orgs surface pending invitations first
- [x] 2026-08-05 — Escalation lockdown + draft→publish tournaments (migration 0016, PublishTournamentPanel)
- [x] 2026-08-05 — Role-aware post-auth landing: login/signup/callback use `homePathForRole` (parent→/family, coach/student→/orgs); `?next=` still wins

## Open — P0/P1 UX (do these first)
- [ ] Tournament create flow: required image, preview, audience, then publish (guided steps) — details → audience/review → publish shipped 2026-08-05; image upload and persisted drafts remain
- [ ] Signup / join-org copy + flow: match real unlocks; remove contradictory coach language — join-link auth handoff shipped 2026-08-05; broader copy audit remains
- [x] External registration tracking: Register → registration_opened → “Did you register?” → My tournaments — shipped 2026-08-05
- [ ] My tournaments workspace: Registration needed / Registered / Invited shipped 2026-08-05; Upcoming / Past remain
- [ ] Search defaults: provenance + popularity shipped 2026-08-05; org-member boosting without burying public discovery remains
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
- Last UX tick: 2026-08-05 — defaulted search to de-duplicated save/registration interest within nearby distance bands, with a transparent soonest-first alternative
- Last frontend-polish tick: 2026-08-05 — ported `.nudge-x` so arrow/external marks nudge on hover + keyboard focus, with card-lift focus parity and full reduced-motion guards
