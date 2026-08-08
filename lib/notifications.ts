/**
 * In-app notification helpers. Email delivery is not wired — prefs gate
 * in-app rows and (later) email; reminder toggles also filter live attention.
 */

export const NOTIFICATION_KINDS = [
  "invitation",
  "registration_deadline",
  "reminder_7_day",
  "reminder_1_day",
  "schedule_change",
  "cancellation",
  "rsvp_update",
  "announcement",
  "account",
] as const;

export type NotificationKind = (typeof NOTIFICATION_KINDS)[number];

export type NotificationPrefsLike = {
  invitation: boolean;
  registration_deadline: boolean;
  reminder_7_day: boolean;
  reminder_1_day: boolean;
  schedule_change: boolean;
  cancellation: boolean;
  rsvp_update: boolean;
  announcement: boolean;
};

export const DEFAULT_NOTIFICATION_PREFS: NotificationPrefsLike = {
  invitation: true,
  registration_deadline: true,
  reminder_7_day: true,
  reminder_1_day: true,
  schedule_change: true,
  cancellation: true,
  rsvp_update: true,
  announcement: true,
};

export function isNotificationKind(value: string): value is NotificationKind {
  return (NOTIFICATION_KINDS as readonly string[]).includes(value);
}

/** Whether a kind should create an in-app row given prefs (account always on). */
export function prefersInAppKind(
  prefs: NotificationPrefsLike | null | undefined,
  kind: NotificationKind
): boolean {
  if (kind === "account") return true;
  const resolved = prefs ?? DEFAULT_NOTIFICATION_PREFS;
  switch (kind) {
    case "invitation":
      return resolved.invitation;
    case "registration_deadline":
      return resolved.registration_deadline;
    case "reminder_7_day":
      return resolved.reminder_7_day;
    case "reminder_1_day":
      return resolved.reminder_1_day;
    case "schedule_change":
      return resolved.schedule_change;
    case "cancellation":
      return resolved.cancellation;
    case "rsvp_update":
      return resolved.rsvp_update;
    case "announcement":
      return resolved.announcement;
    default:
      return true;
  }
}

export type AttentionSourceEvent = {
  competitionId: string;
  slug: string;
  name: string;
  startDate: string;
  endDate: string | null;
  regDeadline: string | null;
  regUrl: string | null;
  /** entrant status, saved, or external registration status */
  relation:
    | "invited"
    | "going"
    | "saved"
    | "registration_opened"
    | "registration_needed";
};

export type AttentionItem = {
  id: string;
  kind: NotificationKind;
  title: string;
  body: string;
  href: string;
  ctaLabel: string;
};

function daysUntil(isoDate: string, todayIso: string): number {
  const start = Date.parse(`${todayIso}T12:00:00Z`);
  const end = Date.parse(`${isoDate}T12:00:00Z`);
  if (Number.isNaN(start) || Number.isNaN(end)) return Number.POSITIVE_INFINITY;
  return Math.round((end - start) / 86_400_000);
}

function isUpcoming(
  event: Pick<AttentionSourceEvent, "startDate" | "endDate">,
  todayIso: string
): boolean {
  return (event.endDate ?? event.startDate) >= todayIso;
}

/**
 * Build live “needs attention” rows from saved/going/invited + deadlines.
 * Reminder and registration toggles filter visibility; no cron / email.
 */
export function buildAttentionItems(
  events: AttentionSourceEvent[],
  prefs: NotificationPrefsLike | null | undefined,
  todayIso: string,
  options?: { horizonDays?: number }
): AttentionItem[] {
  const resolved = prefs ?? DEFAULT_NOTIFICATION_PREFS;
  const horizon = options?.horizonDays ?? 14;
  const items: AttentionItem[] = [];
  const seen = new Set<string>();

  function push(item: AttentionItem) {
    if (seen.has(item.id)) return;
    if (!prefersInAppKind(resolved, item.kind)) return;
    seen.add(item.id);
    items.push(item);
  }

  for (const event of events) {
    if (!isUpcoming(event, todayIso)) continue;
    const days = daysUntil(event.startDate, todayIso);
    const eventHref = `/event/${event.slug}`;
    const registerHref = event.regUrl
      ? `/event/${event.slug}/register`
      : eventHref;

    if (event.relation === "invited") {
      push({
        id: `invite:${event.competitionId}`,
        kind: "invitation",
        title: `Respond: ${event.name}`,
        body: "You were invited. Say going or not going so your coach can plan.",
        href: eventHref,
        ctaLabel: "Respond",
      });
    }

    const tracking =
      event.relation === "going" ||
      event.relation === "saved" ||
      event.relation === "registration_opened" ||
      event.relation === "registration_needed";

    if (
      tracking &&
      event.regDeadline &&
      event.relation !== "invited" &&
      (event.relation === "registration_opened" ||
        event.relation === "registration_needed" ||
        (event.relation === "going" && event.regUrl) ||
        (event.relation === "saved" && event.regUrl))
    ) {
      const deadlineDays = daysUntil(event.regDeadline, todayIso);
      if (deadlineDays >= 0 && deadlineDays <= 7) {
        push({
          id: `reg-deadline:${event.competitionId}`,
          kind: "registration_deadline",
          title: `Registration deadline soon: ${event.name}`,
          body:
            deadlineDays === 0
              ? "Registration closes today. Finish on the organizer site if you still need to."
              : `Registration closes in ${deadlineDays} day${
                  deadlineDays === 1 ? "" : "s"
                }.`,
          href: registerHref,
          ctaLabel: "Finish registration",
        });
      }
    }

    if (
      (event.relation === "going" || event.relation === "saved") &&
      days >= 0 &&
      days <= horizon
    ) {
      if (days <= 1) {
        push({
          id: `remind-1:${event.competitionId}`,
          kind: "reminder_1_day",
          title:
            days === 0
              ? `Today: ${event.name}`
              : `Tomorrow: ${event.name}`,
          body:
            event.relation === "going"
              ? "You marked going. Confirm travel and section details."
              : "Saved tournament is almost here. Open the event if you still plan to play.",
          href: eventHref,
          ctaLabel: "Open event",
        });
      } else if (days <= 7) {
        push({
          id: `remind-7:${event.competitionId}`,
          kind: "reminder_7_day",
          title: `This week: ${event.name}`,
          body: `Starts in ${days} days.`,
          href: eventHref,
          ctaLabel: "Open event",
        });
      }
    }
  }

  const order: Record<NotificationKind, number> = {
    invitation: 0,
    registration_deadline: 1,
    reminder_1_day: 2,
    reminder_7_day: 3,
    cancellation: 4,
    schedule_change: 5,
    rsvp_update: 6,
    announcement: 7,
    account: 8,
  };
  return items.sort(
    (a, b) => (order[a.kind] ?? 99) - (order[b.kind] ?? 99) || a.title.localeCompare(b.title)
  );
}
