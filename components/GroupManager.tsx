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
  const [isPending, startTransition] = useTransition();

  async function onCreate(e: FormEvent) {
    e.preventDefault();
    setError(null);
    const result = await createGroup(orgId, orgSlug, newName);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setNewName("");
    router.refresh();
  }

  function toggleMember(group: GroupWithMembers, profileId: string) {
    setError(null);
    const next = group.member_ids.includes(profileId)
      ? group.member_ids.filter((id) => id !== profileId)
      : [...group.member_ids, profileId];
    startTransition(async () => {
      const result = await setGroupMembers(group.id, orgSlug, next);
      if (!result.ok) setError(result.error);
      router.refresh();
    });
  }

  function onDelete(groupId: string) {
    setError(null);
    startTransition(async () => {
      const result = await deleteGroup(groupId, orgSlug);
      if (!result.ok) setError(result.error);
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
          Add group
        </button>
      </form>

      {error ? (
        <p className="text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}

      {!groups.length ? (
        <p className="text-sm text-muted">
          No groups yet. Groups let you invite a whole squad to a tournament at
          once.
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
                  <span className="ml-2 text-xs font-normal text-muted">
                    {group.member_ids.length} of {roster.length}
                  </span>
                </h4>
                <button
                  type="button"
                  onClick={() => onDelete(group.id)}
                  disabled={isPending}
                  className="text-sm font-medium text-muted-strong transition-colors hover:text-brand-red disabled:opacity-60"
                >
                  Delete
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
