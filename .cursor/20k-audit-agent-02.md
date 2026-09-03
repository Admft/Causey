# Agent 2 — District custom portals

## Scope covered

`.cursor/20k-full-audit-roles.md`; district skill + `workflows.md` + `out-of-scope.md`; `.cursor/district-readiness.md`; `.cursor/multi-district-rollout.md`; `docs/district-feature-overview.md`; `docs/district-pilot-runbook.md`; `docs/district-pilot-january.tex`; `app/districts/page.tsx`; `app/orgs/page.tsx`; `app/orgs/[slug]/page.tsx` plus settings/people/competitions/reports/activity and `reports/export/route.ts`; `app/orgs/new/page.tsx`; `app/admin/organizations/page.tsx`; `components/OrgSubnav.tsx`, `OrganizationSettingsForm.tsx`, `OrgCreateForm.tsx`, `AdminOrganizationForm.tsx`, `SiteHeader.tsx`; `app/layout.tsx`; `proxy.ts`; `next.config.ts`; `vercel.json`; `lib/district-readiness.ts`; `lib/data/district.ts`; `lib/data/portal.ts` (`getMyOrgs`, `getOrgBySlugForViewer`, `getOrgCompetitionWorkspace`); `lib/org-permissions.ts`; `lib/auth/orgs.ts`; `lib/competition-audience.ts`; `lib/actions/orgs.ts`; migrations `0010`, `0018`, `0025`, `0028`, `0045`, `0046`, `0060`, `0065`; `tests/multi-district-isolation.test.ts`. Grep: `parent_org_id`, `is_district_admin`, feature flag, white-label, custom domain, tenant.

## Verdict

**Missing.** Assisted multi-district tenancy is real in the **shared** `/orgs/[slug]` Causey shell: platform-provisioned district rows, `parent_org_id` child schools, `is_district_admin(p_district_id, …)` and exact-district RPCs for readiness/reports/CSV/activity. A district **cannot** have a distinct portal today—no custom domain, no tenant branding beyond a website URL, no feature-flag table, no per-district workflow registry, no contract/SLA for a private portal. Clubs and districts already share one hostname, one session cookie, one chrome, and one globally unique slug space. Bolting “custom features” onto slug or type `if`s without a UUID-keyed tenant config would leak District A into District B at 20k. Live two-district isolation is still **unknown / fail-closed** (static tests + runbook §7; ops smoke not proven in-repo).

## Keep

- Platform-only district create (`0025` insert policy; `OrgCreateForm` strips `district`; `AdminOrganizationForm` / `adminCreateOrganization`).
- Hierarchy + governance lock: `parent_org_id`, `validate_organization_parent`, `guard_organization_governance` (type/parent not staff-editable).
- Exact-district authority: `is_district_admin` in `0028`; child-school authority via that school’s parent id; atomic `create_district_school` (`0045`).
- Exact-district reads: `get_district_school_rollup` / `get_district_hosted_rollup` (`0046`), `get_district_admin_activity` (`0060`); fail-closed `getDistrictPilotReadiness` / `getDistrictParticipationReport`.
- Shared district IA that already differs from clubs: `DISTRICT_TABS` (Schools / District staff / Reports / Activity), no district student roster, district-hosted vs school-hosted reports.
- Audience rule: `district` only for a district host or a school with `parent_org_id` (`lib/competition-audience.ts`).
- Isolation tests that **assert source contains exact `p_district_id` / `parent_org_id`**, not a new tenancy model.
- Single public hostname honesty in the runbook (`app.causey.dev`) until a portal product is actually specified.

## Findings

1. **Host routing · no custom domain / tenant resolver ·** Every request is one Causey origin. `proxy.ts` only refreshes the Supabase session; `next.config.ts` has no host rewrites; `vercel.json` is crons only; runbook §10: “Use one public hostname: `https://app.causey.dev`.” At 20k a district portal on `competitions.<district>.…` or a vanity subdomain has nowhere to bind. An unbound host would either 404 everyone or serve the **wrong** tenant. · **P0** · **L**

2. **Tenant config · no feature flags, entitlements, or portal registry ·** Grep finds no `feature_flag`, white-label, `custom_domain`, `tenant_id`, `district_config`, or entitlement table. `Organization` (`lib/auth/orgs.ts`) is name/slug/type/state/parent/owner/verification/join_code/`website_url`/`meeting_note`. Custom features have no allowlist keyed by district UUID, so the only implementation path today is global code or `if (slug === …)`—that is how A’s module appears in B’s workspace. · **P0** · **L**

3. **IA · districts are rows in the mixed `/orgs` shell, not a portal ·** `getMyOrgs` returns every membership (district, school, club, team). `app/orgs/page.tsx` lists them with clubs (“Districts, schools, and clubs”) and one primary CTA. Staff who belong to two districts plus a paying club see **all names and slugs** in one Causey chrome. A custom portal that still lands on `/orgs` leaks the other tenant’s existence. · **P0** · **M**

4. **Routing · globally unique slugs, not tenant-prefixed URLs ·** `organizations.slug` is `unique` (`0010`); `competitions.slug` is globally unique (`0001`). Workspaces are `/orgs/[slug]`; events are `/event/[slug]` on the public host (`proxy.ts` `PUBLIC_GET_PREFIXES`). Two districts cannot both have `/events/fall-open`; guessing a slug is an enumeration surface; custom event URLs are not host-scoped. · **P0** · **M**

5. **Theming · global Causey chrome only ·** `app/layout.tsx` always renders `SiteHeader` + Causey wordmark + shared footer; `metadataBase` / `siteName` are Causey; `app/globals.css` `@theme` is one token set. Org settings expose `website_url` / `meeting_note` (`0065`, `OrganizationSettingsForm`)—a link, not a brand overlay. No `app/orgs/[slug]/layout.tsx` to scope tokens. A district “portal” still looks and SEO-titles as Causey. · **P1** · **M**

6. **Feature matrix · type-hardcoded, identical for every district ·** `OrgSubnav` switches `DISTRICT_TABS` vs `TABS` on `orgType === "district"` only. `getDistrictReadinessAction` is one pipeline for all districts. Reports/activity exist because `type === "district"`, not because a contract enabled them. There is no per-district matrix (e.g. district-wide hosting on, STEM results export off). Custom workflows cannot be sold or disabled without a new table + server gate. · **P0** · **L**

7. **Session · no active tenant ·** `Profile` (`lib/auth/types.ts`) has no `tenant` / `active_org_id`. One auth cookie on the Causey host. Dual-district staff and club coaches share chrome, `/me`, `/family`, and `/event`. A custom feature that reads “the current org” from the URL slug without re-checking `is_district_admin(requested_id)` will serve A’s data in B’s tab. · **P0** · **M**

8. **Custom workflows · no plugin registry; forking the shared shell leaks ·** Readiness, announcements fan-out, connected-school invites, and district-hosted rollups are **one** implementation. There is no module table `(district_id, feature_key, config jsonb)` and no fail-closed “unknown feature.” District-specific code in shared pages (`/orgs/[slug]/*`) ships to every tenant on the next deploy. · **P0** · **L**

9. **Shared origin God views · platform admin + public pitch on the same host ·** `/admin/organizations` loads **every** district’s readiness map (`getDistrictPilotReadiness` per district id). `/districts` is a single marketing pitch (chess-assisted, no partner names). A custom-host portal that still mounts `app/layout.tsx` + `/admin` would show Causey ops and other tenants. CSP `form-action 'self'` and HSTS `includeSubDomains` (`next.config.ts`) also assume one origin family. · **P1** · **M**

10. **Isolation substrate is ID-keyed and must stay that way ·** Child-school SELECT uses `is_district_admin(parent_org_id)`; rollups/activity/CSV take `p_district_id` and reject unauthorized (`0046`, `0060`, export route `view.org.id`). Static N=2 tests only grep that pattern. Custom features that query by slug, name, or “all districts of this user” bypass it. Live bidirectional smoke is **unknown / fail-closed** (runbook §7, `.cursor/multi-district-rollout.md` Active 1). · **P0** · **M** (ops proof) / **keep the RPC pattern**

11. **Contracts · no custom-portal SLA or feature exhibit ·** January brief and `/districts` explicitly exclude a finished price, contract, or SLA. Skill `out-of-scope.md` same. Nothing in schema or settings records which modules a district bought. At 20k, sales can promise a portal that engineering cannot isolate or support. · **P0** · **S** (legal + a config row)

12. **January 2027 brief ≠ custom portals ·** `docs/district-pilot-january.tex` promises the **same** Causey workflow on `https://app.causey.dev` for every type; it does not promise white-label, custom domains, or per-district feature packs. Shipping custom portals without revising that brief (or treating January as shared-shell only) is a product/legal fork, not a UI tweak. · **P1** · **S**

13. **Brand fields are not a portal ·** `website_url` (https, 8–200 chars) and `meeting_note` (≤280) are member-visible org about copy. Using them as a “portal” would still run Causey IA, Causey search, and global `/event` URLs. · **P2** · **S**

14. **Slug collision / enumeration at district scale ·** School create requires a globally unique slug (`0045` regex + unique column). Two districts cannot both provision `lincoln-elementary`. Staff who know another district’s slug and are not members get `notFound()` only if RLS hides the row (`orgs_select_member_owner_or_parent` in `0028`)—correct for the shared shell, insufficient once a custom host should never even resolve B’s slug. · **P1** · **M**

## Must-build before go-live

1. **Tenant registry keyed by district UUID** (not slug): allowed hosts, brand token overlay, contract id, feature allowlist JSON. Unknown host → fail closed (no default tenant).
2. **Host resolver in `proxy.ts`**: bind `Host` → `district_id` for the request; never serve `/admin`, `/clubs`, or another district’s `/orgs/[slug]` on a custom host.
3. **Portal IA separate from club `/orgs`**: district-staff home that lists **that** district’s schools only; no mixed club/other-district directory on a custom host. Shared `app.causey.dev` may keep `/orgs` as a switcher with an explicit tenant picker.
4. **Tenant layout + token overlay**: `app/orgs/[slug]/layout.tsx` or host-scoped layout that can swap logo/name/colors **without** forking `globals.css` or hiding `EarlyBuildBanner` honesty on the public Causey site.
5. **Feature matrix + server gate**: allowlisted keys only; every custom module checks `district_id` + flag **and** `is_district_admin` / existing exact-district RPCs. Ban `if (slug === …)` and global env flags.
6. **Custom workflows as registered modules** with `org_id` / `p_district_id` on every query (reuse `0045`/`0046`/`0060` pattern). No cross-tenant “list all my districts’ special reports” without per-id authorization.
7. **URL tenancy**: either host-bound routes or `/d/[tenant]/…` prefixes; do not put district-private events only in the global `/event/[slug]` unique index without host checks.
8. **Cookie/session isolation**: custom host = host-only cookie; shared host = explicit active-district in session. Dual-district + paid-club accounts must not inherit the other tenant’s chrome or data.
9. **Cache/CDN/CSP**: cache keys include `district_id`; extend CSP/`form-action`/HSTS for named custom hosts only after the registry says so.
10. **Written custom-portal exhibit**: which features are shared product vs paid custom; DNS/certs owner; support hours. Do not invent FERPA certification; do record the portal SLA the owner actually signs.

## Open questions for the owner

1. **Custom portal SLA:** vanity subdomain (`*.causey.dev`) vs full white-label district DNS, who holds certs, uptime target, and whether that is in the January 2027 written agreement or a later paid exhibit.
2. **January vs 20k target:** the January brief promises a **shared** Causey district workspace, not white-label. Is custom portal in-scope for January go-live, or is January the shared `/orgs/[slug]` shell with custom portals a separate SKU?
3. **Custom features = configuration or code?** A checked matrix on the shared product (safe) vs per-district engineered workflows (needs the registry + isolation gates above, and a rule that A’s module never ships in B’s bundle).
4. **One login across a paying club and two district portals?** If yes, tenant switcher + host isolation are mandatory; if no, identity must refuse cross-tenant sessions (owned with Agent 3, but the portal product must choose).
