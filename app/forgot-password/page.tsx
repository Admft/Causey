import type { Metadata } from "next";
import { ForgotPasswordForm } from "@/components/ForgotPasswordForm";

export const metadata: Metadata = {
  title: "Forgot password",
  description: "Get a reset link for your Causey account.",
};

export default function ForgotPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Forgot your password?
      </h1>
      <p className="mt-3 text-sm text-muted">
        Enter your email and we&rsquo;ll send a link to choose a new one.
      </p>
      <div className="section-rule mt-8 pt-8">
        <ForgotPasswordForm />
      </div>
    </div>
  );
}
