# App Store and Play Store submission kit

Everything App Store Connect and Play Console ask for, in the order they ask.
Causey is an early build; keep these answers specific and true.

## Blocking prerequisites

Do not open a review until all four are done. A reviewer who hits any of these
sees a broken app and rejects under Guideline 2.1.

1. **`/api/mobile/*` is live on `https://app.causey.dev`** with
   `DATA_SOURCE=supabase`. Every screen in the app calls these routes:
   `/api/mobile/me`, `/api/mobile/family`, `/api/mobile/rsvp`,
   `/api/mobile/registration`, `/api/mobile/account`, and `/api/competitions`.
   On mock data the reviewer's account resolves to nothing.
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
  "Open organizer registration" and "Mark registered" both appear.

**Notes for the reviewer** (paste into App Store Connect):

> Causey helps parents and coaches keep track of student chess tournaments.
> Sign in with the demo account. The Family tab lists each student and the
> RSVPs waiting on you. The Search tab loads upcoming chess tournaments and
> opens a detail screen where you can add the tournament to your calendar or
> share it. Registration for most tournaments is run by the organizer on their
> own website, so those listings link out; Causey then tracks that the
> registration is done. Account deletion is in the Me tab under "Delete
> account". The app is for ages 13 and up; student accounts under 13 are
> blocked at sign-in and shown a screen explaining why.

## Age rating

- **Rating:** 13+. Not the Kids Category.
- **Made for Kids (Play):** No.
- **Unrestricted Web Access:** No. The app opens a small number of vetted
  organizer registration links in the system browser; there is no in-app
  browser and no arbitrary URL entry.
- **User-generated content:** No. The app does not post comments or messages.
- Under-13 students are blocked by `lib/auth/mobile-access.ts` and land on
  `mobile/app/blocked.tsx`, which still offers account deletion.

## App privacy answers

Data collected and **linked to the user's identity**:

| Data | Used for | Notes |
| --- | --- | --- |
| Email address | App functionality, account | Supabase auth identity |
| Name | App functionality | Display name on the roster |
| Coarse location (zip) | App functionality | Optional, typed by the user, 5-digit zip only — no GPS |
| Other user content (RSVPs, registration status) | App functionality | The point of the app |
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
`ios.privacyManifests` and declares required-reason APIs for UserDefaults
(`CA92.1`), file timestamps (`C617.1`), system boot time (`35F9.1`), and disk
space (`E174.1`) — the set pulled in by AsyncStorage and the Expo runtime.

## Required URLs

- Support URL: `https://app.causey.dev/support`
- Privacy policy URL: `https://app.causey.dev/privacy`
- Terms of use: `https://app.causey.dev/terms`
- Account deletion (also in-app on the Me tab): `https://app.causey.dev/account#data`

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
> the registrations you finish on an organizer's site. Search upcoming chess
> tournaments by zip, add one to your calendar, and share it with the rest of
> the team.
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
student self-signup on mobile, and the district office.
