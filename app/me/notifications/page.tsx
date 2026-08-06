import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { NotificationPreferencesForm } from "@/components/NotificationPreferencesForm";
import { getSessionUser } from "@/lib/auth/session";
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
  const [preferences, notifications] = await Promise.all([
    getNotificationPreferences(user.id),
    getNotifications(user.id),
  ]);

  return (
    <main className="mx-auto max-w-5xl px-5 py-10 sm:px-8">
      <Link
        href="/me"
        className="text-sm font-semibold text-muted-strong hover:text-brand-red"
      >
        ← Back to account
      </Link>
      <p className="mt-6 text-sm font-semibold text-brand-red">Notifications</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Deadlines without noise
      </h1>
      <p className="mt-2 max-w-2xl text-sm text-muted">
        Choose which tournament and organization changes deserve your attention.
        Student actions can route to linked guardians without exposing browsing
        history.
      </p>

      <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <NotificationPreferencesForm initial={preferences} />
        <aside>
          <h2 className="font-display text-xl font-bold text-foreground">
            Recent updates
          </h2>
          {!notifications.length ? (
            <p className="mt-3 text-sm text-muted">
              No updates yet. Invitations, deadline warnings, schedule changes,
              cancellations, and coach announcements will appear here.
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
                      <p className="mt-1 text-xs text-muted">{notification.body}</p>
                    </>
                  )}
                </li>
              ))}
            </ul>
          )}
        </aside>
      </div>
    </main>
  );
}
