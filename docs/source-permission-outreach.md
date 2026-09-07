# Source permission outreach

Printable PDF: [source-permission-outreach.pdf](source-permission-outreach.pdf) (source: [source-permission-outreach.tex](source-permission-outreach.tex)).

Use this when asking organizers for written permission to index their public listings on Causey. It is an ops checklist, not a promise that any of these will become scrapers, and not a partnership announcement.

Chess search is already usable (US Chess TLA and related feeds). Debate, STEM, arts, and writing stay thin until the bodies below say yes — or until a first-party page is clearly allowed without a license (see “Confirm before building,” not this list).

Do not scrape a blocked source while an email is in flight. A verbal “sounds fine” is not enough to turn automation on.

Related engineering notes: `ingestion/README.md`, `lib/ingestion-sources.ts`, `lib/category-discovery.ts`, [source-scraper-eligibility.md](source-scraper-eligibility.md) (what may be built vs what still needs a letter).

---

## What we ask to index

Only **factual listing metadata**, with a link back to the official page:

- Event or program name
- Official canonical URL
- Published dates / status (open, closed, tentative)
- Category and published format (for example Public Forum, Division C)
- Online vs in-person, and published city/state or “online”
- Eligibility and fee **only if the public page already states them**

We do **not** ask for, and will not take:

- Logins, membership-only calendars, or behind-the-wall PDFs
- Ballots, pairings, speaker points, contest problems, solutions, or results dumps
- Student, coach, or judge personal data
- Logos or marks (attribution is a text name + link unless brand use is granted separately)
- Registration checkout, payment, or tab-room software features
- Cloudflare or other access-control bypasses
- Implied endorsement (“official Causey partner of …”)

Cadence if they say yes: polite, sequential fetches (about twice weekly), identifiable user agent, fail closed if the page changes or robots/terms later forbid it.

---

## What written permission must say

Keep the reply as email or a signed note. Engineering will not flip a kill switch on a hallway conversation.

A usable yes includes:

1. **Who** is granting it (organization name, person’s role, date).
2. **What** we may copy: public tournament/program listings (name, dates, location or online, eligibility/fees if published, official URL).
3. **Where** we may show it: Causey’s website and iOS/Android apps, including search and family/org views.
4. **That** automated fetching of those public pages (or a named API) is allowed for that purpose.
5. **Commercial / public reuse** if their terms currently ban it (NSDA/Tabroom especially).
6. **What is out of scope** if they care: no participant PII, no problems, no logos unless separately granted.
7. **Revocation**: they can withdraw; we stop the feed and unpublish those rows.

Store the file off-git (email archive). In product, record the date in `lib/ingestion-sources.ts` `permissionReviewedOn` and only then enable the adapter / env gate (Tabroom already uses `TABROOM_WRITTEN_PERMISSION=1`).

---

## Priority

Reach here means “how many real student events become searchable,” not how pretty the brand is.

| Priority | Why it is first | Ask |
| --- | --- | --- |
| **P1** | One feed would change a whole category | NSDA / Tabroom; Alliance for Young Artists & Writers (Scholastic); MATHCOUNTS; FIRST |
| **P2** | Second calendar or official API in the same category | SpeechWire; MAA (AMC/AIME/USAMO); REC Foundation / VEX Events; Society for Science fair finder |
| **P3** | Smaller national programs; still blocked or ToS-unclear | YoungArts; NSDA.org membership calendars (if anything useful is not on Tabroom) |
| **Later** | Affiliate layer — same decision as USCF state affiliates | State speech associations (CHSSA and peers); Science Olympiad / TSA state sites; NSDA districts |

National Science Bowl is **already live** from DOE public pages. Do not ask DOE for a scrape license unless legal wants a courtesy letter on file.

---

## Must have written permission (blocked today)

These are the emails that actually increase reach. Causey already treats them as paused, blocked, or link-only.

### 1. National Speech & Debate Association — Tabroom (P1)

| | |
| --- | --- |
| **Site** | [tabroom.com](https://www.tabroom.com/index/index.mhtml), [speechanddebate.org](https://www.speechanddebate.org/) |
| **Why** | Almost every real NSDA-circuit tournament (national, district, local invitational) lives here. Same role TLA plays for chess. Without this, debate search stays Texas UIL invitationals only. |
| **Blocker** | NSDA terms cover Tabroom: no automated access; downloads limited to personal non-commercial viewing; no commercial/public reuse. `robots.txt` allowing calendar paths does **not** override that. Adapter exists but is paused (`0051`, `TABROOM_WRITTEN_PERMISSION`). |
| **Ask** | Written license to fetch **public** tournament list/detail pages and republish factual listing metadata on Causey (web + apps), with attribution and a link to Tabroom. Explicitly include automated access and public reuse. |
| **Do not ask for** | Membership-only pages, ballots, entries, results, judge or student PII, Tabroom as a tab system. |
| **If they say no** | Keep the outbound Tabroom link. Do not rebuild the old Texas scrape. SpeechWire is not a substitute we can use without its own yes. |
| **Status** | Not contacted (fill in) |

### 2. Alliance for Young Artists & Writers — Scholastic Art & Writing Awards (P1)

| | |
| --- | --- |
| **Site** | [artandwriting.org](https://www.artandwriting.org/) |
| **Why** | Largest national arts **and** writing umbrella (many categories). Closest analogue to a federation for that space. |
| **Blocker** | Terms prohibit automated indexing. Link-only in product. |
| **Ask** | Permission to index public program/affiliate deadline listings (or a data feed they already publish). National + regional affiliate dates if they want students to find local affiliates. |
| **Do not ask for** | Student work, judging, accounts, or logos unless they offer brand guidelines separately. |
| **If they say no** | Stay on TAEA VASE, UIL arts, AFSA, Bennington. |
| **Status** | Not contacted |

### 3. MATHCOUNTS (P1)

| | |
| --- | --- |
| **Site** | [mathcounts.org](https://www.mathcounts.org/) — chapter/state competition search |
| **Why** | Middle-school math, chapter → state → national. Dense, recurring, school-shaped. |
| **Blocker** | Terms require **prior written consent** to reproduce, retransmit, or republish site materials. |
| **Ask** | Written consent to republish public competition search results (name, dates, location, official URL) on Causey. |
| **Do not ask for** | Contest problems, school rosters, or the coaching portal. |
| **Status** | Not contacted |

### 4. FIRST (FRC / FTC / FLL) (P1)

| | |
| --- | --- |
| **Site** | [firstinspires.org](https://www.firstinspires.org/) |
| **Why** | Robotics at every school age band; regional → championship. STEM has no single umbrella; this is one of the largest independent circuits. |
| **Blocker** | FIRST Terms of Use: Events Data may not be used for commercial purposes, including including it in a product or service you sell. A free API token does not waive that. The Blue Alliance and Orange Alliance do not grant a commercial-use waiver of FIRST’s ban. |
| **Ask** | A listing license (or a feed whose commercial display is in scope) for **event listings only**, for display in a student discovery app, with their required attribution. Do not take a token and ship. |
| **Do not ask for** | Team PII, scoring, or bypassing FIRST account rules. |
| **Status** | Not contacted |

### 5. SpeechWire (P2)

| | |
| --- | --- |
| **Site** | [speechwire.com](https://www.speechwire.com/) |
| **Why** | Second debate/speech host. Some circuits never appear on Tabroom. Worth it **after** or **in parallel with** NSDA — check overlap once both are legal. |
| **Blocker** | Terms prohibit automated indexing. |
| **Ask** | Same factual-listing license as Tabroom, limited to public calendars. |
| **Do not ask for** | Tabulation, ballots, or student data. Never fetch SpeechWire as a side effect of a UIL (or other) scrape. |
| **Status** | Not contacted |

### 6. Mathematical Association of America — AMC / AIME / USAMO (P2)

| | |
| --- | --- |
| **Site** | [maa.org/amcreg](https://maa.org/amcreg/) |
| **Why** | The high-school math pathway. Dates are public; we still do not republish them. |
| **Blocker** | Site-wide Terms of Use returned HTTP 403 to ordinary access during review (2026-08). Causey does not assume for-profit public reuse is allowed. |
| **Ask** | Written permission to display published AMC/AIME/USAMO (and AMC 8 if they want) dates and official URLs, plus a copy of or pointer to the terms that allow it. |
| **Do not ask for** | Problems, scores, or student registration data. |
| **Status** | Not contacted |

### 7. REC Foundation — VEX Events (P2)

| | |
| --- | --- |
| **Site** | [events.vex.com](https://events.vex.com/robot-competitions/vex-robotics-competition); PDF also cites roboticseducation.org / vexrobotics.com |
| **Why** | Separate robotics circuit from FIRST; grades split; regionals → worlds. Adapter already exists. |
| **Blocker** | Ordinary public HTML still returns **HTTP 403** (Cloudflare), re-checked 2026-09-02. Causey will not bypass that. RobotEvents is not the official 2026–27 pathway. |
| **Ask** | Either: (a) allowlisted crawler / official listing API, or (b) confirmation that public directory HTML will return ordinary 200s to our documented user agent. Written reuse of listing metadata either way. |
| **Do not ask for** | Permission to break Cloudflare. Do not scrape RobotEvents as a substitute. |
| **Status** | Not contacted |

### 8. Society for Science — fair finder (P2)

| | |
| --- | --- |
| **Site** | [findafair.societyforscience.org](https://findafair.societyforscience.org/) |
| **Why** | Science-fair geography (ISEF affiliates). Complements TXSEF (Texas state only) and DOE Science Bowl (national dates only). |
| **Blocker** | Product is link-only pending permission for automated indexing. |
| **Ask** | Index public fair finder rows (name, dates, location, official URL) or a sanctioned export. |
| **Status** | Not contacted |

### 9. YoungArts (P3)

| | |
| --- | --- |
| **Site** | [youngarts.org](https://youngarts.org/) |
| **Why** | Multi-discipline, ages 15–18, more selective than Scholastic. Smaller reach, same legal pattern. |
| **Blocker** | Terms prohibit automated indexing. |
| **Ask** | Public application-cycle dates and discipline list only. |
| **Status** | Not contacted |

### 10. NSDA.org (membership calendars) (P3)

| | |
| --- | --- |
| **Site** | [speechanddebate.org](https://www.speechanddebate.org/) |
| **Why** | National body; some calendar content is membership-gated. Tabroom is the high-value ask; this is only if they want a **public** NSDA.org calendar indexed as well. |
| **Blocker** | Do not scrape behind login. |
| **Ask** | Point us at any **public** HTML or feed they want indexed; or fold it into the Tabroom license. |
| **Status** | Fold into the NSDA/Tabroom conversation |

---

## Confirm before building (not blocked yet; ask if terms are unclear)

These were on the competition-sources list. Do not treat them as “free to scrape.” Do a robots + terms pass first; send a courtesy letter if terms are silent, commercial-use is fuzzy, or the org is large enough that surprise indexing would be a bad start. Science Olympiad and Poetry Out Loud failed that pass on 2026-09-06 (non-commercial / no republish). The Congressional App Challenge passed and is live as one national window.

| Org | URL | What a yes would unlock | Ask / confirm |
| --- | --- | --- | --- |
| National Catholic Forensic League (NCFL) | Search from “The NCFL” / ncfl.org | Parallel Catholic national + district structure (not NSDA) | Public national/district dates only; no membership pages |
| National Parliamentary Debate Association (NPDA) | [npdadebate.com](https://npdadebate.com) | College / some high-school-adjacent parli calendar | Public calendar page |
| Science Olympiad | [soinc.org](https://www.soinc.org/) | National tournament + pointer to state sites | **Blocked 2026-09-06:** site Terms limit use to personal non-commercial viewing and forbid republishing site content without written permission. Ask before any invitational or state scrape. |
| Technology Student Association (TSA) | [tsaweb.org](https://tsaweb.org) | National conference; state delegations | National first |
| USA Computing Olympiad (USACO) | [usaco.org](https://usaco.org) | Online contest windows | **Not ready 2026-09-06:** ordinary homepage returned a Cloudflare challenge; 2025–26 recap is not a complete next-season window. Dates and official URL only; no problems or logins. |
| Envirothon | [envirothon.org](https://envirothon.org) | State → national environmental science | National (and published state) dates |
| Poetry Out Loud | [poetryoutloud.org](https://www.poetryoutloud.org/) | Recitation pathway, state → national | **Blocked 2026-09-06:** poetryoutloud.org is governed by Mid Atlantic Arts Terms (non-commercial; no republishing). Written permission required. National finals dates only if they say yes; no state-coordinator fan-out. |
| Hack Club Hackathons | [hackathons.hackclub.com/data/](https://hackathons.hackclub.com/data/) | High-school hackathon JSON feed | Documented API; credit “Hack Club Hackathons” with a link. No logos. Eligible later (virtual + US in-person with ZIP). Not built 2026-09-06. |
| Bow Seat Ocean Awareness Contest | bowseat.org (confirm current URL) | One annual multi-media / writing cycle | Year-specific deadline, like AFSA |
| State speech associations (e.g. CHSSA) | Varies | State qualification layer (chess “state affiliate” analogue) | One national policy first: **link directory** vs per-state scrape. Do not send 50 emails until that policy exists. |

If a confirm-before-building source has a clear public-domain or “no automation ban” page (DOE Science Bowl pattern), engineering can still require a recorded review date in `ingestion-sources.ts` without waiting on a letter. When in doubt, ask.

---

## Do not ask (already live, or the wrong kind of source)

| Source | Why not an outreach target |
| --- | --- |
| US Chess TLA, CCA, OnlineReg, Chess-Results, FIDE, Texas Chess Association | Already ingested. Production-use review for chess remains ops, not a new letter campaign. |
| DOE National Science Bowl | Live. Public-domain Office of Science pages; national dates only. |
| Congressional App Challenge | Live 2026-09-06. One national submission window from public HTML; participating-district table is not ingested. |
| Purple Comet! Math Meet | Live. |
| Texas Science & Engineering Fair | Live (Texas state fair only). |
| UIL speech/debate, theatre, marching band | Live (Texas, stated coverage only). |
| TAEA VASE | Live. |
| AFSA essay, Bennington Young Writers | Live or waiting on a year-specific cycle. |
| MathWorks Math Modeling Challenge | Reference because **2027 dates are not published**, not because of a scrape ban. Revisit when the first-party page has a complete window. |
| Scienteer, zFairs | Tenant software, not national directories. |
| RobotEvents | Not the official 2026–27 VEX pathway. |
| AoPS, NewPages | Secondary directories; Causey does not ingest them as official sources. |
| USCF state affiliate sites | Already a public **reference directory**. Per-state scrape is a later program, same as CHSSA-class debate affiliates. |

---

## Short email you can send

Subject: Permission to list public [Tabroom / MATHCOUNTS / …] events on Causey

> Hello,
>
> Causey ([https://causey.dev](https://causey.dev)) is a student competition discovery app. Chess listings are the furthest along; we are careful about other sources and do not scrape sites that forbid automation or public reuse.
>
> We would like written permission to fetch your **public** [tournament calendar / competition search / event API] and display factual listing information for students, families, coaches, and schools: event name, dates, location or online, eligibility and fees only when you already publish them, and a link to your official page. We would not collect participant data, contest content, or ballots, and we would not use your logo unless you grant that separately.
>
> Fetching would be polite and infrequent (on the order of twice a week), with an identifiable user agent. You could revoke permission and we would stop the feed.
>
> If this is in scope, a short email from someone who can grant it — plus any attribution or trademark rules — is enough for us to keep on file. Happy to jump on a call.
>
> Thank you,
> [Name]
> Causey

Customize the bracketed source. For FIRST, ask for a **listing license** whose commercial display is in scope, not “we got a token so we can ship.” For VEX, say **ordinary access or an official listings API**, not a Cloudflare workaround.

---

## After a yes

1. File the letter off-git; note date and grantor here and in `permissionReviewedOn`.
2. Re-check robots.txt and current terms the same week (landscapes shift).
3. Scope the adapter like existing non-chess feeds: official HTML or named API only, exact dates or no row, no invented regionals, no third-party registration hosts.
4. Enable the existing env/admin gate only for that source (Tabroom: `TABROOM_WRITTEN_PERMISSION=1` plus restoring dispatch). Do not treat one org’s yes as permission for another.
5. Keep site-wide product copy honest: still incomplete coverage, confirm with the organizer.

---

## Tracking

| Org | Priority | Last contact | Grantor / date | Outcome | Engineering gate |
| --- | --- | --- | --- | --- | --- |
| NSDA / Tabroom | P1 | | | | `TABROOM_WRITTEN_PERMISSION` |
| Scholastic (Alliance) | P1 | | | | new adapter after yes |
| MATHCOUNTS | P1 | | | | new adapter after yes |
| FIRST | P1 | | | | listing license, then API token + adapter |
| SpeechWire | P2 | | | | new adapter after yes |
| MAA AMC | P2 | | | | new adapter after yes |
| VEX / REC | P2 | | | | 200s or API; existing `vex_events_scrape` |
| Society for Science | P2 | | | | new adapter after yes |
| YoungArts | P3 | | | | new adapter after yes |
| NCFL | Confirm | | | | |
| NPDA | Confirm | | | | |
| Science Olympiad | Confirm | | | Blocked: non-commercial + no republish | written permission |
| TSA | Confirm | | | | |
| USACO | Confirm | | | Cloudflare; no complete next window | |
| Envirothon | Confirm | | | | |
| Poetry Out Loud | Confirm | | | Blocked: Mid Atlantic Arts non-commercial terms | written permission |
| Hack Club Hackathons | Confirm | | | API credit required; eligible later | new adapter after ZIP/US scope |
| Congressional App Challenge | Confirm | 2026-09-06 | Public HTML, no automation ban found | Indexed | `congressional_app_challenge_scrape` |
| Bow Seat | Confirm | | | | |
| State speech affiliates | Later | | | | policy first, then per state |
