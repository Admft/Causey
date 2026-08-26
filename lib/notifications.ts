/** Shared in-app and product-email notification preferences. */

import type { ChildSummary } from "@/lib/data/portal";

export const NOTIFICATION_KINDS = [
  "invitation",
  "registration_deadline",
  "reminder_7_day",
  "reminder_1_day",
  "schedule_change",
  "cancellation",
  "rsvp_update",
  "announcement",
  "result",
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
  result: boolean;
};

export type NotificationEmailPrefsLike = NotificationPrefsLike & {
  email_enabled: boolean;
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
  result: true,
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
    case "result":
      return resolved.result;
    default:
      return true;
  }
}

/** Product email requires both the kind preference and the email master switch. */
export function prefersEmailKind(
  prefs: NotificationEmailPrefsLike | null | undefined,
  kind: NotificationKind
): boolean {
  if (!prefs?.email_enabled) return false;
  return prefersInAppKind(prefs, kind);
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

const ATTENTION_ORDER: Record<NotificationKind, number> = {
  invitation: 0,
  registration_deadline: 1,
  reminder_1_day: 2,
  reminder_7_day: 3,
  cancellation: 4,
  schedule_change: 5,
  rsvp_update: 6,
  announcement: 7,
  result: 8,
  account: 9,
};

export function sortAttentionItems(items: AttentionItem[]): AttentionItem[] {
  return items.sort(
    (a, b) =>
      (ATTENTION_ORDER[a.kind] ?? 99) -
        (ATTENTION_ORDER[b.kind] ?? 99) ||
      a.title.localeCompare(b.title)
  );
}

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
 * Reminder and registration toggles filter visibility in every delivery channel.
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

  return sortAttentionItems(items);
}

/**
 * Parent attention mirrors the Family desk: every upcoming invitation and
 * unfinished organizer registration is actionable, even without a deadline.
 */
export function buildLinkedChildAttentionItems(
  children: ChildSummary[],
  prefs: NotificationPrefsLike | null | undefined,
  todayIso: string
): AttentionItem[] {
  const items: AttentionItem[] = [];

  for (const child of children) {
    for (const row of child.entrants) {
      const event = row.competition;
      if (!event || (event.end_date ?? event.start_date) < todayIso) continue;

      if (
        row.status === "invited" &&
        prefersInAppKind(prefs, "invitation")
      ) {
        items.push({
          id: `child-invite:${child.profile_id}:${row.competition_id}`,
          kind: "invitation",
          title: `${child.display_name} · Respond: ${event.name}`,
          body: `${child.display_name} was invited. Open the family desk to answer for them.`,
          href: "/family#needs-response",
          ctaLabel: "Open family desk",
        });
      }

      if (
        row.status === "going" &&
        event.reg_url &&
        row.registration_status !== "registered" &&
        prefersInAppKind(prefs, "registration_deadline")
      ) {
        items.push({
          id: `child-registration:${child.profile_id}:${row.competition_id}`,
          kind: "registration_deadline",
          title: `${child.display_name} · Finish organizer registration: ${event.name}`,
          body:
            "Causey has the RSVP. Finish on the organizer site, then mark it complete in Family.",
          href: "/family#needs-response",
          ctaLabel: "Open family desk",
        });
      }

      if (row.status === "going" || row.status === "attended") {
        const days = daysUntil(event.start_date, todayIso);
        if (days >= 0 && days <= 7) {
          if (days <= 1 && prefersInAppKind(prefs, "reminder_1_day")) {
            items.push({
              id: `child-remind-1:${child.profile_id}:${row.competition_id}`,
              kind: "reminder_1_day",
              title:
                days === 0
                  ? `${child.display_name} · Today: ${event.name}`
                  : `${child.display_name} · Tomorrow: ${event.name}`,
              body: `${child.display_name} is marked going. Confirm travel from the family desk.`,
              href: "/family",
              ctaLabel: "Open family desk",
            });
          } else if (days > 1 && prefersInAppKind(prefs, "reminder_7_day")) {
            items.push({
              id: `child-remind-7:${child.profile_id}:${row.competition_id}`,
              kind: "reminder_7_day",
              title: `${child.display_name} · This week: ${event.name}`,
              body: `Starts in ${days} days.`,
              href: "/family",
              ctaLabel: "Open family desk",
            });
          }
        }
      }
    }
  }

  return sortAttentionItems(items);
}
