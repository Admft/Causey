"use client";

import { FormEvent, useState } from "react";
import { saveNotificationPreferences } from "@/lib/actions/district";
import type { NotificationPreferenceRow } from "@/lib/data/district";

const DEFAULTS: NotificationPreferenceRow = {
  invitation: true,
  registration_deadline: true,
  reminder_7_day: true,
  reminder_1_day: true,
  schedule_change: true,
  cancellation: true,
  rsvp_update: true,
  announcement: true,
  email_enabled: true,
  guardian_routing: true,
  timezone: "America/Chicago",
};

export function NotificationPreferencesForm({
  initial,
}: {
  initial: NotificationPreferenceRow | null;
}) {
  const [values, setValues] = useState(initial ?? DEFAULTS);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  function toggle(key: keyof NotificationPreferenceRow) {
    setValues((current) => ({
      ...current,
      [key]: !current[key],
    }));
  }

  async function submit(event: FormEvent) {
    event.preventDefault();
    setPending(true);
    setMessage(null);
    setError(null);
    try {
      const result = await saveNotificationPreferences({
        invitation: values.invitation,
        registrationDeadline: values.registration_deadline,
        reminder7Day: values.reminder_7_day,
        reminder1Day: values.reminder_1_day,
        scheduleChange: values.schedule_change,
        cancellation: values.cancellation,
        rsvpUpdate: values.rsvp_update,
        announcement: values.announcement,
        emailEnabled: values.email_enabled,
        guardianRouting: values.guardian_routing,
        timezone: values.timezone,
      });
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage("Preferences saved for future delivery.");
    } finally {
      setPending(false);
    }
  }

  const choices: {
    key: keyof NotificationPreferenceRow;
    label: string;
    description: string;
  }[] = [
    {
      key: "invitation",
      label: "Tournament and organization invitations",
      description: "A coach, school, or district needs a response.",
    },
    {
      key: "registration_deadline",
      label: "Registration deadlines",
      description: "Registration is still unfinished as the deadline approaches.",
    },
    {
      key: "reminder_7_day",
      label: "Seven-day reminders",
      description: "A planned tournament is one week away.",
    },
    {
      key: "reminder_1_day",
      label: "One-day reminders",
      description: "A planned tournament is tomorrow.",
    },
    {
      key: "schedule_change",
      label: "Date, venue, or eligibility changes",
      description: "A tracked tournament changed in a way that affects plans.",
    },
    {
      key: "cancellation",
      label: "Cancellations",
      description: "A tracked tournament was cancelled or archived.",
    },
    {
      key: "rsvp_update",
      label: "RSVP updates",
      description: "A student or linked parent responds to an invitation.",
    },
    {
      key: "announcement",
      label: "Coach announcements",
      description: "Your organization posts an operational update.",
    },
  ];

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className="sr-only">Notification types</legend>
        <div className="divide-y divide-line border-y border-line">
          {choices.map((choice) => (
            <label
              key={choice.key}
              className="flex cursor-pointer items-start justify-between gap-5 py-4"
            >
              <span>
                <span className="block text-sm font-semibold text-foreground">
                  {choice.label}
                </span>
                <span className="mt-1 block text-xs text-muted">
                  {choice.description}
                </span>
              </span>
              <input
                type="checkbox"
                checked={Boolean(values[choice.key])}
                onChange={() => toggle(choice.key)}
                className="mt-1 size-4 accent-[var(--brand-red)]"
              />
            </label>
          ))}
        </div>
      </fieldset>

      <div className="mt-7 grid gap-4 sm:grid-cols-2">
        <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            type="checkbox"
            checked={values.email_enabled}
            onChange={() => toggle("email_enabled")}
            className="mt-1 size-4 accent-[var(--brand-red)]"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Email when delivery becomes available
            </span>
            <span className="mt-1 block text-xs text-muted">
              Email is not connected yet. This saves whether you want it later.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 rounded-xl border border-line bg-surface p-4">
          <input
            type="checkbox"
            checked={values.guardian_routing}
            onChange={() => toggle("guardian_routing")}
            className="mt-1 size-4 accent-[var(--brand-red)]"
          />
          <span>
            <span className="block text-sm font-semibold text-foreground">
              Route student deadlines to linked guardians
            </span>
            <span className="mt-1 block text-xs text-muted">
              Guardians receive the action and event name, never private browsing data.
            </span>
          </span>
        </label>
      </div>

      <label className="mt-5 block max-w-sm">
        <span className="text-xs font-semibold text-muted-strong">Timezone</span>
        <select
          className="field mt-1"
          value={values.timezone}
          onChange={(event) =>
            setValues((current) => ({ ...current, timezone: event.target.value }))
          }
        >
          <option value="America/New_York">Eastern</option>
          <option value="America/Chicago">Central</option>
          <option value="America/Denver">Mountain</option>
          <option value="America/Los_Angeles">Pacific</option>
          <option value="America/Anchorage">Alaska</option>
          <option value="Pacific/Honolulu">Hawaii</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={pending}
        className="cta-enabled mt-6 disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save future preferences"}
      </button>
      {message ? (
        <p className="mt-3 text-sm font-medium text-foreground">{message}</p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
