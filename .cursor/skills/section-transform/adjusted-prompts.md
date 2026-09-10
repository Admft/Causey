# Five Causey-adjusted prompts

These are the trending mechanics rewritten so they cannot fight Causey’s existing system. Prefer the three ultimates in `SKILL.md`. Use these when you want one mechanic only.

---

### 1. The Access Scene (cinematic setup)

*Based on `cinematic-ui`. Use on marketing and role landings (`/`, `/clubs`, `/districts`, directory heroes) when the band must feel like Causey, not a SaaS template. Do not use on roster/reports tables.*

**Why it changed:** Villeneuve / Dune would overwrite the brand. Causey’s cinematography is already specified: cool canvas `#f5f9fc`, 46px coordinate grid (access / zip / opportunity), filled first viewport, path rail, red primary / blue secondary.

> **Prompt:** "Act as a cinematic art director for Causey, a scholastic competition product (chess is the working surface). Before writing any code, read `CAUSEY-DESIGN-SYSTEM.txt`, `anti-vibecode-rules.txt`, and the current section source. Research the lighting, spatial rhythm, and product objects already in this repo (coordinate grid, filled search card, path draw, scoresheet, district ledger). Translate that into a web-executable narrative for [SECTION]. Write a short `storyboard` in chat — not a new file — defining one distinct scene and one irreplaceable signature composition. Respect a strict interaction budget: maximum 1 heavy interaction in this section, and one shared reveal pattern for the page (12px rise + fade, 400–600ms, `ease-brand`). Do not use generic web design patterns (eyebrow → H1 → 3 icon cards, purple blobs, Inter). Do not pick new fonts or colors. Wait for my approval on the storyboard before writing CSS/JS."

---

### 2. The Dial Tuner (dense product, not a consumer landing)

*Based on Leonxlnx `taste-skill`. Use on directories, org command centers, reports, family, attendance.*

**Why it changed:** `VISUAL_DENSITY = 8` (Bloomberg) is a broadsheet gimmick and fails on school laptops. Causey wants filled panels, not a terminal. Motion 1 with zero signature fails marketing; product chrome should stay at 1–2.

> **Prompt:** "We are transforming [SECTION] in Causey. Act as a Frontend Taste Engineer. I am setting your internal dials to: DESIGN_VARIANCE = 3 (scannable, modern, not a new identity), MOTION_INTENSITY = 2 (card-lift / 1px CTA press / shared scroll-reveal; no scroll hijacking, no bounce), VISUAL_DENSITY = 7 (data-forward, tight padding, strict grid, still readable). If this is a marketing/role landing instead, use 4 / 3 / 5. If this is district office chrome, use 2 / 1 / 7. Use these dials to write the component structure. No jellyfish blobs, no excessive whitespace, no empty cards. Tokens only from `app/globals.css`. Club/Team copy on club surfaces; School/District copy on district surfaces."

---

### 3. The Strict Anti-Slop Ban (any new component)

*Based on Anthropic `frontend-design`. Paste before any new UI element.*

**Why it changed:** “Pick an unexpected display font” and “brutalist/raw” would destroy Source Sans 3 / Source Serif 4 and the 3-step radius. Keep the ban list; lock the aesthetic to Causey.

> **Prompt:** "Build [COMPONENT] for Causey. CRITICAL CONSTRAINTS: You are forbidden from using Inter, Roboto, Arial, or system defaults as the brand face. You are forbidden from using purple or indigo gradients, cream+terracotta, glow, glass, or dark-mode-as-default. Do not wrap everything in cards, and do not nest cards inside cards. Do not use rounded-full status pills. Do not invent a brutalist or editorial-newspaper look. Use the existing system: Source Sans 3 (UI, 500) + Source Serif 4 (`font-display`, 800); `rounded-xl` controls, `rounded-2xl` cards, `rounded-3xl` hero shells; brand-red `#c23b32` primary, brand-blue `#4a8eb8` secondary; canvas `#f5f9fc`. Hierarchy comes from type, filled composition, and `section-rule` — not from extra chrome. Reuse `.field`, `.cta-enabled`, `.card-lift` when they already solve it."

---

### 4. The Deterministic QA Audit (polish loop)

*Based on `impeccable` by pbakaus. Run after the first draft of a section.*

**Why it changed:** The four generic checks are useful but miss Causey’s real failure modes (empty bubbles, leftover lanes, dual-buyer nouns, fabricated copy, token drift).

> **Prompt:** "Act as a deterministic layout critic for [SECTION]. Run a silent audit of the UI you just generated against these rules: 1) Gray/muted text on a colored brand fill without a documented contrast pair? 2) Pure black `#000` or generic gray not in tokens (`#14181c`, `#5a6570`, `#3a4450`, `#f5f9fc`)? 3) Springy/bouncy easings, or anything other than `cubic-bezier(0.22, 1, 0.36, 1)` / `cubic-bezier(0.4, 0, 0.2, 1)` (linear only on access-grid drift)? 4) Spacing off the scale, or ceremonial `py-16`/`py-20` on a short band? 5) Empty bubble, nested cards, leftover `max-w-prose` lane? 6) Inter/purple/`rounded-full` pills/one-off hex/`text-[Npx]`? 7) Two primary CTAs, or Learn more / Get started? 8) Fabricated data or unlabeled seed? 9) Club vs district noun mixup? 10) Missing reduced-motion path? Tell me exactly what fails, with file:line and pixels or hex, then provide the exact code to fix it. Re-audit until none fail."

---

### 5. The State Lock (do not write a new DESIGN.md)

*The `DESIGN.md` mechanic is correct. A second source of truth is not.*

**Why it changed:** Causey already locked tokens, type, radius, and motion. Generating `DESIGN.md` from “components we have built so far” would snapshot drift and fight `CAUSEY-DESIGN-SYSTEM.txt`.

> **Prompt:** "We are locking product truth, not inventing it. Act as Design Lead. Do not create DESIGN.md. Confirm you have read `CAUSEY-DESIGN-SYSTEM.txt`, `anti-vibecode-rules.txt`, and `app/globals.css`. In chat, restate in ≤12 bullets: CSS color tokens (hex), type scale names, radius steps, easings, hover/press rules (`card-lift`, CTA lift/press), semantic color (red = primary action, blue = secondary, gold = org-hosted only, yellow = last-resort). From this point forward, for every new prompt in this thread, you must re-read those files first and treat them as immutable. If a later screen wants a new font, palette, or radius, refuse and reuse."

---

## Ranking for Causey

1. **State lock (#5)** — always on. Already exists as files; the prompt only prevents drift.
2. **Anti-slop ban (#3)** — always on, Causey aesthetic not brutalist.
3. **Dial tuner (#2)** — highest leverage on product chrome. Retune per surface table; never density 8.
4. **QA audit (#4)** — after every transform.
5. **Access scene (#1)** — marketing/role landings only. Overkill for a reports table; skipping it on `/` or `/districts` is how those pages go generic.

The three ultimates in `SKILL.md` are #5+#1 (brief), then #2+#3 (build), then #4 (polish). That is the default loop for any section.
