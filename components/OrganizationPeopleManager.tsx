"use client";

import Link from "next/link";
import { ChangeEvent, FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bulkInviteOrganizationMembers,
  inviteOrganizationMember,
  reissueOrganizationInvitation,
  type BulkInviteClaimRow,
} from "@/lib/actions/district";
import {
  ORG_ROLE_LABELS,
  type OrgMemberRole,
} from "@/lib/auth/orgs";
import { formatActivationCode } from "@/lib/invitations/activation-code";
import { invitationRoleFitsOrganization } from "@/lib/invitations/claim-path";
import type { OrgInvitationRow } from "@/lib/data/district";

const INVITABLE_ROLES: OrgMemberRole[] = [
  "student",
  "assistant_coach",
  "coach",
  "school_admin",
  "district_admin",
];

type InvitationBucket = "pending" | "expired" | "revoked" | "claimed";
type InvitationFilter = InvitationBucket | "all";

const INVITATION_FILTERS: { id: InvitationFilter; label: string }[] = [
  { id: "pending", label: "Pending" },
  { id: "revoked", label: "Revoked" },
  { id: "expired", label: "Expired" },
  { id: "claimed", label: "Claimed" },
  { id: "all", label: "All" },
];

function invitationBucket(invitation: OrgInvitationRow): InvitationBucket {
  if (invitation.status === "claimed") return "claimed";
  if (invitation.status === "revoked") return "revoked";
  if (
    invitation.status === "expired" ||
    (invitation.status === "pending" &&
      new Date(invitation.expires_at) <= new Date())
  ) {
    return "expired";
  }
  return "pending";
}

function invitationStatusLabel(invitation: OrgInvitationRow): string {
  const bucket = invitationBucket(invitation);
  return bucket.charAt(0).toUpperCase() + bucket.slice(1);
}

function invitationStatusClass(bucket: InvitationBucket): string {
  if (bucket === "pending") {
    return "rounded-full bg-accent-soft px-2 py-0.5 text-2xs font-semibold text-brand-red";
  }
  if (bucket === "revoked") {
    return "rounded-full bg-surface-soft px-2 py-0.5 text-2xs font-semibold text-muted";
  }
  if (bucket === "expired") {
    return "rounded-full bg-org-gold-soft px-2 py-0.5 text-2xs font-semibold text-org-gold-strong";
  }
  return "rounded-full bg-surface-soft px-2 py-0.5 text-2xs font-semibold text-ok";
}

function canReissueInvitation(invitation: OrgInvitationRow): boolean {
  if (invitation.status === "claimed") return false;
  if (invitation.status === "pending") return true;
  return invitation.status === "revoked" || invitation.status === "expired";
}

function claimsToCsv(claims: BulkInviteClaimRow[]): string {
  const header = "email,role,claim_path,expires_at";
  const rows = claims.map((claim) => {
    const path = claim.claimPath.includes(",")
      ? `"${claim.claimPath}"`
      : claim.claimPath;
    return `${claim.email},${claim.role},${path},${claim.expiresAt}`;
  });
  return [header, ...rows].join("\n");
}

export function OrganizationPeopleManager({
  orgId,
  orgSlug,
  orgType,
  invitations,
  rosterHref,
  defaultRole,
}: {
  orgId: string;
  orgSlug: string;
  orgType: string;
  invitations: OrgInvitationRow[];
  rosterHref?: string;
  defaultRole?: OrgMemberRole;
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<OrgMemberRole>(
    defaultRole ?? (orgType === "district" ? "coach" : "student")
  );
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [pending, setPending] = useState<"single" | "bulk" | string | null>(
    null
  );
  const [inviteFilter, setInviteFilter] = useState<InvitationFilter>(() =>
    invitations.some((invitation) => invitationBucket(invitation) === "pending")
      ? "pending"
      : "all"
  );
  const [message, setMessage] = useState<string | null>(null);
  const [claimPath, setClaimPath] = useState<string | null>(null);
  const [activationCode, setActivationCode] = useState<string | null>(null);
  const [bulkClaims, setBulkClaims] = useState<BulkInviteClaimRow[]>([]);
  const [failedRows, setFailedRows] = useState<
    { row: number; email: string; error: string }[]
  >([]);
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  async function copyText(value: string) {
    const absolute =
      typeof window !== "undefined" && value.startsWith("/")
        ? new URL(value, window.location.origin).toString()
        : value;
    try {
      await navigator.clipboard.writeText(absolute);
      setCopied(true);
      return true;
    } catch {
      setCopied(false);
      return false;
    }
  }

  async function inviteOne(event: FormEvent) {
    event.preventDefault();
    setPending("single");
    setError(null);
    setMessage(null);
    setClaimPath(null);
    setActivationCode(null);
    setBulkClaims([]);
    setFailedRows([]);
    setCopied(false);
    try {
      const result = await inviteOrganizationMember({
        orgId,
        orgSlug,
        email,
        displayName,
        role,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`Invitation created for ${email}.`);
      setClaimPath(result.claimPath);
      setActivationCode(result.activationCode);
      setEmail("");
      setDisplayName("");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function loadCsv(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;
    setFilename(file.name);
    setCsv(await file.text());
  }

  async function importCsv(event: FormEvent) {
    event.preventDefault();
    setPending("bulk");
    setError(null);
    setMessage(null);
    setClaimPath(null);
    setActivationCode(null);
    setBulkClaims([]);
    setFailedRows([]);
    setCopied(false);
    try {
      const result = await bulkInviteOrganizationMembers({
        orgId,
        orgSlug,
        csv,
        filename,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        `${result.invited} ${
          result.invited === 1 ? "invitation" : "invitations"
        } created${
          result.failed.length
            ? `; ${result.failed.length} ${
                result.failed.length === 1 ? "row needs" : "rows need"
              } correction`
            : ""
        }.`
      );
      setBulkClaims(result.claims);
      setFailedRows(result.failed);
      setCsv("");
      setFilename("");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function reissue(invitation: OrgInvitationRow) {
    setPending(invitation.id);
    setError(null);
    setMessage(null);
    setClaimPath(null);
    setActivationCode(null);
    setBulkClaims([]);
    setFailedRows([]);
    setCopied(false);
    try {
      const result = await reissueOrganizationInvitation({
        orgId,
        orgSlug,
        invitationId: invitation.id,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(`New claim link ready for ${result.email}.`);
      setClaimPath(result.claimPath);
      setActivationCode(result.activationCode);
      await copyText(result.claimPath);
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function copyClaimPath() {
    if (!claimPath) return;
    await copyText(claimPath);
  }

  async function copyActivationCode() {
    if (!activationCode) return;
    await copyText(formatActivationCode(activationCode));
  }

  async function copyBulkClaims() {
    if (!bulkClaims.length) return;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const lines = bulkClaims.map((claim) => {
      const absolute = origin
        ? new URL(claim.claimPath, origin).toString()
        : claim.claimPath;
      return `${claim.email}\t${ORG_ROLE_LABELS[claim.role]}\t${absolute}`;
    });
    try {
      await navigator.clipboard.writeText(lines.join("\n"));
      setCopied(true);
    } catch {
      setCopied(false);
    }
  }

  function downloadBulkClaims() {
    if (!bulkClaims.length) return;
    const blob = new Blob([claimsToCsv(bulkClaims)], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `causey-claim-links-${orgSlug}.csv`;
    anchor.click();
    URL.revokeObjectURL(url);
  }

  const availableRoles = INVITABLE_ROLES.filter((candidate) =>
    invitationRoleFitsOrganization(orgType, candidate)
  );
  const inviteCounts = useMemo(() => {
    const counts: Record<InvitationBucket, number> = {
      pending: 0,
      revoked: 0,
      expired: 0,
      claimed: 0,
    };
    for (const invitation of invitations) {
      counts[invitationBucket(invitation)] += 1;
    }
    return counts;
  }, [invitations]);
  const groupedInvitations = useMemo(() => {
    const groups: { bucket: InvitationBucket; label: string; rows: OrgInvitationRow[] }[] =
      [
        { bucket: "pending", label: "Pending", rows: [] },
        { bucket: "expired", label: "Expired", rows: [] },
        { bucket: "revoked", label: "Revoked", rows: [] },
        { bucket: "claimed", label: "Claimed", rows: [] },
      ];
    for (const invitation of invitations) {
      const bucket = invitationBucket(invitation);
      const group = groups.find((item) => item.bucket === bucket);
      group?.rows.push(invitation);
    }
    if (inviteFilter === "all") {
      return groups.filter((group) => group.rows.length > 0);
    }
    return groups.filter((group) => group.bucket === inviteFilter);
  }, [invitations, inviteFilter]);

  return (
    <div className="flex flex-col gap-10">
      <form id="invite-one" onSubmit={inviteOne} className="scroll-mt-24">
        <h2 className="text-sm font-semibold text-foreground">
          Create one claim invitation
        </h2>
        <p className="mt-1 text-sm text-muted">
          {orgType === "district" ? (
            "District invitations are for district staff. Create or open a school workspace for school administrators and students."
          ) : (
            <>
              Best for staff and one-off students. For a whole roster,{" "}
              <Link
                href={rosterHref ?? `/orgs/${orgSlug}/roster`}
                className="font-semibold text-brand-red hover:underline"
              >
                share the roster join link
              </Link>{" "}
              instead.
            </>
          )}
        </p>
        <div className="mt-5 grid gap-4 sm:max-w-md">
          <label>
            <span className="text-xs font-semibold text-muted-strong">Email</span>
            <input
              className="field mt-1"
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-muted-strong">
              Name (optional)
            </span>
            <input
              className="field mt-1"
              value={displayName}
              onChange={(event) => setDisplayName(event.target.value)}
              maxLength={100}
            />
          </label>
          <label>
            <span className="text-xs font-semibold text-muted-strong">Role</span>
            <select
              className="field mt-1"
              value={role}
              onChange={(event) =>
                setRole(event.target.value as OrgMemberRole)
              }
            >
              {availableRoles.map((candidate) => (
                <option key={candidate} value={candidate}>
                  {ORG_ROLE_LABELS[candidate]}
                </option>
              ))}
            </select>
          </label>
          <button
            type="submit"
            disabled={pending !== null}
            className="cta-enabled justify-self-start disabled:opacity-60"
          >
            {pending === "single" ? "Creating invitation…" : "Create invitation"}
          </button>
        </div>
      </form>

      {message ? (
        <div
          className="rounded-xl border border-accent/25 bg-accent-soft/40 p-4"
          role="status"
        >
          <p className="text-sm font-semibold text-foreground">{message}</p>
          {claimPath ? (
            <div className="mt-3">
              <p className="text-sm text-muted-strong">
                Causey queued the invitation email. School inboxes often filter
                it — copy this claim link
                {activationCode ? " and activation code" : ""} if the message
                does not arrive. They expire, and the person sets their own
                password. Staff can type the code at /claim.
              </p>
              <div className="mt-2 flex flex-wrap items-center gap-3">
                <code className="max-w-full break-all rounded-md border border-line bg-white px-2 py-1 text-xs text-foreground">
                  {claimPath}
                </code>
                <button
                  type="button"
                  onClick={copyClaimPath}
                  className="text-sm font-semibold text-brand-red hover:underline"
                >
                  {copied ? "Copied" : "Copy link"}
                </button>
              </div>
              {activationCode ? (
                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <code className="rounded-md border border-line bg-white px-2 py-1 font-mono text-xs tracking-[0.18em] text-foreground">
                    {formatActivationCode(activationCode)}
                  </code>
                  <button
                    type="button"
                    onClick={copyActivationCode}
                    className="text-sm font-semibold text-brand-red hover:underline"
                  >
                    Copy code
                  </button>
                </div>
              ) : null}
            </div>
          ) : null}
          {bulkClaims.length ? (
            <div className="mt-3">
              <p className="text-sm text-muted-strong">
                Causey queued the invitation emails. Copy or download these
                fallback claim links now — tokens are not recoverable after
                you leave this page.
              </p>
              <div className="mt-2 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={copyBulkClaims}
                  className="text-sm font-semibold text-brand-red hover:underline"
                >
                  {copied ? "Copied list" : "Copy all claim links"}
                </button>
                <button
                  type="button"
                  onClick={downloadBulkClaims}
                  className="text-sm font-semibold text-brand-red hover:underline"
                >
                  Download CSV
                </button>
              </div>
              <ul className="mt-3 max-h-48 overflow-auto divide-y divide-line border-y border-line">
                {bulkClaims.slice(0, 8).map((claim) => (
                  <li key={`${claim.email}-${claim.claimPath}`} className="py-2">
                    <p className="truncate text-sm font-semibold text-foreground">
                      {claim.email}
                    </p>
                    <p className="truncate text-xs text-muted">
                      {ORG_ROLE_LABELS[claim.role]} · {claim.claimPath}
                    </p>
                  </li>
                ))}
              </ul>
              {bulkClaims.length > 8 ? (
                <p className="mt-2 text-xs text-muted">
                  Showing 8 of {bulkClaims.length}. Use copy or download for the
                  full set.
                </p>
              ) : null}
            </div>
          ) : null}
          {failedRows.length ? (
            <div className="mt-3">
              <p className="text-sm font-semibold text-foreground">
                Rows that need correction
              </p>
              <ul className="mt-2 max-h-48 overflow-auto divide-y divide-line border-y border-line">
                {failedRows.map((failure) => (
                  <li key={`${failure.row}-${failure.email}`} className="py-2">
                    <p className="text-sm font-semibold text-foreground">
                      Row {failure.row}
                      {failure.email ? ` — ${failure.email}` : ""}
                    </p>
                    <p className="text-xs text-muted">{failure.error}</p>
                  </li>
                ))}
              </ul>
              <p className="mt-2 text-xs text-muted">
                Fix these rows in the CSV, then import the file again. Rows
                that already created an invitation do not need to be resent.
              </p>
            </div>
          ) : null}
          {!claimPath && !bulkClaims.length && !failedRows.length ? (
            <p className="mt-1 text-sm text-muted">
              The invitation is recorded. Reissue it below to copy a fresh
              claim link.
            </p>
          ) : null}
        </div>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <section id="invitation-status" className="scroll-mt-24">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Invitation status
          </h2>
          <span className="text-xs text-muted">{invitations.length} recent</span>
        </div>
        {!invitations.length ? (
          <p className="mt-3 text-sm text-muted">
            {orgType === "district" ? (
              "No district staff invitations yet. School administrators and students are invited from their school workspace."
            ) : (
              <>
                No claim invitations yet. Most students should use the{" "}
                <Link
                  href={rosterHref ?? `/orgs/${orgSlug}/roster`}
                  className="font-semibold text-brand-red hover:underline"
                >
                  roster join link
                </Link>
                ; use claim invitations for staff.
              </>
            )}
          </p>
        ) : (
          <>
            <div
              className="mt-4 flex flex-wrap gap-2"
              role="group"
              aria-label="Filter invitations by status"
            >
              {INVITATION_FILTERS.map((filter) => {
                const count =
                  filter.id === "all"
                    ? invitations.length
                    : inviteCounts[filter.id];
                const selected = inviteFilter === filter.id;
                return (
                  <button
                    key={filter.id}
                    type="button"
                    aria-pressed={selected}
                    onClick={() => setInviteFilter(filter.id)}
                    className={`rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${
                      selected
                        ? "border-brand-red/40 bg-accent-soft text-brand-red"
                        : "border-line bg-white text-muted-strong hover:border-brand-red/30 hover:text-brand-red"
                    }`}
                  >
                    {filter.label}
                    <span className="ml-1 tabular-nums text-muted">{count}</span>
                  </button>
                );
              })}
            </div>
            {groupedInvitations.every((group) => !group.rows.length) ? (
              <p className="mt-3 text-sm text-muted">
                No {inviteFilter === "all" ? "" : `${inviteFilter} `}
                invitations in this list. Switch filters to find pending or
                revoked rows.
              </p>
            ) : (
              <div className="mt-4 grid gap-6">
                {groupedInvitations.map((group) => (
                  <div key={group.bucket}>
                    {inviteFilter === "all" ? (
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-strong">
                        {group.label}
                        <span className="ml-1 tabular-nums font-medium text-muted">
                          {group.rows.length}
                        </span>
                      </h3>
                    ) : null}
                    <ul
                      className={
                        inviteFilter === "all"
                          ? "mt-2 divide-y divide-line border-y border-line"
                          : "divide-y divide-line border-y border-line"
                      }
                    >
                      {group.rows.map((invitation) => {
                        const bucket = invitationBucket(invitation);
                        const reissuable = canReissueInvitation(invitation);
                        return (
                          <li
                            key={invitation.id}
                            className="flex flex-wrap items-center justify-between gap-3 py-3"
                          >
                            <div className="min-w-0">
                              <p className="truncate text-sm font-semibold text-foreground">
                                {invitation.display_name || invitation.email}
                              </p>
                              <p className="truncate text-xs text-muted">
                                {invitation.display_name
                                  ? `${invitation.email} · `
                                  : ""}
                                {ORG_ROLE_LABELS[invitation.role]}
                              </p>
                            </div>
                            <div className="flex flex-wrap items-center gap-3">
                              <span className={invitationStatusClass(bucket)}>
                                {invitationStatusLabel(invitation)}
                              </span>
                              {reissuable ? (
                                <button
                                  type="button"
                                  disabled={pending !== null}
                                  onClick={() => reissue(invitation)}
                                  className="text-sm font-semibold text-brand-red hover:underline disabled:opacity-60"
                                >
                                  {pending === invitation.id
                                    ? "Reissuing…"
                                    : "Reissue & copy link"}
                                </button>
                              ) : null}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
        {invitations.some(canReissueInvitation) ? (
          <p className="mt-3 text-xs text-muted">
            Pending uses the red mark; revoked is gray. Reissue creates a
            fresh claim link and activation code and revokes the previous
            pending one. Causey queues a new email; copy the link or code if
            school mail does not arrive.
          </p>
        ) : null}
      </section>

      <details className="section-rule pt-8">
        <summary className="cursor-pointer text-sm font-semibold text-muted-strong">
          Import a CSV roster
        </summary>
        <form onSubmit={importCsv} className="mt-4 max-w-md">
          <p className="text-sm text-muted">
            Up to 500 rows with <strong>email</strong>, optional{" "}
            <strong>name</strong>, and{" "}
            {orgType === "district" ? (
              <>
                a required <strong>role</strong> column for district staff.
              </>
            ) : (
              <>
                an optional <strong>role</strong> column.
              </>
            )}{" "}
            After import, copy or download claim links immediately.
          </p>
          <label className="mt-4 block">
            <span className="text-xs font-semibold text-muted-strong">
              CSV roster file
            </span>
            <input
              className="field mt-1"
              type="file"
              accept=".csv,text/csv"
              onChange={loadCsv}
              required
            />
          </label>
          <button
            type="submit"
            disabled={!csv || pending !== null}
            className="cta-enabled mt-3 disabled:opacity-60"
          >
            {pending === "bulk" ? "Creating invitations…" : "Import CSV"}
          </button>
        </form>
      </details>
    </div>
  );
}
