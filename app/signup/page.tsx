import type { Metadata } from "next";
import Link from "next/link";
import { SignupForm } from "@/components/SignupForm";

export const metadata: Metadata = {
  title: "Sign up",
  description: "Create a Causey account to save tournaments and build a student profile.",
};

export default function SignupPage() {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Account</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Create your Causey account
      </h1>
      <p className="mt-3 text-sm text-muted">
        Students can save events and rate difficulty today. Teacher/coach and
        parent tools are shown so the path is clear — they unlock later.
      </p>
      <div className="section-rule mt-8 pt-8">
        <SignupForm />
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
