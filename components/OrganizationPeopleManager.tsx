"use client";

import { ChangeEvent, FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  bulkInviteOrganizationMembers,
  inviteOrganizationMember,
} from "@/lib/actions/district";
import { ORG_ROLE_LABELS, type OrgMemberRole } from "@/lib/auth/orgs";
import type { OrgInvitationRow } from "@/lib/data/district";

const INVITABLE_ROLES: OrgMemberRole[] = [
  "student",
  "assistant_coach",
  "coach",
  "school_admin",
  "district_admin",
];

export function OrganizationPeopleManager({
  orgId,
  orgSlug,
  orgType,
  invitations,
}: {
  orgId: string;
  orgSlug: string;
  orgType: string;
  invitations: OrgInvitationRow[];
}) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [role, setRole] = useState<OrgMemberRole>("student");
  const [csv, setCsv] = useState("");
  const [filename, setFilename] = useState("");
  const [pending, setPending] = useState<"single" | "bulk" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [claimPath, setClaimPath] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function inviteOne(event: FormEvent) {
    event.preventDefault();
    setPending("single");
    setError(null);
    setMessage(null);
    setClaimPath(null);
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
          result.failed.length ? `; ${result.failed.length} rows need correction` : ""
        }.`
      );
      setCsv("");
      setFilename("");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  const availableRoles = INVITABLE_ROLES.filter(
    (candidate) => candidate !== "district_admin" || orgType === "district"
  );

  return (
    <div className="grid gap-10 lg:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
      <div className="space-y-10">
        <form onSubmit={inviteOne}>
          <h2 className="font-display text-xl font-bold text-foreground">
            Invite one person
          </h2>
          <p className="mt-2 text-sm text-muted">
            They claim their own account from an expiring link. Causey never
            creates or shares a password for them.
          </p>
          <div className="mt-5 grid gap-4">
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
                onChange={(event) => setRole(event.target.value as OrgMemberRole)}
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

        <form onSubmit={importCsv} className="section-rule pt-8">
          <h2 className="font-display text-xl font-bold text-foreground">
            Import a roster
          </h2>
          <p className="mt-2 text-sm text-muted">
            Upload up to 500 rows with <strong>email</strong>, optional{" "}
            <strong>name</strong>, and optional <strong>role</strong> columns.
          </p>
          <input
            className="field mt-5"
            type="file"
            accept=".csv,text/csv"
            onChange={loadCsv}
            required
          />
          <button
            type="submit"
            disabled={!csv || pending !== null}
            className="cta-enabled mt-3 disabled:opacity-60"
          >
            {pending === "bulk" ? "Creating invitations…" : "Import CSV"}
          </button>
        </form>

        {message ? (
          <div className="rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm text-foreground">
            <p className="font-semibold">{message}</p>
            {claimPath ? (
              <p className="mt-1 break-all text-xs text-muted">
                Email delivery is waiting on the Resend connection. Temporary
                claim path: <code>{claimPath}</code>
              </p>
            ) : null}
          </div>
        ) : null}
        {error ? (
          <p className="text-sm font-medium text-brand-red" role="alert">
            {error}
          </p>
        ) : null}
      </div>

      <section>
        <div className="flex items-baseline justify-between gap-3">
          <h2 className="font-display text-xl font-bold text-foreground">
            Invitation status
          </h2>
          <span className="text-xs text-muted">{invitations.length} recent</span>
        </div>
        {!invitations.length ? (
          <p className="mt-4 text-sm text-muted">
            No invitations yet. Invite staff first, then students.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {invitations.map((invitation) => (
              <li
                key={invitation.id}
                className="grid gap-1 py-3 sm:grid-cols-[minmax(0,1fr)_auto] sm:items-center sm:gap-4"
              >
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-foreground">
                    {invitation.display_name || invitation.email}
                  </p>
                  <p className="truncate text-xs text-muted">
                    {invitation.display_name ? `${invitation.email} · ` : ""}
                    {ORG_ROLE_LABELS[invitation.role]}
                  </p>
                </div>
                <span className="text-xs font-semibold text-muted-strong">
                  {invitation.status === "pending" &&
                  new Date(invitation.expires_at) <= new Date()
                    ? "Expired"
                    : invitation.status.charAt(0).toUpperCase() +
                      invitation.status.slice(1)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
