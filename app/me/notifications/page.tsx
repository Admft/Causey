import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  MarkAllNotificationsReadButton,
  MarkNotificationReadButton,
} from "@/components/NotificationInboxActions";
import { PortalMission } from "@/components/PortalPrimitives";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import {
  getAttentionSourceEvents,
  getNotificationPreferences,
  getNotifications,
} from "@/lib/data/district";
import { getChildrenWithEvents, getMyOrgs } from "@/lib/data/portal";
import {
  buildAttentionItems,
  buildLinkedChildAttentionItems,
  sortAttentionItems,
} from "@/lib/notifications";
import { workspaceOpenCta } from "@/lib/portal-copy";

export const metadata: Metadata = {
  title: "Alerts",
  description: "Review important tournament updates for your Causey account.",
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/me/notifications");
  const profile = await getCurrentProfile();
  const [notifications, preferences, ownAttentionSources, children, myOrgs] =
    await Promise.all([
      getNotifications(user.id),
      getNotificationPreferences(user.id),
      getAttentionSourceEvents(user.id),
      profile?.role === "parent"
        ? getChildrenWithEvents(user.id)
        : Promise.resolve([]),
      profile?.role === "coach" ? getMyOrgs(user.id) : Promise.resolve([]),
    ]);
  const today = new Date().toISOString().slice(0, 10);
  const attention = sortAttentionItems([
    ...buildLinkedChildAttentionItems(children, preferences, today),
    ...buildAttentionItems(ownAttentionSources, preferences, today),
  ]);
  const unreadCount = notifications.filter((row) => !row.read_at).length;
  const hasDistrictAccess = myOrgs.some(
    (row) =>
      row.org.type === "district" || row.memberRole === "district_admin"
  );
  const workspace = workspaceOpenCta(profile?.role, { hasDistrictAccess });
  const hasAnything = attention.length > 0 || notifications.length > 0;

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href={workspace.href}
        className="text-sm font-semibold text-muted-strong hover:text-brand-red"
      >
        ← Back to workspace
      </Link>
      <p className="mt-6 text-xs font-semibold uppercase tracking-wide text-brand-red">
        Alerts
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Updates that need attention
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        In-app updates for invitations, RSVPs, announcements, account changes,
        and tournament schedule or cancellation notices.
        {profile?.role === "parent"
          ? " Linked-student actions appear here and open in the family desk."
          : ""}{" "}
        Product email follows the choices in{" "}
        <Link
          href="/account#alerts"
          className="font-semibold text-brand-red hover:underline"
        >
          Account settings
        </Link>
        .
      </p>

      <div className="mt-8">
        <PortalMission
          title={
            hasAnything
              ? `${attention.length + unreadCount} item${
                  attention.length + unreadCount === 1 ? "" : "s"
                } to review`
              : "No updates need attention"
          }
          description={
            hasAnything
              ? profile?.role === "parent"
                ? "Handle linked-student invitations and registration first, then clear recent in-app updates."
                : "Handle invitations and upcoming plans first, then clear recent in-app updates."
              : "Saved and going tournaments, invitations, and schedule changes will show here. Alert preferences control what appears."
          }
          action={
            hasAnything
              ? {
                  href: attention.length
                    ? "#needs-attention"
                    : "#recent-updates",
                  label: attention.length
                    ? "Review what needs attention"
                    : "Review updates",
                }
              : { href: workspace.href, label: workspace.label }
          }
          secondary={{ href: "/account#alerts", label: "Alert preferences" }}
        />
      </div>

      <section
        id="needs-attention"
        className="section-rule mt-10 scroll-mt-24 pt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Needs attention
          </h2>
          <span className="text-xs text-muted">{attention.length} shown</span>
        </div>
        {!attention.length ? (
          <p className="mt-3 max-w-prose text-sm text-muted">
            {profile?.role === "parent"
              ? "No invitations, organizer registrations, or upcoming plans need action for you or a linked student right now."
              : "No pending invitations or upcoming saved/going tournaments need a response right now."}
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {attention.map((item) => (
              <li key={item.id} className="py-3">
                <Link href={item.href} className="group block">
                  <span className="text-sm font-semibold text-foreground group-hover:text-brand-red">
                    {item.title}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {item.body}
                  </span>
                  <span className="mt-2 inline-block text-xs font-semibold text-brand-red">
                    {item.ctaLabel} →
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section
        id="recent-updates"
        className="section-rule mt-10 scroll-mt-24 pt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Recent in-app updates
          </h2>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted">
              {notifications.length} shown
              {unreadCount ? ` · ${unreadCount} unread` : ""}
            </span>
            <MarkAllNotificationsReadButton disabled={!unreadCount} />
          </div>
        </div>
        {!notifications.length ? (
          <p className="mt-3 max-w-prose text-sm text-muted">
            Nothing has been recorded for your account yet. When coaches invite
            you, RSVPs change, announcements post, or tracked tournaments change
            dates or cancel, those updates appear here.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {notifications.map((notification) => {
              const unread = !notification.read_at;
              return (
                <li key={notification.id} className="py-3">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      {notification.href ? (
                        <Link href={notification.href} className="group block">
                          <span
                            className={
                              unread
                                ? "text-sm font-semibold text-foreground group-hover:text-brand-red"
                                : "text-sm font-medium text-muted-strong group-hover:text-brand-red"
                            }
                          >
                            {unread ? "· " : ""}
                            {notification.title}
                          </span>
                          <span className="mt-1 block text-xs text-muted">
                            {notification.body}
                          </span>
                        </Link>
                      ) : (
                        <>
                          <p
                            className={
                              unread
                                ? "text-sm font-semibold text-foreground"
                                : "text-sm font-medium text-muted-strong"
                            }
                          >
                            {unread ? "· " : ""}
                            {notification.title}
                          </p>
                          <p className="mt-1 text-xs text-muted">
                            {notification.body}
                          </p>
                        </>
                      )}
                    </div>
                    {unread ? (
                      <MarkNotificationReadButton id={notification.id} />
                    ) : (
                      <span className="text-xs text-muted">Read</span>
                    )}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </main>
  );
}
