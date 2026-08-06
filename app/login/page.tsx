import type { Metadata } from "next";
import Link from "next/link";
import { LoginForm } from "@/components/LoginForm";
import { sanitizeNextPath } from "@/lib/auth/next-path";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Causey account.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNextPath(params.next);
  const isJoiningOrganization = next?.startsWith("/join/") ?? false;
  const signupHref = next
    ? `/signup?next=${encodeURIComponent(next)}`
    : "/signup";

  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-xs font-semibold uppercase tracking-wide text-brand-red">
        Account
      </p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        {isJoiningOrganization
          ? "Sign in to finish joining"
          : "Sign in"}
      </h1>
      <p className="mt-3 text-sm text-muted">
        {isJoiningOrganization
          ? "Use the student’s email and password. After signing in, you’ll review the school or club before joining its roster."
          : "Use the email and password you created at signup."}
      </p>

      {isJoiningOrganization ? (
        <div className="mt-6 rounded-2xl border border-accent/25 bg-accent-soft/40 p-5">
          <h2 className="font-display text-lg font-bold text-foreground">
            New student?
          </h2>
          <p className="mt-1 text-sm text-muted">
            Most people opening a coach invite need to create an account first.
          </p>
          <Link href={signupHref} className="cta-enabled mt-4 inline-flex">
            Create student account
          </Link>
        </div>
      ) : null}

      <div className="section-rule mt-8 pt-8">
        {isJoiningOrganization ? (
          <p className="mb-4 text-sm font-semibold text-foreground">
            Already have a student account?
          </p>
        ) : null}
        <LoginForm next={next} joiningOrganization={isJoiningOrganization} />
      </div>
    </div>
  );
}
