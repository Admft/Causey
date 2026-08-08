"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  transferOrganizationOwnership,
  updateOrganizationSettings,
} from "@/lib/actions/district";
import type { Organization, RosterRow } from "@/lib/auth/orgs";

const TYPE_LABELS = {
  school: "School",
  club: "Club",
  team: "Team",
  district: "District",
} as const;

export function OrganizationSettingsForm({
  org,
  staff,
  viewerId,
}: {
  org: Organization;
  staff: RosterRow[];
  viewerId: string;
}) {
  const router = useRouter();
  const [name, setName] = useState(org.name);
  const [state, setState] = useState(org.state ?? "");
  const [nextOwner, setNextOwner] = useState("");
  const [pending, setPending] = useState<"settings" | "owner" | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const ownerId = org.owner_profile_id ?? org.created_by;
  const eligibleOwners = staff.filter(
    (member) =>
      member.profile_id !== ownerId &&
      ["coach", "school_admin", "district_admin"].includes(member.member_role) &&
      member.member_status === "active"
  );

  async function save(event: FormEvent) {
    event.preventDefault();
    setPending("settings");
    setError(null);
    setMessage(null);
    try {
      const result = await updateOrganizationSettings({
        orgId: org.id,
        orgSlug: org.slug,
        name,
        state,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Organization settings saved.");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  async function transfer() {
    if (!nextOwner) return;
    setPending("owner");
    setError(null);
    setMessage(null);
    try {
      const result = await transferOrganizationOwnership({
        orgId: org.id,
        orgSlug: org.slug,
        nextOwnerProfileId: nextOwner,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Ownership transferred. The new owner now controls organization settings.");
      router.refresh();
    } finally {
      setPending(null);
    }
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      <form onSubmit={save}>
        <h2 className="font-display text-xl font-bold text-foreground">
          Organization details
        </h2>
        <div className="mt-5 grid gap-4">
          <label>
            <span className="text-xs font-semibold text-muted-strong">Name</span>
            <input
              className="field mt-1"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={80}
            />
          </label>
          <div>
            <p className="text-xs font-semibold text-muted-strong">Type</p>
            <p className="mt-1 text-sm font-medium text-foreground">
              {TYPE_LABELS[org.type]}
            </p>
            <p className="mt-1 text-xs text-muted">
              Organization type is fixed after creation because it controls
              access and district hierarchy.
            </p>
          </div>
          <label>
            <span className="text-xs font-semibold text-muted-strong">State</span>
            <input
              className="field mt-1 uppercase"
              value={state}
              onChange={(event) =>
                setState(event.target.value.toUpperCase().slice(0, 2))
              }
              required
              pattern="[A-Z]{2}"
            />
          </label>
          <button
            type="submit"
            disabled={pending !== null}
            className="cta-enabled justify-self-start disabled:opacity-60"
          >
            {pending === "settings" ? "Saving…" : "Save settings"}
          </button>
        </div>
      </form>

      <section>
        <h2 className="font-display text-xl font-bold text-foreground">
          Ownership
        </h2>
        <p className="mt-2 text-sm text-muted">
          Ownership controls settings and future transfers. Staff access is managed
          separately from the people workspace.
        </p>
        {ownerId !== viewerId ? (
          <p className="mt-5 text-sm text-muted">
            Only the current owner can transfer this organization.
          </p>
        ) : eligibleOwners.length ? (
          <div className="mt-5">
            <label>
              <span className="text-xs font-semibold text-muted-strong">
                New owner
              </span>
              <select
                className="field mt-1"
                value={nextOwner}
                onChange={(event) => setNextOwner(event.target.value)}
              >
                <option value="">Choose active staff</option>
                {eligibleOwners.map((member) => (
                  <option key={member.profile_id} value={member.profile_id}>
                    {member.display_name} · {member.member_role.replaceAll("_", " ")}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              onClick={transfer}
              disabled={!nextOwner || pending !== null}
              className="mt-3 rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-red/35 hover:text-brand-red disabled:opacity-60"
            >
              {pending === "owner" ? "Transferring…" : "Transfer ownership"}
            </button>
          </div>
        ) : (
          <p className="mt-5 text-sm text-muted">
            Invite another school or district administrator before transferring
            ownership.
          </p>
        )}
      </section>

      {message ? (
        <p className="rounded-xl border border-line bg-surface-soft px-4 py-3 text-sm font-medium text-foreground lg:col-span-2">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red lg:col-span-2" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
