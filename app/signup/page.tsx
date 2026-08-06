import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";
import { sanitizeNextPath } from "@/lib/auth/next-path";
import { AccountRoleSchema } from "@/lib/auth/types";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Causey account to save tournaments and build a student profile.",
};

export default async function SignupPage({
  searchParams,
}: {
  searchParams: Promise<{ role?: string; next?: string }>;
}) {
  const { role, next: requestedNext } = await searchParams;
  const parsedRole = AccountRoleSchema.safeParse(role);
  const next = sanitizeNextPath(requestedNext);
  const isJoiningOrganization = next?.startsWith("/join/") ?? false;

  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {isJoiningOrganization
          ? "Create a student account to join"
          : "Create your Causey account"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {isJoiningOrganization
          ? "This join link is for a student roster. After confirming your email, you’ll return to review the organization before joining."
          : "Choose Student to join a school or club, Parent to manage a linked child’s invitations, or Coach / Organizer to create a roster and publish tournaments."}
      </p>
      <div className="section-rule mt-8 pt-8">
        <SignupForm
          initialRole={
            isJoiningOrganization
              ? "student"
              : parsedRole.success
                ? parsedRole.data
                : "student"
          }
          next={next}
          joiningOrganization={isJoiningOrganization}
        />
      </div>
      <p className="mt-6 text-xs text-muted">
        Under 13? A parent should create the account for now.{" "}
        <Link href="/chess" className="font-medium text-muted-strong hover:text-brand-red">
          Keep browsing without an account
        </Link>
      </p>
    </div>
  );
}
