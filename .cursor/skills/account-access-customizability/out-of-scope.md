# Account-access out of scope

Do not start these unless the user explicitly asks in this chat. Log them as **Out** in `.cursor/account-access-readiness.md`, not as Missing.

| Ask | Why not |
| --- | --- |
| Salesforce-style permission sets / custom roles / per-tab ACL | Causey grants **named roles + group/org scope**. A checkbox matrix is a different product and will desync from RLS. |
| Fourth signup type (“club owner”, “district admin”) | Owner and office access are **memberships**. Person accounts stay student / parent / coach. |
| Self-serve district or school create | Provisioning is ops. Coaches create club/team only. |
| Custom district portal, vanity DNS, per-tenant feature packs | Shared `/orgs` shell. Local `/portals` is layout only. |
| Parents as read-only staff to “just see reports” | Family desk is the parent product; district reports stay aggregate for the office. |
| Student changing `profiles.role` or `role_unlocked` | Escalation lockdown (`0016`). |
| Coach–parent DMs, dues, pairings, public club/school directory | Same as club/district buyer out-of-scope. |
| FERPA certification as a UI badge | Legal. Stay honest. |
