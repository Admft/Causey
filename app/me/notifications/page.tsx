import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { PortalMission } from "@/components/PortalPrimitives";
import { getCurrentProfile, getSessionUser } from "@/lib/auth/session";
import { homePathForRole } from "@/lib/auth/home-path";
import {
  getNotificationPreferences,
  getNotifications,
} from "@/lib/data/district";

export const metadata: Metadata = {
  title: "Notifications",
  description: "Choose reminders and review important tournament updates.",
};

export default async function NotificationsPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login?next=/me/notifications");
  const [profile, preferences, notifications] = await Promise.all([
    getCurrentProfile(),
    getNotificationPreferences(user.id),
    getNotifications(user.id),
  ]);
  const workspaceHref = homePathForRole(profile?.role);
  const workspaceLabel =
    profile?.role === "parent"
      ? "Open family desk"
      : profile?.role === "coach"
        ? "Open organizations"
        : "Open my tournaments";

  return (
    <main className="mx-auto max-w-3xl px-5 py-10 sm:px-8">
      <Link
        href={workspaceHref}
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
        In-app updates appear here when Causey creates them. Automated reminders
        and email delivery are not operating yet.
      </p>

      <div className="mt-8">
        <PortalMission
          title={
            notifications.length
              ? `${notifications.length} recent ${
                  notifications.length === 1 ? "update" : "updates"
                }`
              : "No in-app updates yet"
          }
          description={
            notifications.length
              ? "Review the real updates below, then return to your workspace for the next action."
              : "Keep using your role workspace for invitations and tournament actions. Saving preferences below prepares your choices for delivery work that is still being built."
          }
          action={
            notifications.length
              ? { href: "#recent-updates", label: "Review updates" }
              : { href: workspaceHref, label: workspaceLabel }
          }
          secondary={{ href: "#preferences", label: "Set future preferences" }}
        />
      </div>

      <section
        id="recent-updates"
        className="section-rule mt-10 scroll-mt-24 pt-8"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-semibold text-foreground">
            Recent in-app updates
          </h2>
          <span className="text-xs text-muted">
            {notifications.length} shown
          </span>
        </div>
        {!notifications.length ? (
          <p className="mt-3 max-w-prose text-sm text-muted">
            Nothing has been generated for your account. Causey does not yet
            send automated deadline, schedule-change, or cancellation alerts.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-line border-y border-line">
            {notifications.map((notification) => (
              <li key={notification.id} className="py-3">
                {notification.href ? (
                  <Link href={notification.href} className="group block">
                    <span className="text-sm font-semibold text-foreground group-hover:text-brand-red">
                      {notification.title}
                    </span>
                    <span className="mt-1 block text-xs text-muted">
                      {notification.body}
                    </span>
                  </Link>
                ) : (
                  <>
                    <p className="text-sm font-semibold text-foreground">
                      {notification.title}
                    </p>
                    <p className="mt-1 text-xs text-muted">
                      {notification.body}
                    </p>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}
      </section>

      <details
        id="preferences"
        className="section-rule mt-10 scroll-mt-24 pt-8"
      >
        <summary className="cursor-pointer text-sm font-semibold text-muted-strong">
          Preferences for future delivery
        </summary>
        <p className="mt-3 max-w-prose text-sm text-muted">
          These choices are saved now, but they do not turn on automated alerts
          or email. Causey will use them when delivery is connected.
        </p>
        <div className="mt-6">
          <NotificationPreferencesForm initial={preferences} />
        </div>
      </details>
    </main>
  );
}
