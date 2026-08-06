"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState, useTransition } from "react";
import { createGroup, deleteGroup, setGroupMembers } from "@/lib/actions/groups";
import type { GroupWithMembers } from "@/lib/data/portal";

type RosterEntry = { profile_id: string; display_name: string };

/**
 * Coach tool: groups are named subsets of the roster ("Varsity", "JV") used
 * to invite everyone in one tap when creating a tournament.
 */
export function GroupManager({
  orgId,
  orgSlug,
  groups,
  roster,
}: {
  orgId: string;
  orgSlug: string;
  groups: GroupWithMembers[];
  roster: RosterEntry[];
}) {
  const router = useRouter();
  const [newName, setNewName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setStatus(null);
    setPendingAction("create");
    const groupName = newName.trim();
    startTransition(async () => {
      const result = await createGroup(orgId, orgSlug, groupName);
      if (!result.ok) {
        setError(`${result.error} Try again.`);
        return;
      }
      setNewName("");
      setStatus(
        roster.length
          ? `${groupName} added. Choose the students who belong in this group.`
          : `${groupName} added. Share the join link above, then add students to this group.`
      );
      router.refresh();
    });
  }

  function toggleMember(group: GroupWithMembers, profileId: string) {
    setError(null);
    setStatus(null);
    setPendingAction(`members-${group.id}`);
    const next = group.member_ids.includes(profileId)
      ? group.member_ids.filter((id) => id !== profileId)
      : [...group.member_ids, profileId];
    startTransition(async () => {
      const result = await setGroupMembers(group.id, orgSlug, next);
      if (!result.ok) {
        setError(`${result.error} Try again.`);
        return;
      }
      setStatus(`${group.name} updated. You can use this group when inviting students.`);
      router.refresh();
    });
  }

  function onDelete(group: GroupWithMembers) {
    if (!window.confirm(`Delete ${group.name}? Students will stay on your roster.`)) {
      return;
    }
    setError(null);
    setStatus(null);
    setPendingAction(`delete-${group.id}`);
    startTransition(async () => {
      const result = await deleteGroup(group.id, orgSlug);
      if (!result.ok) {
        setError(`${result.error} Try again.`);
        return;
      }
      setStatus(`${group.name} deleted. Students are still on your roster.`);
      router.refresh();
    });
  }

  return (
    <div className="flex flex-col gap-5">
      <form onSubmit={onCreate} className="flex flex-col gap-3 sm:flex-row sm:items-end">
        <label className="flex flex-1 flex-col gap-1">
          <span className="text-xs font-semibold text-muted-strong">New group</span>
          <input
            className="field"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="Varsity"
          />
        </label>
        <button
          type="submit"
          disabled={isPending || !newName.trim()}
          className="rounded-md border border-line bg-white px-3 py-2 text-sm font-medium text-foreground transition-colors hover:border-brand-red/30 disabled:opacity-60"
        >
          {isPending && pendingAction === "create" ? "Adding group…" : "Add group"}
        </button>
      </form>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      {status ? (
        <p
          className="rounded-xl border border-brand-red/25 bg-accent-soft px-4 py-3 text-sm text-foreground"
          role="status"
        >
          {status}
        </p>
      ) : null}

      {!groups.length ? (
        <p className="text-sm text-muted">
          No groups yet. Groups let you invite a whole squad to a tournament at
          once. Name the first group above.
        </p>
      ) : (
        <ul className="flex flex-col gap-4">
          {groups.map((group) => (
            <li
              key={group.id}
              className="rounded-xl border border-line bg-surface p-4"
            >
              <div className="flex items-baseline justify-between gap-3">
                <h4 className="text-sm font-semibold text-foreground">
                  {group.name}
                  <span
                    className="ml-2 text-xs font-normal text-muted"
                    role={
                      isPending && pendingAction === `members-${group.id}`
                        ? "status"
                        : undefined
                    }
                  >
                    {isPending && pendingAction === `members-${group.id}`
                      ? "Saving changes…"
                      : `${group.member_ids.length} of ${roster.length}`}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => onDelete(group)}
                  disabled={isPending}
                  className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
                >
                  {isPending && pendingAction === `delete-${group.id}`
                    ? "Deleting…"
                    : "Delete group"}
                </button>
              </div>
              {!roster.length ? (
                <p className="mt-2 text-xs text-muted">
                  Your roster is empty — share the join code first.
                </p>
              ) : (
                <div className="mt-3 grid gap-1.5 sm:grid-cols-2">
                  {roster.map((member) => (
                    <label
                      key={member.profile_id}
                      className="flex items-center gap-2 text-sm text-foreground"
                    >
                      <input
                        type="checkbox"
                        disabled={isPending}
                        checked={group.member_ids.includes(member.profile_id)}
                        onChange={() => toggleMember(group, member.profile_id)}
                      />
                      {member.display_name || "Unnamed student"}
                    </label>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
