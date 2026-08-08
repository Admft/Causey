import type { Metadata } from "next";
import Link from "next/link";
import { AdminUserDirectory } from "@/components/AdminUserDirectory";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";
import { getAdminUsers } from "@/lib/data/admin";

export const metadata: Metadata = {
  title: "Admin users",
  description: "Search Causey accounts and manage platform access.",
};

export default async function AdminUsersPage() {
  const admin = await getPlatformAdminUser();
  if (!admin) return null;
  const { users, total, error } = await getAdminUsers({
    limit: 50,
  });

  return (
    <main className="mx-auto max-w-4xl px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Platform admin
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Users &amp; access
      </h1>
      <p className="mt-2 max-w-prose text-sm text-muted">
        Search every Causey account by display name or email. Platform access
        changes are confirmed, audited, and cannot be applied to your own
        account from this page.
      </p>

      <AdminUserDirectory
        initialUsers={users}
        initialTotal={total}
        initialError={error}
        currentAdminId={admin.id}
      />

      <p className="mt-8 text-xs text-muted">
        Organization-specific coach, school-admin, and district-admin roles are
        managed from the organization’s{" "}
        <Link
          href="/admin/organizations"
          className="font-semibold text-muted-strong hover:text-brand-red"
        >
          workspace
        </Link>
        .
      </p>
    </main>
  );
}
