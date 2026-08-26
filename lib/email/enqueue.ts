import "server-only";

import {
  buildAttentionItems,
  isNotificationKind,
  prefersEmailKind,
  type AttentionSourceEvent,
  type NotificationEmailPrefsLike,
  type NotificationKind,
} from "@/lib/notifications";
import { todayIsoInTimeZone } from "@/lib/competition-timing";
import { getServiceRoleClient } from "@/lib/supabase/client";

type PreferenceColumns = NotificationEmailPrefsLike & {
  guardian_routing?: boolean;
};

type ReminderCandidate = PreferenceColumns & {
  profile_id: string;
  recipient_email: string;
  display_name: string;
  profile_role: string;
  timezone: string;
  competition_id: string;
  competition_slug: string;
  competition_name: string;
  start_date: string;
  end_date: string | null;
  reg_deadline: string | null;
  reg_url: string | null;
  relation: AttentionSourceEvent["relation"];
};

type PendingNotification = PreferenceColumns & {
  notification_id: string;
  profile_id: string;
  recipient_email: string;
  display_name: string;
  profile_role: string;
  timezone: string;
  kind: string;
  title: string;
  body: string;
  href: string | null;
};

type GuardianRecipient = NotificationEmailPrefsLike & {
  parent_profile_id: string;
  recipient_email: string;
  display_name: string;
};

type OutboxInsert = {
  recipient_email: string;
  template: "notification";
  payload: {
    kind: NotificationKind;
    title: string;
    body: string;
    href: string | null;
    recipient_name?: string;
    student_name?: string;
    notification_id?: string;
  };
  dedupe_key: string;
};

function prefsFrom(row: PreferenceColumns): NotificationEmailPrefsLike {
  return {
    email_enabled: row.email_enabled,
    invitation: row.invitation,
    registration_deadline: row.registration_deadline,
    reminder_7_day: row.reminder_7_day,
    reminder_1_day: row.reminder_1_day,
    schedule_change: row.schedule_change,
    cancellation: row.cancellation,
    rsvp_update: row.rsvp_update,
    announcement: row.announcement,
    result: row.result ?? true,
  };
}

function todayInTimeZone(timeZone: string): string {
  return todayIsoInTimeZone(timeZone);
}

async function guardiansFor(
  childProfileId: string,
  cache: Map<string, GuardianRecipient[]>
): Promise<GuardianRecipient[]> {
  const cached = cache.get(childProfileId);
  if (cached) return cached;
  const service = getServiceRoleClient();
  if (!service) return [];
  const { data, error } = await service.rpc("get_guardian_email_recipients", {
    p_child_id: childProfileId,
  });
  if (error) throw new Error(`Could not load guardian routing: ${error.message}`);
  const guardians = (data ?? []) as GuardianRecipient[];
  cache.set(childProfileId, guardians);
  return guardians;
}

async function addGuardianCopies(
  rows: OutboxInsert[],
  direct: OutboxInsert,
  child: {
    profileId: string;
    profileRole: string;
    displayName: string;
    guardianRouting: boolean;
  },
  guardianCache: Map<string, GuardianRecipient[]>
) {
  if (child.profileRole !== "student" || !child.guardianRouting) return;
  for (const guardian of await guardiansFor(child.profileId, guardianCache)) {
    if (!prefersEmailKind(prefsFrom(guardian), direct.payload.kind)) continue;
    rows.push({
      recipient_email: guardian.recipient_email,
      template: "notification",
      payload: {
        ...direct.payload,
        recipient_name: guardian.display_name,
        student_name: child.displayName,
        notification_id: undefined,
      },
      dedupe_key: `guardian:${guardian.parent_profile_id}:${direct.dedupe_key}`,
    });
  }
}

async function insertOutboxRows(rows: OutboxInsert[]): Promise<number> {
  if (!rows.length) return 0;
  const service = getServiceRoleClient();
  if (!service) return 0;
  for (let index = 0; index < rows.length; index += 100) {
    const { error } = await service.from("email_outbox").upsert(
      rows.slice(index, index + 100),
      {
        onConflict: "dedupe_key",
        ignoreDuplicates: true,
      }
    );
    if (error) throw new Error(`Could not queue product email: ${error.message}`);
  }
  return rows.length;
}

async function enqueueAttentionEmails(
  guardianCache: Map<string, GuardianRecipient[]>
): Promise<number> {
  const service = getServiceRoleClient();
  if (!service) return 0;
  const { data, error } = await service.rpc("get_email_reminder_candidates");
  if (error) throw new Error(`Could not load reminder candidates: ${error.message}`);

  const grouped = new Map<string, ReminderCandidate[]>();
  for (const candidate of (data ?? []) as ReminderCandidate[]) {
    const current = grouped.get(candidate.profile_id) ?? [];
    current.push(candidate);
    grouped.set(candidate.profile_id, current);
  }

  const rows: OutboxInsert[] = [];
  for (const candidates of grouped.values()) {
    const recipient = candidates[0];
    if (!recipient?.recipient_email) continue;
    const prefs = prefsFrom(recipient);
    const events: AttentionSourceEvent[] = candidates.map((candidate) => ({
      competitionId: candidate.competition_id,
      slug: candidate.competition_slug,
      name: candidate.competition_name,
      startDate: candidate.start_date,
      endDate: candidate.end_date,
      regDeadline: candidate.reg_deadline,
      regUrl: candidate.reg_url,
      relation: candidate.relation,
    }));
    const items = buildAttentionItems(
      events,
      prefs,
      todayInTimeZone(recipient.timezone)
    );
    for (const item of items) {
      if (!prefersEmailKind(prefs, item.kind)) continue;
      const direct: OutboxInsert = {
        recipient_email: recipient.recipient_email,
        template: "notification",
        payload: {
          kind: item.kind,
          title: item.title,
          body: item.body,
          href: item.href,
          recipient_name: recipient.display_name,
        },
        dedupe_key: `attention:${recipient.profile_id}:${item.id}`,
      };
      rows.push(direct);
      await addGuardianCopies(
        rows,
        direct,
        {
          profileId: recipient.profile_id,
          profileRole: recipient.profile_role,
          displayName: recipient.display_name,
          guardianRouting: Boolean(recipient.guardian_routing),
        },
        guardianCache
      );
    }
  }
  return insertOutboxRows(rows);
}

async function enqueueStoredNotificationEmails(
  guardianCache: Map<string, GuardianRecipient[]>
): Promise<number> {
  const service = getServiceRoleClient();
  if (!service) return 0;
  const { data, error } = await service.rpc("get_pending_notification_emails");
  if (error) {
    throw new Error(`Could not load notification emails: ${error.message}`);
  }

  const rows: OutboxInsert[] = [];
  for (const notification of (data ?? []) as PendingNotification[]) {
    if (!isNotificationKind(notification.kind)) continue;
    const prefs = prefsFrom(notification);
    if (!prefersEmailKind(prefs, notification.kind)) continue;
    const direct: OutboxInsert = {
      recipient_email: notification.recipient_email,
      template: "notification",
      payload: {
        kind: notification.kind,
        title: notification.title,
        body: notification.body,
        href: notification.href,
        recipient_name: notification.display_name,
        notification_id: notification.notification_id,
      },
      dedupe_key: `notification:${notification.notification_id}`,
    };
    rows.push(direct);
    if (notification.kind !== "account") {
      await addGuardianCopies(
        rows,
        direct,
        {
          profileId: notification.profile_id,
          profileRole: notification.profile_role,
          displayName: notification.display_name,
          guardianRouting: Boolean(notification.guardian_routing),
        },
        guardianCache
      );
    }
  }
  return insertOutboxRows(rows);
}

export async function enqueueProductEmails(): Promise<{
  attention: number;
  notifications: number;
}> {
  const guardianCache = new Map<string, GuardianRecipient[]>();
  const [attention, notifications] = await Promise.all([
    enqueueAttentionEmails(guardianCache),
    enqueueStoredNotificationEmails(guardianCache),
  ]);
  return { attention, notifications };
}
