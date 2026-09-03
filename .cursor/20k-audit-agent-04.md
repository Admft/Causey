# Agent 4 — Security and isolation

## Scope covered
`.cursor/20k-full-audit-roles.md`; `tests/multi-district-isolation.test.ts`; `tests/district-lifecycle-guardrails.test.ts`; `tests/district-data-fail-closed.test.ts`; `tests/sql/0044_database_security_remediation.sql`; `tests/public-path-hardening.test.ts`; migrations `0011`, `0015`, `0016_escalation_lockdown`, `0018`, `0025`, `0026`, `0028`, `0030`, `0035`, `0036`, `0037`, `0038`, `0041`, `0044`, `0045`, `0046`, `0057`, `0058`, `0060`, `0062`, `0063`, `0065`, `0066`, `0067`; `lib/org-permissions.ts`; `lib/auth/platform-admin.ts`; `lib/supabase/{client,server,browser,middleware}.ts`; `lib/rate-limit.ts`; `lib/data/{district,portal,admin}.ts`; `lib/actions/{orgs,admin,admin-operations,comments}.ts`; `lib/email/{enqueue,delivery}.ts`; `app/admin/{layout,page,users,organizations,moderation,scrapers}/page.tsx`; `app/orgs/[slug]/reports/export/route.ts`; `app/api/{cron/product-email,account/export}/route.ts`; `next.config.ts`; `vercel.json`; `proxy.ts`; `.env.example`; `SETUP.md`; `app/privacy/page.tsx`. Grep: `service_role`, `is_org_admin`, `can_view_competition`, `parent_org_id`, platform-admin gates.

## Verdict
**Blocker** for 20k + paid clubs + custom district portals. Cookie-JWT RLS on the shared `/orgs/[slug]` shell is real and mostly fail-closed, and paying Club A cannot `get_org_roster` Club B through current policies. Isolation still fails a hard gate: `organizations` INSERT does not require district-admin rights on `parent_org_id`, so an unlocked coach who knows a district UUID can hitch a school under District B and then pass `can_view_competition` for that district’s `audience='district'` events. Custom portals do not exist; there is no host/tenant key beyond `org_id`. Isolation tests are source-string checks, not two-JWT live RLS. Causey does **not** enforce FERPA; it enforces membership RLS, aggregate district rollups, and a privacy-page disclaimer.

## Keep
- Portal/org reads use `createServerSupabaseClient()` (user JWT + RLS), not the service role (`lib/data/portal.ts`).
- `is_platform_admin()` takes no profile id; `/admin` layout + server actions call `getPlatformAdminUser()`; `search_platform_users` re-checks the RPC (`0015`, `0058`, `app/admin/layout.tsx`).
- District rollups/activity are `SECURITY DEFINER` and abort unless `is_district_admin(p_district_id, auth.uid())` (`0018` `get_district_school_rollup`, `0046` `get_district_hosted_rollup`, `0060` `get_district_admin_activity`).
- App report reads fail closed (`lib/data/district.ts`, `tests/district-data-fail-closed.test.ts`); CSV is `private, no-store` and district CSV is aggregates only (`app/orgs/[slug]/reports/export/route.ts`).
- `0025`: no self-serve districts; type/`parent_org_id` locked after insert except platform admin; no student/`school_admin` on districts; join codes exclude districts.
- `0037`/`0038`: anon search is public+published only; unpublished/restricted policies are `TO authenticated`.
- `0035`/`0041`: `is_org_coach` ≠ assistant; mutations use `can_operate_org_competitions`.
- `0044`: membership SELECT is own/parent/staff (not every teammate); join-code rejoin demotes removed staff; notification hrefs must be app-local; `get_org_roster` authorizes before projecting.
- `0045` `create_district_school` is the intended provision path and checks `is_district_admin`.
- `email_outbox` revoked from `anon`/`authenticated`; claim RPC is `TO service_role`.
- Cron uses timing-safe `CRON_SECRET`; missing secret → 401.
- CSP + `X-Frame-Options: DENY` + HSTS in production (`next.config.ts`). Privacy page states Causey does not claim FERPA/COPPA.

## Findings
1. **District hitchhike via `parent_org_id` INSERT** · Unlocked coaches may `INSERT` `type='school'` with any district UUID; `orgs_insert_coach_or_platform_admin` (`0025`) only checks `created_by` + `type <> 'district'`. `validate_organization_parent` (`0018`) only checks type/parent-kind, not caller authority. `create_district_school` (`0045`) is correct but optional. Public `competitions.org_id` on a district-hosted listing leaks that UUID. Rogue-school members then satisfy `can_view_competition` district-audience (`0028`: `school.parent_org_id = coalesce(host.parent_org_id, host.id)`). Custom portals will make district IDs even more visible. · **P0** · **S**

2. **Custom district portals have no isolation model** · Product target requires per-district portals. Code has one Next app, slug routing, and org RLS. No hostname→tenant map, no tenant claim in JWT, no separate CSP/cookie domain. A portal built on `getServiceRoleClient()` or unscoped admin reads would see every district. · **P0** · **L**

3. **No live two-tenant RLS job** · `tests/multi-district-isolation.test.ts` / lifecycle / fail-closed tests `readFileSync` SQL/TS. `tests/sql/0044_database_security_remediation.sql` is one school + attacker, then `rollback` — not District A JWT vs District B, not Club A roster vs Club B. A regression in `can_administer_org` / `can_view_competition` can ship. · **P1** · **M**

4. **`consume_rate_limit` is an anon-callable definer with a client-chosen `p_actor_key`** · `0062`/`0066` grant execute to `anon, authenticated`. App sends `user:${id}` or `ip:${sha256}` (`lib/rate-limit.ts`). Direct PostgREST can increment `user:<uuid>` (DoS CSV/join/claim for that user) or unique keys (does not bypass Next, but the RPC is not bound to `auth.uid()`). · **P1** · **S**

5. **SECURITY DEFINER membership oracles still in `public` (SEC-03 deferred in `0016`)** · `is_org_staff` / `is_org_admin` / `is_district_admin` / `can_administer_org` granted to `authenticated` (`0018`, `0038`). `is_active_member` has no later `revoke` from `public`/`anon`. Anyone with org/profile UUIDs can boolean-probe membership without reading rows. Needed for RLS expressions; still a 20k enumeration aid. · **P1** · **M**

6. **Production CSP allows `'unsafe-inline'` scripts** · `next.config.ts` `script-src 'self' 'unsafe-inline'` (and `'unsafe-eval'` off prod). XSS on any origin page can steal the Supabase auth cookie and act as that user across orgs they belong to. `img-src https:` is any HTTPS (covers). No nonce/hash policy. · **P1** · **M**

7. **District office can read named child-school rosters; reports are aggregate only in the UI** · `get_org_roster` / `get_org_season_attendance` (`0065`) authorize `can_administer_org`, which is true for the parent district admin (`0028`). RPC returns `display_name`, `age_band`, `grade`, `credential_ids`. CSV for districts stays counts (`0046` + export route). That is **not** FERPA; it is “counts in Reports, names via RPC/PostgREST.” `create_district_school` also inserts the operator as `school_admin` on the child. · **P1** · **M**

8. **Platform admin is global god-mode; founders are hardcoded emails** · `platform_admins_select_all_*` (`0015`) + `/admin` directory (`search_platform_users` joins `auth.users` email). One compromised platform admin sees every club roster and every district. Super-admin grant is migration-only (`0058`); seed emails `adam.mophat@gmail.com` / `mcausey.th@gmail.com`. No per-district operator-admin. `lib/data/admin.ts` does not re-check admin (relies on RLS/RPC). · **P1** · **M**

9. **Public comments expose `user_id` to anon** · `0066`: `grant select` on `competition_comments` to `anon`; policy is `exists (competitions c where c.id = competition_id)` (nested competitions RLS, so restricted events stay closed if that nesting holds). Public event comments still leak profile UUIDs, which feed finding 4. Insert is similarly existence-based, not `can_view_competition()` by name. · **P1** · **S**

10. **Service role lives in the Next app and in a shared client module** · `getServiceRoleClient()` in `lib/supabase/client.ts` (same file as the public anon factory; comment says scripts-only). Used by `lib/email/enqueue.ts` / `delivery.ts` (cron) and all scrapers. Correctly not used for org portal reads. A future custom-portal or server action that imports it bypasses RLS for all tenants. · **P1** · **S**

11. **Club isolation is membership-scoped, not a paid-tenant key** · `memberships_select_own_or_staff` + `get_org_roster` org_id check (`0044`/`0065`) keep Club A staff off Club B rosters. There is no billing/entitlement predicate in RLS. A person in both clubs sees both; platform admin sees all. Fine for shared-shell clubs; not a separate SaaS tenant. · **P2** · **M**

12. **`orgs_update_operator` `WITH CHECK (true)`** · `0044`: USING is operator/admin; WITH CHECK is unrestricted. Triggers lock `type`, `parent_org_id`, `id`, `created_by`, join-code columns. Other columns (name, slug, settings, possibly verification-adjacent fields unless separately triggered) trust USING only. Residual confused-deputy risk if a new column is added without a guard. · **P2** · **S**

13. **Abuse controls are app-path only** · Join-code 0.15s sleep + 10/min (`0025`, `lib/rate-limit.ts`). Direct PostgREST still hits RLS without those buckets. `nearest_zip` is granted to anon (`0066`). Fine for honest UI; not a WAF. · **P2** · **M**

## Must-build before go-live
1. **Reject unauthorized `parent_org_id` on INSERT** (and keep UPDATE locked): require `is_district_admin(parent, auth.uid())` or `is_platform_admin()`, or force parent only through `create_district_school`. Add a live SQL test: Coach C JWT cannot attach a school under District B; after a blocked attempt, C cannot `can_view_competition` B’s district-audience events.
2. **CI live RLS with two district JWTs and two club JWTs** (roster, announcements, attendance, `get_org_roster`, reports, district-audience events, CSV). String tests stay as lint, not the gate.
3. **Tenant contract for custom portals**: every portal query filtered by resolved `district_id`; never service role for district data; cookie/host binding so Portal A session cannot call Portal B’s slug; document that today’s isolation is `org_id` RLS only.
4. **Bind `consume_rate_limit` to `auth.uid()` / server-derived IP**; stop trusting `p_actor_key` from the caller (or revoke anon execute and wrap in a server-only RPC).
5. **Finish SEC-03**: move definer helpers to an unexposed schema (or `REVOKE EXECUTE` from `PUBLIC`/`authenticated` except via policy owner) so `is_org_staff(other_org, other_user)` is not a login oracle.
6. **CSP**: nonce or hashes; drop `'unsafe-inline'` on `script-src` in production.
7. **Decide and enforce district named-data**: either block `get_org_roster` for parent district admins (aggregates only, matching Reports) or treat named child-school roster as in-scope and put it in the DPA — do not imply FERPA either way.
8. **Platform-admin blast radius**: break-glass, session timeout, no shared founder password story, rotate if those migration emails are production; do not put custom-portal PII behind the same global admin without audit.

## Open questions for the owner
- Custom-portal tenancy: separate host + cookie domain per district, or one app with slug + RLS only? That choice is the isolation SLA.
- May a district office legally see named students at child schools (`get_org_roster`), or must central office stay counts-only?
- Is a district UUID considered public (it already appears as `competitions.org_id` on public listings)? If yes, finding 1 is exploitable without insider access whenever a district hosts a public event.
