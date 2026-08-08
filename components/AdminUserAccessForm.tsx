"use client";

import { FormEvent, useState, useTransition } from "react";
import { adminUpdateUserAccess } from "@/lib/actions/admin";

type AdminUserAccessRecord = {
  profile_id: string;
  account_role: "student" | "parent" | "coach";
  role_unlocked: boolean;
  platform_admin: boolean;
};

export function AdminUserAccessForm({
  user,
  isSelf,
  onUpdated,
}: {
  user: AdminUserAccessRecord;
  isSelf: boolean;
  onUpdated?: (
    accountRole: AdminUserAccessRecord["account_role"],
    platformAdmin: boolean
  ) => void;
}) {
  const [accountRole, setAccountRole] = useState(user.account_role);
  const [platformAdmin, setPlatformAdmin] = useState(user.platform_admin);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(event: FormEvent) {
    event.preventDefault();
    if (isSelf) return;

    const privilegeChanged =
      platformAdmin !== user.platform_admin ||
      accountRole !== user.account_role;
    if (!privilegeChanged) {
      setMessage("No access changes to save.");
      return;
    }

    const warning =
      platformAdmin !== user.platform_admin
        ? platformAdmin
          ? "Platform admin grants access to every Causey account and administration surface."
          : "This removes platform-wide administration from the account."
        : "This changes which account workspace the person uses.";
    if (!window.confirm(`${warning} Save this access change?`)) return;

    setMessage(null);
    setError(null);
    startTransition(async () => {
      const result = await adminUpdateUserAccess({
        profileId: user.profile_id,
        accountRole,
        platformAdmin,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      onUpdated?.(accountRole, platformAdmin);
      setMessage("Access updated and added to the admin audit log.");
    });
  }

  if (isSelf) {
    return (
      <p className="text-xs text-muted">
        Your own access is read-only here. Another platform administrator must
        change it.
      </p>
    );
  }

  return (
    <form onSubmit={submit} className="mt-4 grid gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <label>
          <span className="text-xs font-semibold text-muted-strong">
            Account experience
          </span>
          <select
            className="field mt-1"
            value={accountRole}
            onChange={(event) => {
              const next = event.target.value as
                | "student"
                | "parent"
                | "coach";
              setAccountRole(next);
            }}
            disabled={isPending}
          >
            <option value="student">Student</option>
            <option value="parent">Parent</option>
            <option value="coach">Coach / organizer</option>
          </select>
        </label>

        <label className="flex items-start gap-3 rounded-xl border border-line bg-surface-soft p-4">
          <input
            type="checkbox"
            checked={platformAdmin}
            onChange={() => setPlatformAdmin((current) => !current)}
            disabled={isPending}
            className="mt-1 size-4 accent-[var(--brand-red)]"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Platform administrator
            </span>
            <span className="mt-1 block text-xs text-muted">
              Full access to users, moderation, organizations, and tournaments.
            </span>
          </span>
        </label>
      </div>

      {!user.role_unlocked ? (
        <p className="text-xs font-medium text-brand-red">
          This account is restricted by the abuse-control kill switch. That
          control is not a grantable privilege.
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isPending}
        className="cta-enabled justify-self-start disabled:opacity-60"
      >
        {isPending ? "Saving access…" : "Save access"}
      </button>
      {message ? (
        <p className="text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
