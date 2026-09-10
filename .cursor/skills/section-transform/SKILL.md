---
name: section-transform
description: Transforms any Causey page section, hero, dashboard view, or component through a lock-brief-build-polish loop that bans AI-default UI and enforces existing tokens. Use when redesigning, restyling, rewriting, or "making this look like Causey"; when the user pastes a section-transform prompt; or when they ask for cinematic, taste-dials, anti-slop, layout QA, or a DESIGN.md lock.
---

# Causey section transform

Do not invent a new look. Causey already has a design system. These prompts exist to **trigger mechanics** (read first, set dials, ban defaults, audit in pixels) so the model cannot drift into Inter / purple / empty cards.

## Always read first

1. `CAUSEY-DESIGN-SYSTEM.txt`
2. `anti-vibecode-rules.txt`
3. `app/globals.css` (tokens, type scale, easings, component classes)
4. `.cursor/rules/causey-ui.mdc`
5. The section’s current source
6. Club or district work: matching skill + backlog (`.cursor/skills/club-owner-readiness/` or `district-program-readiness/`)

Never generate a competing `DESIGN.md`. `CAUSEY-DESIGN-SYSTEM.txt` + `app/globals.css` are the immutable lock.

## Surface dials

Pick one row. Do not average. Do not use Bloomberg-terminal density.

| Surface | Examples | DESIGN_VARIANCE | MOTION_INTENSITY | VISUAL_DENSITY |
| --- | --- | --- | --- | --- |
| Marketing / role landing | `/`, `/clubs`, `/districts`, waitlist, login/signup heroes | 4 | 3 | 5 |
| Directory / search | `/chess` and other type indexes, event page hero | 3 | 2 | 7 |
| Product chrome | roster, people, manage, family, reports, org overview | 2 | 1 | 7 |
| District office | `/orgs` district landing, `#schools`, aggregate reports | 2 | 1 | 7 |
| Club / team season | club overview, attendance → results, season board | 3 | 2 | 6 |

Dial meanings (1–10):

- **DESIGN_VARIANCE** — how far this band may break the page’s repeating recipe. Marketing must not be “eyebrow → H1 → 3 cards.” Product chrome stays scannable and familiar.
- **MOTION_INTENSITY** — 1 = hover/press + shared page reveal only. 2 = that plus one product cue (path node, card-lift). 3 = required signature moment (hero rise, path draw, or one coordinated interaction). Never scroll-hijack. Never bounce easings.
- **VISUAL_DENSITY** — filled panels, tight padding, strict grid. 5 = product object fills the viewport (search/roster/path), not air around a headline. 7 = data-forward, still readable on a school laptop. Never 8+ (terminal / broadsheet gimmick).

## Copy-paste: three ultimate prompts

Use in order. For a one-shot “transform this section,” run all three in one turn: brief in chat (6–12 lines), then code, then silent audit + fix.

Replace `[SECTION]` with the route, component, or band.

### 1. Lock and brief (no code yet)

```
Act as Causey Design Lead. We are transforming [SECTION].

LOCK: Read CAUSEY-DESIGN-SYSTEM.txt, anti-vibecode-rules.txt, app/globals.css, and .cursor/rules/causey-ui.mdc. Then read the current source for [SECTION]. If this is club or district chrome, also read the matching skill and backlog. Those files are immutable. Do not write DESIGN.md. Do not pick new fonts, palettes, or radius.

Do not write React, CSS, or Tailwind yet.

Write a SECTION BRIEF (6–12 lines) covering:
1. One job. If you cannot name one job, split the section.
2. Buyer + nouns. Club/Team vs School/District vs student/parent. Never mix.
3. Product object that fills this band (search, roster, path, listing, table, scoresheet, ledger). Not a headline with padding.
4. One irreplaceable signature composition that could only be Causey (coordinate grid on access heroes, filled search card, path rail, printed scoresheet, nested district office). Ban the template: uppercase eyebrow → bold H1 → gray subhead → 3 icon cards.
5. Dials from the section-transform table (variance / motion / density) and why that row.
6. Interaction budget: max 1 heavy interaction in this section; max 1 reveal pattern, shared with the page. prefers-reduced-motion shows the final state.
7. Reuse list: existing components and classes (.field, .cta-enabled, .section-rule, .card-lift, CompetitionCard, PageBackLink, CauseyLogo). New component only if none fit.
8. Honesty: real vs illustrative data. What we will not fabricate. Chess is the working surface; do not imply other types are complete.
9. Out of scope: pairings, dues, DMs, public club/school directory, fake Beta/Live pills, second palette.

Marketing / role-landing / new signature: STOP and wait for approval of this brief.
Product-chrome restyle of an existing pattern: print the brief, then continue to prompt 2 in the same turn.
```

### 2. Transform (dials + bans)

```
Implement the approved brief for [SECTION]. Act as Frontend Taste Engineer with dials locked:

DESIGN_VARIANCE = {brief}
MOTION_INTENSITY = {brief}
VISUAL_DENSITY = {brief}

HARD BANS
- Fonts: Inter, Roboto, Arial, system-as-brand. Only Source Sans 3 (UI, weight 500 default) and Source Serif 4 (font-display, weight 800).
- Color: purple/indigo, cream+terracotta, neon/glow/glass, dark-mode-as-default, one-off hex. Gold = organization-hosted provenance only. Yellow = in-pilot chip or one hero marker, never a fill.
- Chrome: nested cards, empty bubbles, rounded-full status pills, uppercase eyebrow on every band, equal-weight red+blue CTAs, leftover max-w-prose lane, ceremonial py-16/20 on a short band.
- Copy: "Learn more", "Get started", "AI-powered", standalone Beta/Live/Coming soon, fabricated counts/fees/testimonials, em-dash spam, school nouns on club surfaces and the reverse.
- Motion: spring/bounce, scroll hijack, a different entrance per block, ambient motion on text/nav/buttons/fields.

REQUIREMENTS
- Tokens, type scale, radius (xl controls, 2xl cards, 3xl hero shells), shadows, and easings from app/globals.css only. No text-[13px], no arbitrary hex.
- Filled panels. <4 content rows → list row or left-rule strip, not a bordered bubble. Two columns need comparable mass or they stack.
- One dominant next action, labeled as the next verb ("Search tournaments", "Invite the roster", "Book a meeting").
- Reuse existing patterns. Surgical to this section unless the brief is a redesign.
- Early-build honesty. Site-wide status stays in the footer. No EarlyBuildBanner, no decorative pills above H1.
- Dual-buyer temperature: one token system. District = dense, calm, School/District copy. Club/student = same tokens, tighter packing, athletic cues, Club/Team copy.
- Branch: work on the current checkout (dev). Never touch main.

Ship the section. If UI changed, verify the flow (not just a screenshot): empty, error, and the real next click, at ~360px and ~1024px.
```

### 3. Deterministic polish (audit, then patch)

```
Act as a deterministic layout critic on [SECTION] only. Silent audit against the code you just touched, then patch. Do not restyle unrelated pages.

FAIL any of these. Cite file:line, exact class, px, rem, or hex:
1. Gray/muted text on a brand-red, brand-blue, org-gold, or brand-yellow fill without a documented contrast pair.
2. Pure #000000 as text or #808080 as a "neutral." Canvas is #f5f9fc. Primary text is #14181c. White is for --surface and for text on brand-red CTAs only.
3. Bounce/spring easings or unspecified defaults. Must be cubic-bezier(0.22, 1, 0.36, 1) or cubic-bezier(0.4, 0, 0.2, 1). Linear only on .access-grid::before drift.
4. Spacing off the shared scale (gap/p/m: 1, 1.5, 2, 2.5, 3, 5, 6, 8, 10). Marketing band padding-block above 3rem unless the viewport is filled with a product object.
5. Empty bubble, lopsided two-column, or max-w-prose inside max-w-6xl with a vacant lane.
6. Nested cards, rounded-full pills, Inter/Roboto, purple, one-off hex, text-[Npx].
7. Two primary CTAs, or a CTA labeled Learn more / Get started / Submit with no object.
8. Fabricated listings, fees, pathways, counts, or unlabeled seed data.
9. Club/Team copy on a district surface, or School/District copy on a club surface.
10. Marketing/role landing with no signature motion — or product chrome inventing a second animation language.
11. prefers-reduced-motion not honored.
12. Dead control, missing loading/error/empty, or a next action that does not match the button label.

Print FAIL list first (or NONE). Then the exact patch. Re-audit until zero fails. Update .cursor/district-ux-progress.md only if this was a club/district workflow tick.
```

## Which prompt to run

| Situation | Run |
| --- | --- |
| Any section, default | All three ultimates |
| Home / clubs / districts / a new hero | Ultimate 1, wait, then 2 + 3 |
| Roster, reports, family, search results | Brief (no wait) + 2 + 3 |
| "It looks like ChatGPT UI" | Ultimate 2 bans + 3 |
| After a sloppy first draft | Ultimate 3 only |
| Agent drifted on screen 4 | Re-state the lock paragraph from prompt 1, then 2 |

Adjusted one-off variants (cinematic, dial-tuner, ban-list, QA, lock) live in [adjusted-prompts.md](adjusted-prompts.md). Prefer the three ultimates; use those five only when you need a single mechanic.

## Ship rules

- One section per pass. Do not "while you're here" the rest of the page.
- Do not invent scrape paths, listings, partner district names, or complete non-chess indexes.
- CTAs name the next action. External links: new-tab mark + aria-label.
- Reuse `.field`, `.cta-enabled`, `.cta-disabled`, `.section-rule`, `.card-lift`, `.nudge-x`.
