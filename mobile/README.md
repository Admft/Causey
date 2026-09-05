# Causey iOS / Android app

One Expo app for both stores. Do **not** start a second Android or iOS codebase.

Weekend target: internal builds (TestFlight + Play internal). Apple/Google **approval** is a later review cycle, not a packaging task.

## What this app is

Native Family / Search / Me. Parents and coaches sign up, sign in, reset a password, and delete their account entirely in-app. Parents RSVP in-app. Chess search uses the same public API as the website, and an event can be added to the device calendar or shared. Organizer registration may open an external browser. Students under 13 are blocked at sign-in.

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

Parent and coach accounts can be created from the app's sign-up screen. Student
accounts are created on the website by a parent or coach.

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
