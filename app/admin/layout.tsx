import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { AdminSubnav } from "@/components/AdminSubnav";
import { getPlatformAdminUser } from "@/lib/auth/platform-admin";

export const dynamic = "force-dynamic";

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await getPlatformAdminUser();
  if (!admin) redirect("/");

  return (
    <div className="md:grid md:grid-cols-[13rem_minmax(0,1fr)]">
      <AdminSubnav />
      {children}
    </div>
  );
}
