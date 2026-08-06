import type { Metadata } from "next";
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

  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Sign in
      </h1>
      <p className="mt-3 text-sm text-muted">
        Use the email and password you created at signup.
      </p>
      <div className="section-rule mt-8 pt-8">
        <LoginForm next={next} />
      </div>
    </div>
  );
}
