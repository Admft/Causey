"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import { publishOrganizationAnnouncement } from "@/lib/actions/district";

export function AnnouncementForm({
  orgId,
  orgSlug,
}: {
  orgId: string;
  orgSlug: string;
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
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
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setTitle("");
      setBody("");
      setMessage("Announcement published to organization members.");
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
        <button
          type="submit"
          disabled={pending}
          className="cta-enabled justify-self-start disabled:opacity-60"
        >
          {pending ? "Publishing…" : "Publish announcement"}
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
