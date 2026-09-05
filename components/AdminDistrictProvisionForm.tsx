"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  adminProvisionDistrict,
  type DistrictProvisionPack,
} from "@/lib/actions/admin";
import { formatActivationCode } from "@/lib/invitations/activation-code";

const STATES = [
  "AL","AK","AZ","AR","CA","CO","CT","DE","FL","GA","HI","ID","IL","IN","IA",
  "KS","KY","LA","ME","MD","MA","MI","MN","MS","MO","MT","NE","NV","NH","NJ",
  "NM","NY","NC","ND","OH","OK","OR","PA","RI","SC","SD","TN","TX","UT","VT",
  "VA","WA","WV","WI","WY","DC",
];

function formatExpiry(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "in 7 days";
  return date.toLocaleDateString(undefined, {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function CopyRow({
  label,
  value,
  hint,
  mono,
}: {
  label: string;
  value: string;
  hint?: string;
  mono?: boolean;
}) {
  const [status, setStatus] = useState<string | null>(null);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setStatus("Copied.");
    } catch {
      setStatus("Copy failed — select the text above instead.");
    }
  }

  return (
    <div>
      <p className="text-xs font-semibold text-muted-strong">{label}</p>
      <p
        className={`mt-1 break-all rounded-md border border-line bg-white px-3 py-2 text-sm text-foreground ${
          mono ? "font-mono tracking-[0.18em]" : ""
        }`}
      >
        {value}
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={copy}
          className="rounded-md border border-line bg-white px-3 py-1.5 text-xs font-semibold text-foreground transition-colors hover:border-brand-red/30 hover:text-brand-red"
        >
          Copy {label.toLowerCase()}
        </button>
        {status ? (
          <span className="text-xs text-muted" role="status">
            {status}
          </span>
        ) : null}
      </div>
      {hint ? <p className="mt-2 text-xs text-muted">{hint}</p> : null}
    </div>
  );
}

export function AdminDistrictProvisionForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [state, setState] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [contactName, setContactName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pack, setPack] = useState<DistrictProvisionPack | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setPack(null);
    setPending(true);
    try {
      const result = await adminProvisionDistrict({
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

  if (pack) {
    const claimUrl = pack.invitation
      ? new URL(pack.invitation.claimPath, window.location.origin).toString()
      : null;

    return (
      <div className="flex flex-col gap-5">
        <div>
          <p className="text-sm font-semibold text-foreground">
            {pack.name} is provisioned
          </p>
          <p className="mt-1 text-sm text-muted">
            Send the district administrator either the link or the code. Both
            open the same invitation, and both require them to sign in with{" "}
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
                district&rsquo;s People page. Expires{" "}
                {formatExpiry(pack.invitation.expiresAt)}.
              </p>
            </div>

            <CopyRow
              label="Claim link"
              value={claimUrl}
              hint="Best for email. Opens the invitation directly."
            />
            <CopyRow
              label="Activation code"
              value={formatActivationCode(pack.invitation.activationCode ?? "")}
              mono
              hint="Best for a phone call. They enter it at /claim."
            />
          </>
        ) : (
          <div className="rounded-xl border border-brand-red/30 bg-white p-4">
            <p className="text-sm font-semibold text-foreground">
              District created, but the invitation did not send
            </p>
            <p className="mt-1 text-sm text-muted-strong">
              {pack.invitationError ??
                "Could not create the district administrator invitation."}{" "}
              Invite the district administrator from the district&rsquo;s People
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
            Provision another district
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          District name
        </span>
        <input
          className="field"
          required
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder="Moffat County School District"
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
            Contact name (optional)
          </span>
          <input
            className="field"
            value={contactName}
            onChange={(event) => setContactName(event.target.value)}
            placeholder="Dana Reyes"
          />
        </label>
      </div>
      <label className="flex flex-col gap-1">
        <span className="text-xs font-semibold text-muted-strong">
          District administrator email
        </span>
        <input
          className="field"
          type="email"
          required
          value={contactEmail}
          onChange={(event) => setContactEmail(event.target.value)}
          placeholder="dana.reyes@moffat.k12.co.us"
        />
        <span className="text-xs text-muted">
          The invitation is bound to this address. Use the person who will run
          the program, not a shared inbox.
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
        {pending ? "Provisioning…" : "Provision district"}
      </button>
    </form>
  );
}
