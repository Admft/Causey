import type { Metadata } from "next";
import { ResetPasswordForm } from "@/components/ResetPasswordForm";

export const metadata: Metadata = {
  title: "Reset password",
  description: "Choose a new password for your Causey account.",
};

export default function ResetPasswordPage() {
  return (
    <div className="mx-auto max-w-md px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Choose a new password
      </h1>
      <div className="section-rule mt-8 pt-8">
        <ResetPasswordForm />
      </div>
    </div>
  );
}
