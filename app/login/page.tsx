import type { Metadata } from "next";
import { LoginForm } from "@/components/LoginForm";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to your Causey account.",
};

/** Only same-site paths may be a post-login destination. */
function sanitizeNext(next: string | undefined): string | undefined {
  if (!next) return undefined;
  if (!next.startsWith("/") || next.startsWith("//")) return undefined;
  return next;
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const params = await searchParams;
  const next = sanitizeNext(params.next);

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
