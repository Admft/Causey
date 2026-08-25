# District-program workflow checklist

Copy into the tick notes. Mark each row **works** / **friction** / **missing**.

## Provisioning (Causey + district office)

- [ ] District cannot be created by a coach; platform admin creates it
- [ ] Add school → pending verification → invite named administrator (claim link, no shared password)
- [ ] Ownership handoff; district still has child-school authority
- [ ] Command center shows **one** next action and per-school readiness
- [ ] Two districts stay isolated (readiness, reports, CSV, activity)

## School program

- [ ] School chrome says School account, not Club
- [ ] Roster, groups, staff CSV, join link
- [ ] Assistants read-only; coaches operate events
- [ ] Announcements; district can publish to child schools

## Tournaments

- [ ] District can host district-wide **or** leave hosting with a school
- [ ] Competitions inventory includes child-school events with host names
- [ ] District-only audience only for district hosts and connected schools
- [ ] Public events go through Causey review
- [ ] RSVP, organizer-registration tracking, attendance, recorded results

## District office after setup

- [ ] Overview shows upcoming school + district competitions (not only readiness)
- [ ] Reports split school-hosted vs district-hosted; no inferred school counts on district events
- [ ] CSV is aggregate; fail closed (no empty file on error)
- [ ] Activity feed is scoped; no raw audit table
- [ ] Families see per-child actions on `/family`

## Honesty

- [ ] Public `/districts` pitch matches what is actually shippable
- [ ] No partner names, logos, or fake school directories
- [ ] Email delivery is not claimed as proven at district volume
