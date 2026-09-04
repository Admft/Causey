# Causey for clubs and teams

**Audience:** club owners, team coaches, and volunteer organizers (any competition type Causey lists)  
**Product:** Causey (`https://app.causey.dev`)  
**Date:** August 24, 2026  
**Status:** A coach can run a real season of coordination. Chess search is the densest public index. Causey is not tournament-floor software. Club SaaS checkout is a local layout only; it does not collect student dues or organizer entry.

Causey helps a club find events, get students and families to the right ones, record who went and how they finished, and keep a season file. Families still finish paid entry on the organizer’s site. Chess clubs get the most listings; a debate, STEM, arts, or writing club can use the same roster and hosting tools with fewer public events in the directory.

A club is not a school and not a district. Coaches create club or team workspaces themselves. Districts are provisioned separately by Causey. Public pitch: [app.causey.dev/clubs](https://app.causey.dev/clubs).

---

## What people in the club can do

### Club / team owner (administrator)
- Create a **club** or **team** and keep the type locked.
- Invite coaches, assistants, and students with join links or CSV claim links.
- Set a member-visible **website** and **meeting note**.
- Transfer ownership; post short announcements.
- Download a **season CSV** of attendance and recorded places/awards (hosted events plus travel events the club marked as attending).

### Coaches
- Run a **roster** and **groups**.
- Mark the club as **going** to a public tournament; invite the roster; collect RSVPs and “finished organizer registration.”
- Host a club event: draft → preview → publish (public listings wait for Causey review).
- Choose **public**, **club/team only**, or **invite-only** (not district-only).
- Record **attendance**, then **division / place / award**. Open a student from the roster for club-scoped history. The club overview shows a **This season** list of recorded places.

### Parents
- Link a child and use the **family desk** for RSVP and unfinished organizer registration.
- See recorded results when a coach entered them (blank means not recorded).

### Students
- Search listings (chess is usable; other types can be thin).
- Save events, RSVP, join with a code, leave the club, keep a **plan**.
- Filter signed-in search to **events my club is going to**.

---

## Feature list

| Feature | What it does | Ready for a club season? |
| --- | --- | --- |
| Public club pitch `/clubs` | Season path + honest out-of-scope; Start a club creates a coach login then a club | Yes |
| Roster, groups, staff/student invites | Claim links; assistants read-only | Yes |
| Public chess search | Zip/radius/date/grade filters | Yes, coverage incomplete |
| Other-type directories | Debate, STEM, arts, writing search | Hosting yes; indexes thin |
| “My club is going” | Signed-in directory chip | Yes (live data, not mock) |
| Hosted competitions | Draft → review → publish | Yes |
| Competitions inventory | Hosted records plus travel events the club marked as attending | Yes |
| RSVP + organizer registration | Distinct from paying the organizer | Yes |
| Attendance + recorded results | Place/award; blanks are honest; overview lists this season’s recorded places | Yes |
| Family desk + alerts | Per-child actions; in-app alerts | Yes; email not volume-proven |
| Season report + CSV | Hosted + travel the club attended | Yes |
| Grade + credential IDs | Typed USCF / NSDA / other | IDs only; no live lookups |
| Website + meeting note | Members only | Yes |
| Public club homepage / directory | Find a club by city | No |
| Pairings, ballots, student dues | Floor TD / tab / family billing | No — use those products |
| Club/team SaaS checkout | Monthly Causey subscription for the workspace | Layout only (`/billing`); invoices, dunning, and entitlements shown; not live |

---

## Needs for a professional club (not building unless you ask)

- Recurring practice nights
- A public club directory
- Live USCF/NSDA lookup
- Pairings/ballots
- Dues
- Coach–parent DMs

Club SaaS checkout exists only as a local layout (`/billing`). It is not live and does not collect student dues.

## What Causey does not do yet

Do not promise these in a club-owner conversation. Same list as above, with the usual extra detail:

- Recurring practice night as its own object (meeting note is the stand-in)
- A public club directory or public student profile
- Live rating or NSDA-point lookup from typed IDs
- Swiss pairings, boards, clocks, or submitting a US Chess rating report
- Tabroom/SpeechWire ballots or imported break lists
- Membership dues collected from families, or live Stripe checkout
- Coach–parent message threads

---

## How a club season runs

1. **Create the club** and share the student join link.
2. **Find or host events.** Public chess search is the usual travel path; hosting is for the club’s own tournament.
3. **Invite, RSVP, finish organizer registration** off Causey.
4. **Mark attendance and record results** so families and the season file stay complete.
5. **Export the season CSV** when a board or parent asks who went and who placed.

To talk through a school-district program instead, use [app.causey.dev/districts](https://app.causey.dev/districts).
