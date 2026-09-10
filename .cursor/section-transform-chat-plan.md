# Section-transform chat plan

One new Cursor chat per ticket. Do not batch pages. Work on `dev` only. Never touch `main`.

This is a **composition / first-session clarity** pass using the section-transform prompts. It is not a feature backlog. Do not add pairings, dues, DMs, billing, scrapers, or a second palette. Chess is the working surface; other directories stay honest and incomplete.

Skill: `.cursor/skills/section-transform/SKILL.md`  
Design lock: `CAUSEY-DESIGN-SYSTEM.txt` + `anti-vibecode-rules.txt` + `app/globals.css`

---

## How to run one ticket

1. Open a **new chat**. Do not continue an old one (context drift is the failure mode).
2. Pick the model in the picker **before** the first message (table on each ticket). Turn **Auto off**.
3. Set mode: **Plan** or **Agent** as the ticket says.
4. Paste the **Chat opener** from that ticket. Do not add “also fix home while you’re here.”
5. If the ticket says wait: approve the brief in chat, then send Prompt 2 (same chat, switch to Agent if you were in Plan).
6. After code: send Prompt 3 in the **same** chat, same model.
7. Verify in the browser: the real next click, empty, error, ~360px and ~1024px.
8. Stop. Update `.cursor/district-ux-progress.md` only if it was a club/district workflow tick. Commit only if you ask for a commit.

If the brief invents a new font, Dune lighting, brutalism, Bloomberg density 8, or a new `DESIGN.md`, reject it and re-run Prompt 1.

---

## Prompts (paste these)

Replace `[SECTION]` with the ticket’s section line.

### Prompt 1 — Lock and brief (no code)

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

### Prompt 2 — Transform (dials + bans)

```
Implement the approved brief for [SECTION]. Act as Frontend Taste Engineer with dials locked:

DESIGN_VARIANCE = {from brief}
MOTION_INTENSITY = {from brief}
VISUAL_DENSITY = {from brief}

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
- Branch: current checkout is dev. Never touch main.

Ship the section. If UI changed, verify the flow (not just a screenshot): empty, error, and the real next click, at ~360px and ~1024px.
```

### Prompt 3 — Deterministic polish

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

Print FAIL list first (or NONE). Then the exact patch. Re-audit until zero fails.
```

### Optional single-mechanic prompts

Use only if a ticket says so. Full text: `.cursor/skills/section-transform/adjusted-prompts.md`

| Name | When |
| --- | --- |
| Access scene (#1 cinematic) | New hero / signature only. Causey grid/search/path — not Dune. |
| Dial tuner (#2) | Density fights (search, reports, manage). Never density 8. |
| Anti-slop ban (#3) | Model keeps reaching for Inter/purple/cards. |
| QA audit (#4) | Same as Prompt 3; use if Prompt 3 was skipped. |
| State lock (#5) | New chat forgot the design system. Re-lock; do not write `DESIGN.md`. |

---

## Models and modes (lock this)

Turn **Auto off**. Same model for Prompt 1 and Prompt 2. Switching to a fast model for the build is how the brief dies.

| Cursor picker name | Internal slug | Use for |
| --- | --- | --- |
| **Claude Opus 5 Max** | `claude-opus-5-thinking-max` | Default for Prompt 1 + 2 on anything with a signature layout or dual-buyer nouns. Strongest at “read the files, do not freelance.” |
| **Kimi K3 Max** | `kimi-k3-max` | Alternate for Prompt 2 on visual hierarchy / filled-panel composition. This repo already preferred it for major UI backlog. Use if Opus is busy or you want a second composition take — not a third palette. |
| **Grok 4.6** | `cursor-grok-4.6-xhigh` | Prompt 2 on product chrome (roster, family, reports) when the pattern already exists. Prompt 3 critic in a follow-up chat. |
| **GPT-5.6** | `gpt-5.6-sol-high` | Optional second Prompt 3 only: “audit, do not redesign.” |
| **Claude Fable 5.1 thinking high** | `claude-fable-5-1-thinking-high` | Cheaper Claude for Prompt 3 on a small band after Opus already designed it. Do not let it invent a hero. |
| **Composer 2.5 Fast** | `composer-2.5-fast` | Do not use for these tickets. Ignores ban lists. Exception: you already have a fail list with file:line and you only want mechanical patches — still prefer Grok 4.6. |

| Mode | When |
| --- | --- |
| **Plan** | Prompt 1 on marketing / role landings / new signature. Stops code. |
| **Agent** | Prompt 2 + 3. Also Prompt 1+2+3 in one Agent turn for product chrome (brief printed, no wait). |
| **Ask** | Prompt 3 on a page this chat did not write. Read-only fail list; then a new Agent chat to patch. |

Dials reminder:

| Surface | Variance / motion / density |
| --- | --- |
| Marketing / role landing | 4 / 3 / 5 |
| Directory / search | 3 / 2 / 7 |
| Product chrome | 2 / 1 / 7 |
| District office | 2 / 1 / 7 |
| Club / team season | 3 / 2 / 6 |

---

## Do not spend a transform chat on

`/admin/*`, `/privacy`, `/terms`, `/support` form internals, `/billing`, `/portals`, `ingestion/`, SQL migrations, Expo/phone (different shell), Debate/STEM/Arts/Writing directories as if they were as complete as chess.

Those pages can get Prompt 3 later if they visually disagree with the rest of the site. They are not buyer-conversion work.

`/clubs` and `/districts` had a composition pass on 2026-09-10. Tickets 04–05 are **polish only**, not a new cinematic identity.

---

## Ticket order (business sequence)

Do them in this order unless a live buyer is blocked on a later screen.

| # | Workflow | Page | Prompts | Prompt 1 model / mode | Prompt 2 model / mode | Prompt 3 |
| --- | --- | --- | --- | --- | --- | --- |
| 01 | Discovery | `/` hero + Find card | 1 wait → 2 → 3 | Opus 5 Max · Plan | Opus 5 Max · Agent | same chat |
| 02 | Discovery | `/chess` search system | 1 wait → 2 → 3 | Opus 5 Max · Plan | Opus 5 Max or Kimi K3 Max · Agent | same chat |
| 03 | Discovery | `/event/[slug]` next action | 1 wait → 2 → 3 | Opus 5 Max · Plan | Opus 5 Max · Agent | same chat |
| 04 | Public pitch | `/clubs` | 3 only (2 if polish finds empty lanes) | — | Grok 4.6 · Agent only if 3 fails | Grok 4.6 · Ask then Agent |
| 05 | Public pitch | `/districts` | 3 only | — | — | Grok 4.6 · Ask then Agent |
| 06 | Auth | `/login` + `/signup` (coach + parent) | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 07 | Club setup | `/orgs/new` | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 08 | Club setup | `/orgs` list | Brief no-wait → 2 → 3 | Grok 4.6 · Agent | same | same |
| 09 | Club season | `/orgs/[slug]` **club/team only** | 1 wait → 2 → 3 | Opus 5 Max · Plan | Opus 5 Max · Agent | same |
| 10 | Club season | `/orgs/[slug]/roster` | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 11 | Club season | `/event/[slug]/manage` | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 12 | Club season | `/orgs/[slug]/reports` **club/team** | Brief no-wait → 2 → 3 | Grok 4.6 · Agent | same | same |
| 13 | District office | `/orgs/[slug]` **district only** | 1 wait → 2 → 3 | Opus 5 Max · Plan | Opus 5 Max · Agent | same |
| 14 | District office | settings `#schools` + `/people` | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 15 | District office | `/orgs/[slug]/reports` **district** | Brief no-wait → 2 → 3 | Grok 4.6 · Agent | same | same |
| 16 | Family | `/family` | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 17 | Student | `/me` Plan | Brief no-wait → 2 → 3 | Grok 4.6 · Agent | same | same |
| 18 | Hosting | `/orgs/[slug]/competitions/new` | 1 wait → 2 → 3 | Opus 5 Max · Plan | Opus 5 Max · Agent | same |
| 19 | Handoff | `/claim/[token]` | Brief no-wait → 2 → 3 | Opus 5 Max · Agent | same | same |
| 20 | Optional critic | any shipped ticket | 3 only | — | — | GPT-5.6 · Ask |

Tickets 01–03 are the revenue-shaped discovery funnel. 06–12 are club conversion. 13–15 and 19 are district-pilot conversion. 16–17 are parent/student retention. 18 is host quality. 04–05 are cheap insurance on pitches you already rebuilt.

---

## TICKET 01 — Home hero + Find card

**Workflow:** Unsigned visitor decides whether Causey is a real directory.  
**Section:** `app/page.tsx` hero (`home-hero` / `access-grid`) + `components/HomeHeroCard.tsx` (Find / My tournaments). Do not restyle the organizer slider in this chat (`HomeDistrictPitch`).  
**Dials:** 4 / 3 / 5  
**Nouns:** student / parent first; club and district are chips, not the hero thesis.

### What needs to be done

The first viewport must stay **full of the search object**, not padding around the headline. Check: logo + H1 + honesty line + Find card fill the `dvh`; zip/type are the job; club/district chips are secondary; My tournaments empty/sign-in is truthful; no vacant column on desktop; one signature motion (hero rise + grid), not a second language.

Do not change coverage/path copy into hype. Do not add a Beta pill. Do not invent listing counts.

### Why / effect / business value

This is the only page most people see. If it looks like a generic SaaS hero, coaches bounce before chess search. A filled Find card is the product demo. Business: **top-of-funnel conversion to `/chess` (and other types, honestly incomplete)**. Secondary: club/district chips for the two institutional buyers without stealing the search job.

### Prompts and models

1. Plan · **Claude Opus 5 Max** · Prompt 1 · wait  
2. Agent · **Claude Opus 5 Max** (same chat) · Prompt 2  
3. Same Agent chat · Prompt 3  
4. Optional new Ask chat · **GPT-5.6** · Prompt 3 only if you distrust the self-audit  

Alternate Prompt 2 if you want a second composition take: **Kimi K3 Max**. Do not mix Opus brief + Kimi build in the same ticket unless you paste the approved brief in full.

### Chat opener (Plan, Opus 5 Max)

```
Load .cursor/skills/section-transform/SKILL.md.

[SECTION] = homepage first viewport: app/page.tsx home-hero + components/HomeHeroCard.tsx. Exclude HomeDistrictPitch / organizer slider.

Dials: DESIGN_VARIANCE=4, MOTION_INTENSITY=3, VISUAL_DENSITY=5.

Run Prompt 1 only (lock and brief). Do not write code. Wait for approval.
Also read CAUSEY-DESIGN-SYSTEM.txt, anti-vibecode-rules.txt, app/globals.css.
Branch: stay on dev. Never touch main.
```

After you approve the brief, send Prompt 2 with the dials filled in, then Prompt 3.

### Done when

Desktop and ~360px: search card is the object; no leftover lane; Find and My tournaments both work; empty My tournaments names sign-in or the next verb; reduced-motion kills grid drift / rise.

---

## TICKET 02 — Chess search (the working product)

**Workflow:** Parent/coach actually looks for a tournament.  
**Section:** `app/chess/page.tsx` + `components/SearchClient.tsx` + `SearchFilters` + results (`CompetitionCard`, layout toggle). Include the chess hero graphic and nationals pin as **existing** motifs to keep honest — do not invent a new promo.  
**Dials:** 3 / 2 / 7  
**Nouns:** tournament / listing. Club vs school “going” chip must follow membership (`clubGoingLabel`), not a hardcoded “club.”

### What needs to be done

Treat search + filters + results as **one dense system**, not a marketing page above a card grid. Check: first viewport is the search form; filters are a rail not a blob of pills; results scan like listings (date, place, fee honesty, org-gold only when org-hosted); advanced filters stay advanced; empty/error say what to do; layout toggle desktop-only; no empty hero column beside the graphic; sources band stays a credit, not a partner-logo flex.

Do not add new scrape sources. Do not fake completeness for debate/STEM.

### Why / effect / business value

Chess search is the only directory dense enough to sell the company. If it feels sparse or “AI dashboard,” the product looks unfinished even when data is there. Business: **activation** (search → event click). This is also what club owners use to mark “club is going,” so it feeds the whole season workflow.

### Prompts and models

1. Plan · **Claude Opus 5 Max** · Prompt 1 · wait  
2. Agent · **Claude Opus 5 Max** or **Kimi K3 Max** · Prompt 2 (Kimi is strong on this density job)  
3. Same model · Prompt 3  

If you use Kimi for Prompt 2, paste the approved brief at the top of that Agent message so it cannot wander.

### Chat opener (Plan, Opus 5 Max)

```
Load .cursor/skills/section-transform/SKILL.md.

[SECTION] = /chess search system: app/chess/page.tsx, components/SearchClient.tsx, SearchFilters, results cards. Keep ChessHeroGraphic + nationals pin; do not invent new promos or sources.

Dials: DESIGN_VARIANCE=3, MOTION_INTENSITY=2, VISUAL_DENSITY=7.

Buyer: parent or coach finding a US scholastic chess tournament. Coverage is incomplete — copy must stay honest.

Run Prompt 1 only. No code. Wait for approval.
Stay on dev. Never touch main.
```

### Done when

A zip search on desktop and phone is scannable in one glance; filters do not fight the results; empty chess results are honest; “My club/school is going” label matches the account; no nested filter cards.

---

## TICKET 03 — Event page next action

**Workflow:** Listing → decide Going / RSVP / organizer registration.  
**Section:** `app/event/[slug]/page.tsx` and the next-step / Going / Bring-your-roster cards on that page. Do **not** restyle manage in this chat.  
**Dials:** 3 / 2 / 7 (directory/event hero row)  
**Nouns:** follow org membership (club vs school going). Parent vs coach vs unsigned get different next actions — one dominant per **state**, not three equal buttons.

### What needs to be done

The page already had a text-first hero pass. This ticket is: **one job visible**, filled next-step card, no leftover “sign in / save / rate” soup, cover only when it is a real photo, facts as a hairline strip, RSVP vs organizer-entry distinction stated once. Bring your roster stays coach-only and must not look like a parent control.

Do not wire new APIs. Do not put scraped URLs in hrefs except through `safeExternalUrl`.

### Why / effect / business value

This is where search turns into a saved plan. Confused CTAs = parents mark the wrong thing or bounce to the organizer site and never come back. Business: **retention into Family/Plan** and **club travel marking** (Bring roster). Wrong chrome here also creates support load (“I thought I registered”).

### Prompts and models

1. Plan · **Claude Opus 5 Max** · Prompt 1 · wait  
2. Agent · **Claude Opus 5 Max** · Prompt 2  
3. Same · Prompt 3  

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.

[SECTION] = public event page next-action + hero facts: app/event/[slug]/page.tsx and its event-page cards (Going, organizer registration, Bring your roster, sign-in). Exclude manage.

Dials: 3 / 2 / 7.

One dominant next action per viewer state (unsigned, parent, student, coach). Do not add features. Keep RSVP vs organizer-site entry honest. External links through the existing URL guard.

Run Prompt 1 only. No code. Wait.
Stay on dev. Never touch main.
```

### Done when

Unsigned / parent / coach each have one obvious next click; empty and error states exist; no equal-weight red+blue pair; Bring roster is not shown to parents.

---

## TICKET 04 — `/clubs` polish only

**Workflow:** Club-owner public pitch.  
**Section:** `app/clubs/page.tsx` + `components/ClubWorkspaceShowcase.tsx`  
**Already shipped:** quiet-ledger hero, two-seats table, scope lists (2026-09-10).  
**Dials if you must rebuild a failing band:** 4 / 3 / 5

### What needs to be done

Ask-mode Prompt 3. Patch empty lanes, CTA weight, noun mixups, leftover padding. Do **not** run Access scene / Dune / new signature unless Prompt 3 finds a structural fail you agree is real.

### Why / effect / business value

This page converts independent coaches into `/signup?role=coach` → `/orgs/new`. A messy pitch after the district page looks cheaper. Business: **club-owner acquisition**. Low effort because the rebuild is fresh — this is insurance.

### Prompts and models

1. Ask · **Grok 4.6** · Prompt 3 (fail list only)  
2. If fails: Agent · **Grok 4.6** · patch those fails only. If a whole band is empty: Prompt 2 with dials 4/3/5, still Grok unless you reopen a signature (then Opus 5 Max + Plan).

### Chat opener (Ask)

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = /clubs public pitch (app/clubs/page.tsx + ClubWorkspaceShowcase).
This page was rebuilt 2026-09-10. Do not redesign.
Run Prompt 3 as a read-only audit. FAIL list with file:line. Do not edit files.
```

---

## TICKET 05 — `/districts` polish only

Same as 04 for `app/districts/page.tsx` + `components/DistrictOfficeShowcase.tsx`.  
**Nouns:** School/District. CTA is **Book a meeting**, not self-serve signup.  
**Business:** district-pilot **sales** (meeting), not activation. Honesty about unfinished items is a feature.

### Chat opener (Ask, Grok 4.6)

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = /districts public pitch (app/districts/page.tsx + DistrictOfficeShowcase).
Rebuilt recently. Do not add self-serve district signup. Do not invent partner names.
Run Prompt 3 read-only. FAIL list with file:line. No edits.
```

---

## TICKET 06 — Login + signup (coach and parent)

**Workflow:** First account. Two roles, one ticket only if you keep it to **shared form chrome** — if the chat tries to rewrite copy for every invitation type, split: 06a login, 06b signup. Prefer **06a then 06b as two chats** if the first brief is longer than 12 lines.  
**Section:** `app/login/page.tsx`, `app/signup/page.tsx`, `LoginForm`, `SignupForm`.  
**Dials:** 4 / 3 / 5 (role landing) but **product-form density** inside the card (treat inner form as 2 / 1 / 7).  
**Nouns:** coach creates a club after signup; school/district admins arrive via claim, not this form as a district signup.

### What needs to be done

Filled form shell, one primary **Sign in** / **Create account**, Forgot password under the field, New here as secondary, Report a problem quieter. Invitation `next=` paths must still feel like joining that org, not a generic waitlist. No equal-weight CTAs. Duplicate-email honesty already exists — do not restyle it into a fake “check your inbox.”

### Why / effect / business value

Drop-off here kills every workflow below. School computers + parents on phones. Business: **activation of all roles**. Claim/join `next` is how districts staff schools without shared passwords.

### Prompts and models

Agent · **Claude Opus 5 Max** · Prompt 1 (print brief, no wait unless it wants a new motif) → Prompt 2 → Prompt 3.  
If it proposes a new illustration or grid hero, stop and approve in Plan instead.

### Chat opener (Agent, Opus 5 Max) — start with login only if you want a hard split; otherwise:

```
Load .cursor/skills/section-transform/SKILL.md.

[SECTION] = /login first. Files: app/login/page.tsx + LoginForm. Do not edit signup in this chat.

Dials: outer landing 4/3/5, inner fields 2/1/7.
One job: sign in and return to `next`. Keep Forgot password / Create an account / Report a problem hierarchy as designed (help under field, create after submit, report quieter).

Print a 6–12 line brief, then implement Prompt 2, then Prompt 3.
Stay on dev. Never touch main. No new DESIGN.md.
```

Next chat: same opener with `/signup` + `SignupForm`. Coach vs parent vs student role; parent→student handoff gate stays.

---

## TICKET 07 — Create a club (`/orgs/new`)

**Workflow:** Club owner, step 1 after coach signup.  
**Section:** `app/orgs/new/page.tsx` + `OrgCreateForm`  
**Dials:** 2 / 1 / 7 (form) on a quiet role-landing frame  
**Nouns:** Club/Team only. School must stay hidden.

### What needs to be done

The page is already a short stack. Job: **name the club and create it**. Fill the form shell; no vacant max-w-3xl air; success goes to the new org; copy must not say organization/school/district as the thing you are creating.

### Why / effect / business value

If this screen feels like “create an Organization in our ERP,” coaches bounce. Business: **time-to-first-club**. Every later roster/season metric depends on this click.

### Prompts and models

Agent · **Claude Opus 5 Max** · brief + 2 + 3 (no Plan wait unless it invents a motif).

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = /orgs/new (app/orgs/new/page.tsx + OrgCreateForm).
Club/Team only. Do not offer School or District. Do not add billing.
Dials: 2/1/7. Brief, then Prompt 2, then Prompt 3.
Stay on dev.
```

---

## TICKET 08 — `/orgs` list (clubs, schools, districts)

**Workflow:** Signed-in “where do I work today?”  
**Section:** `app/orgs/page.tsx`  
**Dials:** 2 / 1 / 7  
**Nouns:** split district / school / club-team. Empty coach state says clubs, not “organizations.” District rows must not pretend they have a roster.

### What needs to be done

One scan: which workspace, what kind, next verb (Open club / Schools / …). Invites and join code on this page should not compete with the list. No nested cards for each org if a list row will do.

### Why / effect / business value

District admins and coaches who belong to several orgs get lost and create duplicates. Business: **reduce support + wrong-workspace data entry.**

### Prompts and models

Agent · **Grok 4.6** · brief + 2 + 3. Escalate to Opus 5 Max if nouns/IA get invented.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = /orgs list (app/orgs/page.tsx).
Keep type sections (district / school / club-team). Empty states role-honest.
Dials: 2/1/7. Brief, Prompt 2, Prompt 3. No new features. Stay on dev.
```

---

## TICKET 09 — Club / team overview

**Workflow:** Club season home (roster → travel/host → attendance → results).  
**Section:** `app/orgs/[slug]/page.tsx` **when org type is club or team only**. District layout is ticket 13.  
**Dials:** 3 / 2 / 6  
**Skill:** `.cursor/skills/club-owner-readiness/SKILL.md` + `.cursor/club-readiness.md`

### What needs to be done

One mission, one next action (invite roster / find tournaments / record results — **stage-aware**, already a product rule). Season board / scoresheet energy, not panel soup. Do not show district-only audience help. Do not send a travel club to “create your first competition” as the only path.

### Why / effect / business value

This is the coach’s Monday screen. If it is dashboard soup, they keep Google Sheets. Business: **club retention and willingness to pay later** (local `/billing` is not this ticket). Also the demo surface for `/clubs` pitch.

### Prompts and models

1. Plan · **Claude Opus 5 Max** · Prompt 1 · wait (club vs district chrome is easy to mix)  
2. Agent · **Claude Opus 5 Max** · Prompt 2 + 3  

### Chat opener (Plan)

```
Load .cursor/skills/section-transform/SKILL.md and .cursor/skills/club-owner-readiness/SKILL.md.

[SECTION] = club/team overview only, app/orgs/[slug]/page.tsx. Ignore the district command-center branch. Do not change school/district copy paths.

Dials: 3/2/6. Club/Team nouns. Stage-aware one next action.
Run Prompt 1 only. Wait.
Stay on dev. Never touch main.
```

---

## TICKET 10 — Roster and groups

**Workflow:** Club/school: invite students → groups → ready for events.  
**Section:** `app/orgs/[slug]/roster/page.tsx` + `GroupManager` + `JoinCodePanel`  
**Dials:** 2 / 1 / 7  
**Nouns:** Club vs School from org type. Assistants must not be told to copy a join link they cannot see.

### What needs to be done

Dense table/list, not a card per student. Invite → group → competitions as the story. Progressive group edit (one group at a time) stays. Empty roster: one CTA (invite / CSV / join link) that matches permissions.

### Why / effect / business value

No roster = no RSVP, no attendance, no results, no family desk. Business: **core activation of the coordination product.** Fast CSV/join is what a 40-kid chess club compares to GroupMe.

### Prompts and models

Agent · **Claude Opus 5 Max** · brief + 2 + 3.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = roster + groups, app/orgs/[slug]/roster/page.tsx + GroupManager + JoinCodePanel.
Dials: 2/1/7. Filled list, not student cards. Permission-honest empty states.
Brief, Prompt 2, Prompt 3. Do not add DMs, dues, or a public directory.
Stay on dev.
```

---

## TICKET 11 — Manage event (attendance → results)

**Workflow:** Day-of and after: invite, RSVP, organizer registration, attendance, place/award.  
**Section:** `app/event/[slug]/manage/page.tsx` + `EntrantManager` + `EventPulseStrip`  
**Dials:** 2 / 1 / 7 (club season 3/2/6 if it starts looking dead)  
**Nouns:** district-hosted rows labeled by **school**; club rows are club/team.

### What needs to be done

Pulse + People list as one workspace. Replies grouped (awaiting / going / can’t go). Record results after attendance is obvious. Staff team-entry controls readable. No nested card per student. One primary invite action; individual invites stay behind disclosure when groups exist.

### Why / effect / business value

This is the job coaches currently do in spreadsheets the night before. If manage is ugly or sparse, they abandon Causey after one event. Business: **habit formation** and the proof for district pilots (“we can see who still owes RSVP”). Highest workflow value in the whole list after chess search.

### Prompts and models

Agent · **Claude Opus 5 Max** · brief + 2 + 3.  
Kimi K3 Max allowed for Prompt 2 if the brief is locked and you want denser composition.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md and the club-owner skill.

[SECTION] = manage event workspace, app/event/[slug]/manage/page.tsx + EventPulseStrip + EntrantManager.
Dials: 2/1/7. One job: run this event’s people. Do not add pairings or live standings.
Brief, Prompt 2, Prompt 3.
Stay on dev. Never touch main.
```

---

## TICKET 12 — Club / team reports (season)

**Workflow:** End of season: CSV, places, who showed up.  
**Section:** `app/orgs/[slug]/reports/page.tsx` **club/team branch only**  
**Dials:** 2 / 1 / 7  
**Honesty:** blanks mean not recorded. No fake trophies.

### What needs to be done

Data-forward table, season board as filled artifact not empty stat bubbles. CSV control is a real next action. Do not show district hosted/school split on a club.

### Why / effect / business value

This is what a paid club owner shows a parent or a board. Business: **justification to keep using Causey** (and later SaaS). Also feeds the `/clubs` “season file” story.

### Prompts and models

Agent · **Grok 4.6** · brief + 2 + 3. Opus if copy starts inventing metrics.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = club/team reports only, app/orgs/[slug]/reports/page.tsx.
Dials: 2/1/7. No fabricated counts. No district columns on a club.
Brief, Prompt 2, Prompt 3. Stay on dev.
```

---

## TICKET 13 — District command center

**Workflow:** District office first session: one next action, school readiness, calendar of school + district events.  
**Section:** `app/orgs/[slug]/page.tsx` **district branch only**  
**Dials:** 2 / 1 / 7  
**Skill:** `.cursor/skills/district-program-readiness/SKILL.md` + `.cursor/district-readiness.md`  
**Nouns:** School/District. Never Club.

### What needs to be done

Calm office, dense, not a marketing landing. Stage-aware secondary (no empty Reports mid-setup). Upcoming competitions with host names. Do not invent partner districts. Fail-closed readiness (retry, not fake empty).

### Why / effect / business value

This is the screen you walk in a sales meeting. If it looks like club software or a blank dashboard, the pilot dies. Business: **district deal conversion and expansion to more schools.** Highest B2B value in the list.

### Prompts and models

1. Plan · **Claude Opus 5 Max** · Prompt 1 · wait  
2. Agent · **Claude Opus 5 Max** · Prompt 2 + 3  

### Chat opener (Plan)

```
Load .cursor/skills/section-transform/SKILL.md and .cursor/skills/district-program-readiness/SKILL.md.

[SECTION] = district command center branch of app/orgs/[slug]/page.tsx only. Do not restyle club/team overview.

Dials: 2/1/7. School/District nouns. One next action. Fail closed. No partner names. No self-serve signup copy.

Run Prompt 1 only. Wait.
Stay on dev. Never touch main.
```

---

## TICKET 14 — District Schools + People

**Workflow:** Provision schools → invite named admins → claim.  
**Section:** `app/orgs/[slug]/settings/page.tsx` `#schools` + `app/orgs/[slug]/people/page.tsx`  
**Split if huge:** 14a Schools, 14b People (recommended: **two chats**).  
**Dials:** 2 / 1 / 7

### What needs to be done

14a: same readiness next actions as the command center, not verification-only labels.  
14b: pending vs revoked distinct; CSV/invite; no School administrator on club (out of scope here). Dense tables.

### Why / effect / business value

Districts fail in staffing, not in “having a dashboard.” Business: **time-to-first-school-live** and FERPA-shaped hygiene (named admins, no shared passwords) as a **sales story** — without claiming FERPA certification.

### Prompts and models

Agent · **Claude Opus 5 Max** · brief + 2 + 3 per sub-ticket.

### Chat opener (14a)

```
Load .cursor/skills/section-transform/SKILL.md and the district-program skill.
[SECTION] = district Schools settings (#schools) only.
Dials: 2/1/7. Match command-center readiness actions. Fail closed. Brief, Prompt 2, Prompt 3.
Stay on dev.
```

### Chat opener (14b)

```
… [SECTION] = app/orgs/[slug]/people/page.tsx + OrganizationPeopleManager.
Pending vs revoked must stay distinct. No new invitation types.
```

---

## TICKET 15 — District reports

**Workflow:** Aggregate participation, school vs district hosted, CSV.  
**Section:** district branch of `app/orgs/[slug]/reports/page.tsx`  
**Dials:** 2 / 1 / 7  
**Hard rule:** no student browsing history; fail closed on error (no empty CSV that looks like zero kids).

### What needs to be done

Office ledger, not stat bubbles. School names and Needs RSVP / Upcoming should keep deep links that already exist. Type filter stays. Do not add student-level drill-down.

### Why / effect / business value

This is the artifact a coordinator emails a CAO. Business: **pilot renewal / expansion.** Wrong emptiness here looks like a data breach or a broken product.

### Prompts and models

Agent · **Grok 4.6** · brief + 2 + 3. Opus if it tries to add student lists.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md and the district skill.
[SECTION] = district reports branch of app/orgs/[slug]/reports/page.tsx.
Dials: 2/1/7. Aggregate only. Fail closed. No fabricated school counts.
Brief, Prompt 2, Prompt 3. Stay on dev.
```

---

## TICKET 16 — Family desk

**Workflow:** Parent: which child needs what kind of action.  
**Section:** `app/family/page.tsx`  
**Dials:** 2 / 1 / 7  
**Nouns:** school or club from memberships.

### What needs to be done

Per-child, per-action. RSVP vs Mark complete vs Going on a public listing stay distinct. Settled upcoming named. One next button per row. Do not turn this into a feed or a chatbot.

### Why / effect / business value

Parents are the daily users even when the buyer is a club or district. If Family is noisy, they ignore Alerts and kids miss registration. Business: **retention and word of mouth**; also the handshake that makes org RSVPs real.

### Prompts and models

Agent · **Claude Opus 5 Max** · brief + 2 + 3.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = /family (app/family/page.tsx).
Dials: 2/1/7. One job: which child needs action, and what kind.
Keep RSVP vs organizer registration vs public-listing Going distinct. School/club nouns from memberships.
Brief, Prompt 2, Prompt 3. Stay on dev.
```

---

## TICKET 17 — Student Plan (`/me`)

**Workflow:** Student (13+) accepts invites, RSVPs, follows organizer registration.  
**Section:** `app/me/page.tsx`  
**Dials:** 2 / 1 / 7

### What needs to be done

Same honesty as Family from the student side. Not a social profile. Empty state: search or wait for invite — role-correct.

### Why / effect / business value

Without student accept, the parent handshake never completes. Business: **completion rate of the invite loop.**

### Prompts and models

Agent · **Grok 4.6** · brief + 2 + 3.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = student Plan, app/me/page.tsx.
Dials: 2/1/7. Not a public profile. Brief, Prompt 2, Prompt 3. Stay on dev.
```

---

## TICKET 18 — Host a competition (create → preview)

**Workflow:** Club or school hosts; district hosts district-wide or leaves it to a school.  
**Section:** `app/orgs/[slug]/competitions/new/page.tsx` + `TournamentCreateForm` (preview already meant to match search card + event hero).  
**Dials:** 3 / 2 / 6 (guided flow, not a giant form dump)

### What needs to be done

Guided: type → facts → preview → audience → publish. Type tiles with real category marks; no silent chess default. Preview is the real card, not a fact dump. Audience copy: club-only vs school-only vs district-only must match org type.

### Why / effect / business value

Hosted events are Causey-native inventory (org-gold). That is the wedge vs “we only scrape.” Business: **differentiated supply** and district/school tournament story.

### Prompts and models

1. Plan · **Claude Opus 5 Max** · Prompt 1 · wait  
2. Agent · **Claude Opus 5 Max** · Prompt 2 + 3  

### Chat opener (Plan)

```
Load .cursor/skills/section-transform/SKILL.md.
[SECTION] = host create + preview, app/orgs/[slug]/competitions/new/page.tsx + TournamentCreateForm.
Dials: 3/2/6. No silent chess default. Preview = real CompetitionCard / event start.
Audience labels must match club vs school vs district. No new competition types.
Run Prompt 1 only. Wait. Stay on dev.
```

---

## TICKET 19 — Claim invitation

**Workflow:** Named school/district admin (or staff/student) opens an email link.  
**Section:** `app/claim/[token]/page.tsx` + claim auth components  
**Dials:** 2 / 1 / 7 in a 4/3/5 landing frame

### What needs to be done

One job: claim this seat. Mailbox mismatch refuses Accept (already product). Sign in / create account must not look like a second product. Role label clear (School administrator vs Coach).

### Why / effect / business value

If claim feels phishing-y or generic, district staffing stalls. Business: **district provisioning success rate.**

### Prompts and models

Agent · **Claude Opus 5 Max** · brief + 2 + 3.

### Chat opener

```
Load .cursor/skills/section-transform/SKILL.md and the district skill.
[SECTION] = /claim/[token] (app/claim/[token]/page.tsx).
One job: claim this invitation. Keep mailbox mismatch refuse. No self-serve district create.
Dials: 2/1/7. Brief, Prompt 2, Prompt 3. Stay on dev.
```

---

## TICKET 20 — Optional second critic (any shipped ticket)

After 01, 02, 03, 09, 11, or 13 ships, new Ask chat:

**Model:** **GPT-5.6**  
**Mode:** Ask  
**Prompt:** 3 only, named files.

If it finds real fails, new Agent chat · **Grok 4.6** · “patch this fail list only.”

---

## Suggested calendar (one ticket a day)

| Day | Ticket | Why this day |
| --- | --- | --- |
| 1 | 01 Home hero | Everyone sees it |
| 2 | 02 Chess search | The product |
| 3 | 03 Event page | Search must land |
| 4 | 11 Manage | Club job that retains |
| 5 | 16 Family | Parent job that retains |
| 6 | 13 District overview | B2B demo |
| 7 | 09 Club overview | Club demo |
| 8 | 10 Roster | Activation |
| 9 | 18 Host create | Native supply |
| 10 | 06–07 Auth + create club | Funnel into 09 |
| Then | 08, 12, 14, 15, 17, 19 | Complete the walks |
| Anytime | 04, 05, 20 | Cheap polish |

If you only do **six** chats: **01, 02, 03, 11, 16, 13**.

---

## Per-chat footer (append to every opener)

```
Rules: one section, no drive-by refactors, no DESIGN.md, no main branch, no fabricated data.
After UI changes, verify in the browser (empty, error, next click, ~360 and ~1024).
If club or district: update .cursor/district-ux-progress.md when you ship, not before.
```
