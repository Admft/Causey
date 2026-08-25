"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { publishOrganizationAnnouncement } from "@/lib/actions/district";

type AnnouncementAudience = "org" | "connected_schools";

export function AnnouncementForm({
  orgId,
  orgSlug,
  orgType,
  connectedSchoolCount = 0,
}: {
  orgId: string;
  orgSlug: string;
  orgType?: "school" | "club" | "team" | "district";
  connectedSchoolCount?: number;
}) {
  const router = useRouter();
  const isDistrict = orgType === "district";
  const canFanOut = isDistrict && connectedSchoolCount > 0;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audience, setAudience] = useState<AnnouncementAudience>(
    canFanOut ? "connected_schools" : "org"
  );
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await publishOrganizationAnnouncement({
        orgId,
        orgSlug,
        title,
        body,
        audience: isDistrict ? audience : "org",
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setBody("");
      if (result.schoolCount && result.schoolCount > 0) {
        setMessage(
          `Announcement published to ${result.schoolCount} connected ${
            result.schoolCount === 1 ? "school" : "schools"
          } and district staff.`
        );
      } else if (isDistrict) {
        setMessage("Announcement published to district staff.");
      } else {
        setMessage("Announcement published to organization members.");
      }
      router.refresh();
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <div className="grid gap-4">
        <label>
          <span className="text-xs font-semibold text-muted-strong">Headline</span>
          <input
            className="field mt-1"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="Bring boards on Saturday"
            required
            maxLength={100}
          />
        </label>
        <label>
          <span className="text-xs font-semibold text-muted-strong">Message</span>
          <textarea
            className="field mt-1 min-h-28 resize-y"
            value={body}
            onChange={(event) => setBody(event.target.value)}
            required
            maxLength={2000}
          />
        </label>
        {isDistrict ? (
          <fieldset className="grid gap-2">
            <legend className="text-xs font-semibold text-muted-strong">
              Who should see this
            </legend>
            {canFanOut ? (
              <label className="flex items-start gap-2 text-sm text-foreground">
                <input
                  type="radio"
                  name="announcement-audience"
                  className="mt-1"
                  checked={audience === "connected_schools"}
                  onChange={() => setAudience("connected_schools")}
                />
                <span>
                  Every connected school
                  <span className="mt-0.5 block text-muted">
                    Posts on each school workspace so coaches, students, and
                    linked parents can see it. District staff also get a copy.
                  </span>
                </span>
              </label>
            ) : (
              <p className="text-sm text-muted">
                Add a school first to publish beyond district staff.
              </p>
            )}
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="announcement-audience"
                className="mt-1"
                checked={audience === "org"}
                onChange={() => setAudience("org")}
              />
              <span>
                District staff only
                <span className="mt-0.5 block text-muted">
                  Stays on the district workspace. School rosters are not
                  notified.
                </span>
              </span>
            </label>
          </fieldset>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="cta-enabled justify-self-start disabled:opacity-60"
        >
          {pending
            ? "Publishing…"
            : audience === "connected_schools" && canFanOut
              ? "Publish to connected schools"
              : "Publish announcement"}
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
      </div>
    </form>
  );
}
