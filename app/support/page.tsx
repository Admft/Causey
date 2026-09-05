import type { Metadata } from "next";
import Link from "next/link";
import { PageBackLink } from "@/components/PageBackLink";

export const metadata: Metadata = {
  title: "Support",
  description: "How to reach Causey about an account, listing, or the iOS and Android apps.",
};

export default function SupportPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <PageBackLink />
      <p className="mt-6 text-sm font-semibold text-brand-red">Trust</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Support
      </h1>
      <p className="mt-4 max-w-2xl text-md text-muted">
        Causey is an early build. Use this page if you cannot sign in, need an
        account deleted, or need to report a listing or comment.
      </p>

      <div className="mt-10 space-y-10">
        <section aria-labelledby="contact">
          <h2
            id="contact"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Contact
          </h2>
          <p className="mt-4 text-base text-muted">
            Reach the founding team through{" "}
            <a
              href="https://causey.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact Causey through causey.dev in a new tab"
              className="font-semibold text-brand-red hover:underline"
            >
              causey.dev <span aria-hidden="true">↗</span>
            </a>
            . Include the account email and whether you are using the website
            or the iOS/Android app. Do not send passwords or sensitive student
            records.
          </p>
        </section>

        <section aria-labelledby="account">
          <h2
            id="account"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Account and deletion
          </h2>
          <p className="mt-4 text-base text-muted">
            You can export or delete your own account from{" "}
            <Link href="/account#data" className="font-semibold text-brand-red hover:underline">
              Account
            </Link>{" "}
            after signing in on the website. Organization owners must transfer
            ownership first.
          </p>
        </section>

        <section aria-labelledby="age">
          <h2
            id="age"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Ages 13 and up
          </h2>
          <p className="mt-4 text-base text-muted">
            The Causey phone app is for people 13 and older. It is not a kids
            app. Students under 13 should not sign in on a phone; a parent can
            use a parent account. Create accounts on the website.
          </p>
        </section>
      </div>
    </div>
  );
}
