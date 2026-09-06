"use client";

import { FormEvent, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { publishOrganizationAnnouncement } from "@/lib/actions/district";

type AudienceMode = "org" | "all_schools" | "selected_schools";

export function AnnouncementForm({
  orgId,
  orgSlug,
  orgType,
  connectedSchools = [],
}: {
  orgId: string;
  orgSlug: string;
  orgType?: "school" | "club" | "team" | "district";
  connectedSchools?: { id: string; name: string }[];
}) {
  const router = useRouter();
  const isDistrict = orgType === "district";
  const canFanOut = isDistrict && connectedSchools.length > 0;
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [audienceMode, setAudienceMode] = useState<AudienceMode>("org");
  const [selectedSchoolIds, setSelectedSchoolIds] = useState<string[]>([]);
  const [notifyStaff, setNotifyStaff] = useState(true);
  const [notifyStudents, setNotifyStudents] = useState(true);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fanOut = audienceMode !== "org" && canFanOut;
  const schoolIdsForSubmit = useMemo(() => {
    if (audienceMode === "all_schools") return undefined;
    if (audienceMode === "selected_schools") return selectedSchoolIds;
    return undefined;
  }, [audienceMode, selectedSchoolIds]);

  function toggleSchool(id: string) {
    setSelectedSchoolIds((current) =>
      current.includes(id)
        ? current.filter((schoolId) => schoolId !== id)
        : [...current, id]
    );
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setMessage(null);
    setError(null);
    if (audienceMode === "selected_schools" && !selectedSchoolIds.length) {
      setError("Choose at least one school.");
      return;
    }
    if (fanOut && !notifyStaff && !notifyStudents) {
      setError("Choose school staff, students, or both.");
      return;
    }
    setPending(true);
    try {
      const result = await publishOrganizationAnnouncement({
        orgId,
        orgSlug,
        title,
        body,
        audience: isDistrict && fanOut ? "connected_schools" : "org",
        schoolIds: schoolIdsForSubmit,
        notifyStaff: fanOut ? notifyStaff : true,
        notifyStudents: fanOut ? notifyStudents : true,
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
            <label className="flex items-start gap-2 text-sm text-foreground">
              <input
                type="radio"
                name="announcement-audience"
                className="mt-1"
                checked={audienceMode === "org"}
                onChange={() => setAudienceMode("org")}
              />
              <span>
                District staff only
                <span className="mt-0.5 block text-muted">
                  Stays on the district workspace. School rosters are not
                  notified.
                </span>
              </span>
            </label>
            {canFanOut ? (
              <>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="announcement-audience"
                    className="mt-1"
                    checked={audienceMode === "all_schools"}
                    onChange={() => setAudienceMode("all_schools")}
                  />
                  <span>
                    Every connected school
                    <span className="mt-0.5 block text-muted">
                      Posts on each school workspace. District staff also get a
                      copy.
                    </span>
                  </span>
                </label>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="radio"
                    name="announcement-audience"
                    className="mt-1"
                    checked={audienceMode === "selected_schools"}
                    onChange={() => setAudienceMode("selected_schools")}
                  />
                  <span>
                    Choose schools
                    <span className="mt-0.5 block text-muted">
                      Only the schools you pick, plus a district-staff copy.
                    </span>
                  </span>
                </label>
              </>
            ) : (
              <p className="text-sm text-muted">
                Add a school first to publish beyond district staff.
              </p>
            )}
            {audienceMode === "selected_schools" && canFanOut ? (
              <div className="ml-6 grid gap-2 rounded-xl border border-line bg-white p-3">
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    className="text-xs font-semibold text-brand-red hover:underline"
                    onClick={() =>
                      setSelectedSchoolIds(connectedSchools.map((school) => school.id))
                    }
                  >
                    Select all
                  </button>
                  <button
                    type="button"
                    className="text-xs font-semibold text-muted-strong hover:text-brand-red"
                    onClick={() => setSelectedSchoolIds([])}
                  >
                    Clear
                  </button>
                </div>
                {connectedSchools.map((school) => (
                  <label
                    key={school.id}
                    className="flex items-start gap-2 text-sm text-foreground"
                  >
                    <input
                      type="checkbox"
                      className="mt-1"
                      checked={selectedSchoolIds.includes(school.id)}
                      onChange={() => toggleSchool(school.id)}
                    />
                    <span>{school.name}</span>
                  </label>
                ))}
              </div>
            ) : null}
            {fanOut ? (
              <fieldset className="mt-2 grid gap-2">
                <legend className="text-xs font-semibold text-muted-strong">
                  At those schools
                </legend>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={notifyStaff}
                    onChange={(event) => setNotifyStaff(event.target.checked)}
                  />
                  <span>School staff</span>
                </label>
                <label className="flex items-start gap-2 text-sm text-foreground">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={notifyStudents}
                    onChange={(event) => setNotifyStudents(event.target.checked)}
                  />
                  <span>Students and linked parents</span>
                </label>
                <p className="text-xs text-muted">
                  Club-only notes belong on that club’s workspace.
                </p>
              </fieldset>
            ) : null}
          </fieldset>
        ) : null}
        <button
          type="submit"
          disabled={pending}
          className="cta-enabled justify-self-start disabled:opacity-60"
        >
          {pending
            ? "Publishing…"
            : audienceMode === "all_schools" && canFanOut
              ? "Publish to connected schools"
              : audienceMode === "selected_schools" && canFanOut
                ? "Publish to chosen schools"
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
