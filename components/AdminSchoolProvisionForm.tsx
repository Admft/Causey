"use client";

import Link from "next/link";
import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminProvisionDistrictSchool,
  type SchoolProvisionPack,
} from "@/lib/actions/admin";
import {
  AdminInvitationCopyRow,
  formatInvitationExpiry,
} from "@/components/AdminInvitationCopyRow";
import { formatActivationCode } from "@/lib/invitations/activation-code";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

export type SchoolProvisionDistrictOption = {
  id: string;
  name: string;
  state: string | null;
};

export function AdminSchoolProvisionForm({
  districts,
}: {
  districts: SchoolProvisionDistrictOption[];
}) {
  const router = useRouter();
  const [districtId, setDistrictId] = useState(districts[0]?.id ?? "");
  const [name, setName] = useState("");
  const [state, setState] = useState(districts[0]?.state ?? "");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<SchoolProvisionPack | null>(null);
  const [pending, setPending] = useState(false);

  const selectedDistrict = useMemo(
    () => districts.find((district) => district.id === districtId) ?? null,
    [districts, districtId]
  );

  function onDistrictChange(nextId: string) {
    setDistrictId(nextId);
    const next = districts.find((district) => district.id === nextId);
    if (next?.state) setState(next.state);
  }

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPack(null);
    setPending(true);
    try {
      const result = await adminProvisionDistrictSchool({
        districtId,
        name,
        state,
        contactEmail,
        contactName,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setPack(result);
      setName("");
      setContactEmail("");
      setContactName("");
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  if (!districts.length) {
    return (
      <p className="text-sm text-muted">
        Provision a district first. Schools are children of a district office,
        not standalone accounts.
      </p>
    );
  }

  if (pack) {
    const claimUrl = pack.invitation
      ? new URL(pack.invitation.claimPath, window.location.origin).toString()
      : null;

    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {pack.name} is a school account
          </p>
          <p className="mt-1 text-sm text-muted">
            It sits under {pack.districtName}. Send the school administrator
            either the link or the code. Both require them to sign in with{" "}
            {pack.invitation?.email ?? "their invited email"} — a forwarded copy
            will not let anyone else in.
          </p>
        </div>

        {pack.invitation && claimUrl ? (
          <>
            <div className="rounded-xl border border-accent/25 bg-accent-soft/40 p-4">
              <p className="text-sm font-semibold text-foreground">
                Shown once
              </p>
              <p className="mt-1 text-sm text-muted-strong">
                Causey stores only hashes of these, so they cannot be shown
                again. If you lose them, reissue the invitation from the
                school&rsquo;s People page. Expires{" "}
                {formatInvitationExpiry(pack.invitation.expiresAt)}.
              </p>
            </div>

            <AdminInvitationCopyRow
              label="Claim link"
              value={claimUrl}
              hint="Best for email. Opens the invitation directly."
            />
            <AdminInvitationCopyRow
              label="Activation code"
              value={formatActivationCode(pack.invitation.activationCode ?? "")}
              mono
              hint="Best for a phone call. They enter it at /claim."
            />
          </>
        ) : (
          <div className="rounded-xl border border-brand-red/30 bg-white p-4">
            <p className="text-sm font-semibold text-foreground">
              School created, but the invitation did not send
            </p>
            <p className="mt-1 text-sm text-muted-strong">
              {pack.invitationError ??
                "Could not create the school administrator invitation."}{" "}
              Invite the school administrator from the school&rsquo;s People
              page.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-3">
          <Link href={`/orgs/${pack.slug}`} className="cta-enabled">
            Open {pack.name}
          </Link>
          <button
            type="button"
            onClick={() => setPack(null)}
            className="rounded-lg border border-line bg-white px-4 py-2 text-sm font-semibold text-foreground hover:border-brand-red/35 hover:text-brand-red"
          >
            Provision another school
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          District
        </span>
        <select
          className="field"
          required
          value={districtId}
          onChange={(event) => onDistrictChange(event.target.value)}
        >
          {districts.map((district) => (
            <option key={district.id} value={district.id}>
              {district.name}
              {district.state ? ` · ${district.state}` : ""}
            </option>
          ))}
        </select>
      </label>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          School name
        </span>
        <input
          className="field"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Lincoln Middle School"
        />
      </label>
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">State</span>
          <select
            className="field"
            required
            value={state}
            onChange={(event) => setState(event.target.value)}
          >
            <option value="">Select a state</option>
            {STATES.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">
            Administrator name (optional)
          </span>
          <input
            className="field"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder={selectedDistrict ? "Campus administrator" : ""}
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          School administrator email
        </span>
        <input
          className="field"
          type="email"
          required
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="principal@school.edu"
        />
        <span className="text-xs text-muted">
          The invitation is bound to this address. They create a staff account
          with their own password, then accept at /claim.
        </span>
      </label>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="cta-enabled w-fit disabled:opacity-60"
      >
        {pending ? "Provisioning…" : "Provision school"}
      </button>
    </form>
  );
}
