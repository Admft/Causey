# App Store and Play Store submission kit

Everything App Store Connect and Play Console ask for, in the order they ask.
Causey is an early build; keep these answers specific and true.

## Blocking prerequisites

Do not open a review until all four are done. A reviewer who hits any of these
sees a broken app and rejects under Guideline 2.1.

1. **`/api/mobile/*` is live on `https://causey.dev`** with
   `DATA_SOURCE=supabase`. Every screen in the app calls these routes:
   `/api/mobile/me`, `/api/mobile/family`, `/api/mobile/plan`,
   `/api/mobile/team`, `/api/mobile/roster`, `/api/mobile/attendance`,
   `/api/mobile/rsvp`, `/api/mobile/registration`, `/api/mobile/account`,
   `/api/mobile/saved`, `/api/mobile/alerts`, `/api/mobile/orgs`,
   `/api/mobile/join`, `/api/mobile/results`, `/api/mobile/rating`,
   `/api/mobile/club-going`, `/api/mobile/event-attendance`, and
   `/api/competitions`. On mock data the reviewer's account resolves to nothing.
2. **Supabase keys are set on the EAS build profile.** `eas.json` pins
   `EXPO_PUBLIC_CAUSEY_API_URL`, but the two Supabase values are not committed:

   ```bash
   eas env:create --name EXPO_PUBLIC_SUPABASE_URL --scope project --visibility plaintext
   eas env:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --scope project --visibility plaintext
   ```

   Without them the app builds fine and then refuses every sign-in. Verify with
   `eas env:list production` before building.
3. **The demo account below exists in production** with real linked students.
4. **Icons are current.** Run `npm run icons:mobile` from the repo root after
   any change to `lib/og/causey-app-icon.tsx`.
5. **You know whether Supabase requires email confirmation in production.**
   Check Authentication → Sign In / Providers → Confirm email. Reviewers test
   sign-up even when you hand them a demo account, and they use throwaway
   addresses they cannot read. If confirmation is **on**, the reviewer hits the
   "Confirm your email" screen and cannot continue — that reads as broken under
   Guideline 2.1. Either turn it off for launch or keep the sentence about it in
   the review notes below. Do not leave this unanswered.

## Demo account (App Review Information)

A reviewer signing in to a fresh parent account sees an empty Family tab and
usually reports "app is not functional". Seed the demo account first.

- **Sign-in required:** Yes.
- **User name:** `review@causey.dev`
- **Password:** store in 1Password; paste into App Store Connect, never here.
- **Account type:** parent.

The account must have, in production:

- Two linked students (active `household_links`).
- At least one entrant row with `status = 'invited'` on an upcoming
  competition, so the Family tab opens on a real "Going / Can't go" decision.
- At least one `status = 'going'` entrant on a competition with a `reg_url`, so
  "Open organizer registration" and "Mark complete" both appear.

**Notes for the reviewer** (paste into App Store Connect):

> Causey helps parents, coaches, and students keep track of student
> tournaments. Sign in with the demo account. The first tab depends on the
> account type: a parent gets Family (each student and the RSVPs waiting on
> you), a student gets My tournaments (their own invitations), and a coach gets
> My team (the organizations they staff, day-of attendance for upcoming events,
> and rosters). The Search tab opens on Chess with the same type images as the
> website (Chess, Debate, STEM, Arts, Writing). Chess has a Tournaments /
> Pathways switch: Pathways walks the same illustrative qualification lookup as
> the website (not an official US Chess ruling). Sort is Soonest or Popular.
> You can also search by name or zip. Chess is the densest index; other
> types can be empty, which is honest, not broken. Open a listing to add it to
> the calendar or share it. Registration for most tournaments is run by the organizer on their own
> website, so those listings link out; Causey then tracks that the registration
> is done. A coach takes day-of attendance and records places from My team.
> Signed in, the Me tab also has Alerts, Saved listings, and "Enter a join
> code"; open any tournament to rate its difficulty from 1 to 10. Invitations,
> CSV imports, organization settings, and season reports are website tasks and
> are not in the app. Account deletion is in the Me tab under "Delete account".
> The app is for ages 13 and up. A student under 13 can sign in, but lands on a
> screen explaining why the account cannot be used and stays signed in until
> they sign out or delete the account there.

To exercise all three homes, the reviewer can use the demo parent plus the two
demo student accounts below. A coach demo account is optional; if you include
one, it needs at least one upcoming hosted or travel event so the attendance
screen is not empty.

Add this line **only if** email confirmation is still enabled in Supabase:

> Creating a brand-new account sends a confirmation email before first sign-in.
> Please use the demo account above rather than signing up, or tell us and we
> will provide a pre-confirmed address.

## Accounts and sign-in

Account creation happens entirely in the app for parents and coaches: Me →
Create a parent or coach account, or the link on the sign-in screen. Students
13 or older create a student account on the website (`/signup?role=student`),
which collects date of birth; the phone never asks for it. After that they
sign in on the app. Students under 13 stay on a parent account.

- **No third-party or social login.** Causey uses first-party email and
  password through Supabase, so Guideline 4.8 does not apply and Sign in with
  Apple is not required. Do not add it to "look compliant."
- **Sign-up collects** name, email, password, and an optional 5-digit zip. That
  is exactly what the App Privacy table above declares. Zip is optional and
  there is no date of birth.
- **Terms and privacy are linked on the sign-up screen itself**, not only in
  the Me tab.
- **Deletion matches creation** (Guideline 5.1.1(v)) — see below.

**Browsing without an account (Guideline 5.1.1(i)).** Search and the
tournament detail screen work signed out, exactly as they do on the website; the
app opens on Search for a visitor. Search covers Chess, Speech & Debate, STEM,
Arts, and Writing. Sign-in is required only for account work: Family RSVPs, a
student's own tournaments, rosters, and attendance. A reviewer can therefore see
real content before creating anything. The signed-out Me tab is where sign-in
and sign-up live.

## Age rating

- **Rating:** 13+. Not the Kids Category.
- **Made for Kids (Play):** No.
- **Unrestricted Web Access:** No. The app opens organizer registration links
  and Causey trust pages (privacy, terms, support, student signup, a few
  website-only alert destinations) in the system browser. There is no in-app
  browser and no arbitrary URL entry.
- **User-generated content:** Difficulty ratings only (a number from 1 to 10 on
  a tournament). The app does not post comments, messages, photos, or profiles
  of other users. Report a problem is on the Me tab and at `/support`.
- **Devices:** iPhone. Tablet support is off until there is an iPad layout.
- Under-13 students who sign in land on `mobile/app/blocked.tsx` (they are not
  signed out automatically) and can still delete the account.

## App privacy answers

Data collected and **linked to the user's identity**:

| Data | Used for | Notes |
| --- | --- | --- |
| Email address | App functionality, account | Supabase auth identity |
| Name | App functionality | Display name on the roster |
| User ID | App functionality, account | Supabase account UUID |
| Coarse location (zip) | App functionality | Optional, typed by the user, 5-digit zip only — no GPS |
| Other user content (RSVPs, registration status, difficulty ratings, attendance, results, saved listings, alert read state, join-code roster actions) | App functionality | The point of the app |
| Product interaction | App functionality | Server logs only |

Answer **No** to all of these:

- Used for tracking (no ad identifiers, no third-party analytics SDK).
- Precise location (no `expo-location`, no GPS permission).
- Contacts, photos, health, financial info, browsing history.
- Push tokens (push notifications are deliberately not shipped in 1.0).

Calendar access is **write-only and user-initiated**: it is requested only when
someone taps "Add to calendar" on a tournament, and the OS event sheet does the
saving. Calendar data is never read, stored, or transmitted.

The iOS privacy manifest lives in `mobile/app.json` under
`ios.privacyManifests`. It declares the collected types above (linked to
identity, not used for tracking) plus required-reason APIs for UserDefaults
(`CA92.1`), file timestamps (`C617.1`), system boot time (`35F9.1`), and disk
space (`E174.1`) — the set pulled in by AsyncStorage and the Expo runtime.

## Required URLs

- Support URL: `https://causey.dev/support`
- Privacy policy URL: `https://causey.dev/privacy`
- Terms of use: `https://causey.dev/terms`
- Account deletion (also in-app on the Me tab): `https://causey.dev/account#data`

## Account deletion (Guideline 5.1.1(v))

In-app, no support email detour, no dark pattern:

Me tab (or the blocked under-13 screen) → **Delete account** → type your account
email → **Delete my account** → system confirm → `DELETE /api/mobile/account` →
`delete_own_account` RPC → signed out and returned to the sign-in screen.

Deletion is refused with a plain explanation when the account owns an
organization, is a protected founder account, or carries organization review
history. Those messages come from `lib/account-delete.ts`, shared with the
website so both surfaces say the same thing.

## Store listing copy

**Subtitle:** Student chess tournaments, tracked.

**Description:**

> Causey helps parents and coaches keep student chess tournaments straight.
>
> See which student still owes an RSVP, answer it in a tap, and keep track of
> the registrations you finish on an organizer's site. Search Chess, Speech &
> Debate, STEM, Arts, and Writing by zip, add a listing to your calendar, and
> share it with the rest of the team. Chess has the most listings; other types
> are thinner and can be empty.
>
> Coaches take day-of attendance and record places from My team. Signed in, you
> can save a listing to come back to and rate a tournament's difficulty from 1
> to 10.
>
> Causey is an early build. Tournament coverage is incomplete, so confirm dates
> and fees with the organizer before you travel.
>
> Causey is for ages 13 and up. Accounts for students under 13 are managed by a
> parent or coach on the website.

Do not claim complete coverage, verified listings, or partner names.

## Build and submit

```bash
cd mobile
eas build --platform ios --profile production
eas submit --platform ios --latest
```

Check after `eas build` runs prebuild:

- `ios/Causey/Images.xcassets/AppIcon.appiconset` — the 1024 icon must be
  opaque. Expo flattens alpha, but verify; a transparent icon is an automatic
  binary rejection.
- `ios/Causey/PrivacyInfo.xcprivacy` exists and matches `app.json`.
- `ios/Causey/Supporting/Info.plist` contains `NSCalendarsUsageDescription`.

## Known gaps to disclose internally (not to Apple)

Deferred on purpose for 1.0: push notifications, Sign in with Apple (not
required — Causey offers no third-party social login), in-app purchases,
in-app student signup (13+ students use the website form, then sign in), event
comments, and the district office.

Difficulty ratings (1–10) ship on the event screen. They are a number, not a
comment thread. Event comments stay on the website until in-app report/block
exists for that feed.

Desk work stays on the website on purpose: invitations and claim links, CSV
roster import and export, organization settings and ownership transfer, season
and aggregate reports, district provisioning, and platform admin. The app covers
what someone does standing up: answer an RSVP, find a tournament, take
attendance, and record a place when the round ends.
