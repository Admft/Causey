"use client";

import { FormEvent, useMemo, useState } from "react";
import type { AccountRole } from "@/lib/auth/types";
import { saveNotificationPreferences } from "@/lib/actions/district";
import { attemptAction } from "@/lib/attempt-action";
import type { NotificationPreferenceRow } from "@/lib/data/district";
import {
  notificationPreferenceChoicesForRole,
  preferenceKeyAppliesToRole,
  type NotificationPreferenceChoiceKey,
} from "@/lib/notifications";

const DEFAULTS: NotificationPreferenceRow = {
  invitation: true,
  registration_deadline: true,
  reminder_7_day: true,
  reminder_1_day: true,
  schedule_change: true,
  cancellation: true,
  rsvp_update: true,
  announcement: true,
  result: true,
  email_enabled: true,
  guardian_routing: true,
  timezone: "America/Chicago",
};

export function NotificationPreferencesForm({
  initial,
  role,
}: {
  initial: NotificationPreferenceRow | null;
  role: AccountRole;
}) {
  const [values, setValues] = useState(initial ?? DEFAULTS);
  const [pending, setPending] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const choices = useMemo(
    () => notificationPreferenceChoicesForRole(role),
    [role]
  );

  function toggle(key: NotificationPreferenceChoiceKey) {
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
      const result = await attemptAction(() =>
        saveNotificationPreferences({
          invitation: values.invitation,
          registrationDeadline: values.registration_deadline,
          reminder7Day: values.reminder_7_day,
          reminder1Day: values.reminder_1_day,
          scheduleChange: values.schedule_change,
          cancellation: values.cancellation,
          rsvpUpdate: preferenceKeyAppliesToRole("rsvp_update", role)
            ? values.rsvp_update
            : true,
          announcement: values.announcement,
          result: values.result,
          emailEnabled: values.email_enabled,
          guardianRouting: preferenceKeyAppliesToRole("guardian_routing", role)
            ? values.guardian_routing
            : true,
          timezone: values.timezone,
        })
      );
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setMessage(
        "Preferences saved. In-app and product-email alerts follow these choices."
      );
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit}>
      <fieldset>
        <legend className="sr-only">Notification preferences</legend>
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

      <label className="mt-5 block max-w-sm">
        <span className="text-xs font-semibold text-muted-strong">Timezone</span>
        <select
          className="field mt-1"
          value={values.timezone}
          onChange={(event) =>
            setValues((current) => ({
              ...current,
              timezone: event.target.value,
            }))
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
        {pending ? "Saving…" : "Save alert preferences"}
      </button>
      {message ? (
        <p className="mt-3 text-sm font-medium text-foreground" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="mt-3 text-sm font-medium text-brand-red" role="alert">
          {error}
        </p>
      ) : null}
    </form>
  );
}
