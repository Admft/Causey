# Causey iOS / Android app

One Expo app for both stores. Do **not** start a second Android or iOS codebase.

Weekend target: internal builds (TestFlight + Play internal). Apple/Google **approval** is a later review cycle, not a packaging task.

## What this app is

Native Search / Me plus one home per role: **Family** for a parent, **My tournaments** for a student, **My team** for a coach. Parents and coaches sign up, sign in, reset a password, and delete their account entirely in-app. Students 13 or older create a student account on the website (date of birth is collected there, never in the app), then sign in. Parents answer RSVPs for their students; a student answers their own; a coach opens a roster, takes day-of attendance, and records places. Search uses the same public API as the website for Chess, Speech & Debate, STEM, Arts, and Writing (chess is densest; others can be empty). Search opens on Chess with the website type images and a two-column result grid. Chess includes a Pathways tool (illustrative lookup, not an official US Chess ruling). Sort is Soonest or Popular, and an event can be added to the device calendar, shared, saved, or rated for difficulty. Organizer registration may open an external browser. A student under 13 can sign in, but lands on a blocked screen and stays signed in there until they sign out or delete the account.

Search and the event screen work **signed out** — the app opens on Search for a visitor, and sign-in lives on the Me tab. Account work (Family, My tournaments, My team) requires a session.

Desk work stays on the website: invitations, CSV, groups, organization settings, and season or aggregate reports. Attendance and per-event results are in the app, because a coach does both standing up. Do not add a role to sign-up without giving that role a home tab — `tests/mobile-companion.test.ts` enforces this.

## Two machines, one git branch

Use `dev`. Pull before you start.

| Machine | Do this |
| --- | --- |
| Either | `mobile/` UI, API routes under `app/api/mobile/` |
| Mac | `cd mobile && npm start` then `i` for iOS Simulator; later `eas build --platform ios --profile preview` |
| PC | `cd mobile && npm start` then `a` for Android emulator; later `eas build --platform android --profile preview` |

Cloud builds (EAS) can produce both binaries from either computer. You do not need to “finish Android on the PC and iOS on the Mac” as two apps.

## Local run

From the repo root, keep `npm run dev` running for `/api/mobile/*`.

```bash
cd mobile
cp .env.example .env
# Copy NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY from the web .env
npm start
```

- iOS Simulator: `EXPO_PUBLIC_CAUSEY_API_URL=http://localhost:3000`
- Android emulator: `EXPO_PUBLIC_CAUSEY_API_URL=http://10.0.2.2:3000`
- Physical phone on the same Wi-Fi: `EXPO_PUBLIC_CAUSEY_API_URL=http://YOUR_LAN_IP:3000` (Mac/PC firewall must allow port 3000)

Parent and coach accounts can be created from the app's sign-up screen. Students
13 or older create their own account on the website (`/signup?role=student`),
which is where date of birth is collected; a parent or coach can also create one
for them. Either way they sign in on the app.

## Icons

The launcher art is generated from the same mark the website ships, so it can
never drift. After editing `lib/og/causey-app-icon.tsx`, from the repo root:

```bash
npm run icons:mobile
```

## Checks before a build

```bash
cd mobile
npx tsc --noEmit          # types
npx expo config --type public   # app.json + plugins parse
npx expo export --platform ios  # full Metro bundle, catches import errors
```

From the repo root, `npm run test` covers the store-readiness invariants in
`tests/mobile-companion.test.ts`.

## Submitting

Read [APP-STORE.md](APP-STORE.md) first — it lists the demo account, privacy
answers, age rating, and the blocking prerequisites (live `/api/mobile/*` on
`causey.dev`, and Supabase keys set as EAS environment variables).

## Store listing URLs

- Support: `https://causey.dev/support`
- Privacy: `https://causey.dev/privacy`
- Terms: `https://causey.dev/terms`

Age: 13+. Not Kids Category. No in-app purchases.
