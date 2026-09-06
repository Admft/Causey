import type { Metadata } from "next";
import Link from "next/link";
import { PageBackLink } from "@/components/PageBackLink";

export const metadata: Metadata = {
  title: "Terms of use",
  description: "The terms for using the Causey early-build product.",
};

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <PageBackLink />
      <p className="mt-6 text-sm font-semibold text-brand-red">Trust</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Terms of use
      </h1>
      <p className="mt-4 max-w-2xl text-md text-muted">
        Causey is an early-build competition discovery and school coordination
        product. By using it, you agree to the practical rules below.
      </p>
      <p className="mt-3 text-xs text-muted">Effective August 8, 2026</p>

      <div className="mt-10 space-y-10">
        <section aria-labelledby="service">
          <h2
            id="service"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            The service
          </h2>
          <p className="mt-4 text-base text-muted">
            Causey helps people discover competitions and lets authorized
            organizations manage rosters, invitations, RSVPs, attendance, and
            aggregate reports. Coverage is incomplete. Listings, fees,
            eligibility, dates, pathways, and locations may be wrong or out of
            date. Always verify details and complete registration on the
            organizer&rsquo;s official website.
          </p>
        </section>

        <section aria-labelledby="accounts">
          <h2
            id="accounts"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Accounts and authority
          </h2>
          <p className="mt-4 text-base text-muted">
            Provide accurate information, protect sign-in credentials, and use
            only the access assigned to you. Students under 13 should create and
            use an account with a parent or guardian&rsquo;s help. Whether
            under-13 accounts use parental consent, a school-official
            instruction in a signed district agreement, or a block is not
            decided. Causey does not sell an under-13 paid cohort. Staff may add
            students or act for an organization only when the school, district,
            club, student, or family has authorized them to do so.
          </p>
        </section>

        <section aria-labelledby="acceptable">
          <h2
            id="acceptable"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Acceptable use
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-muted">
            <li>Do not impersonate another person or organization.</li>
            <li>
              Do not upload unlawful content, misuse student information, probe
              another account, or bypass access controls.
            </li>
            <li>
              Do not scrape, overload, or disrupt Causey or use it to send
              unsolicited messages.
            </li>
            <li>
              Organizers are responsible for the accuracy and authority of
              information they publish.
            </li>
            <li>
              The iOS and Android apps are the same service as the website.
              They are for ages 13 and up, not a kids app, and do not sell
              subscriptions or tournament entry. Parents and coaches create an
              account in the app. Students 13 or older create a student account
              on the website, then sign in. Organizer registration may open an
              external site.
            </li>
          </ul>
        </section>

        <section aria-labelledby="subscription">
          <h2
            id="subscription"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Club and team subscriptions
          </h2>
          <p className="mt-4 text-base text-muted">
            A future monthly Causey fee for a club or team workspace is not in force.
            Checkout is not connected, and these terms do not charge a
            club. When checkout is connected, the owner would pay through Stripe
            Checkout and cancel through Stripe&rsquo;s customer portal. That fee
            is not student dues and is not tournament entry. School and district
            pilots stay a separate written agreement; public pages do not create
            that contract.
          </p>
        </section>

        <section aria-labelledby="district">
          <h2
            id="district"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            District and school pilots
          </h2>
          <p className="mt-4 text-base text-muted">
            A school or district pilot requires written approval and a separate
            agreement covering scope, support, student-data instructions,
            retention, security review, and any commercial terms. Public pages
            do not create a district contract or promise a particular price,
            service level, or compliance status.
          </p>
        </section>

        <section aria-labelledby="ownership">
          <h2
            id="ownership"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Content and external services
          </h2>
          <p className="mt-4 text-base text-muted">
            Causey owns its product and original content. Organizers retain
            responsibility for information they submit and grant Causey
            permission to display and process it to operate the service.
            External organizer sites, registration systems, and source
            directories have their own terms.
          </p>
        </section>

        <section aria-labelledby="availability">
          <h2
            id="availability"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Availability and enforcement
          </h2>
          <p className="mt-4 text-base text-muted">
            Causey may change, pause, restrict, or discontinue early-build
            features. Access may be suspended for security, legal, safety, or
            misuse concerns. The service is provided as available, without a
            promise that every feature or listing will be complete or
            uninterrupted.
          </p>
        </section>

        <section aria-labelledby="privacy">
          <h2
            id="privacy"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Privacy and questions
          </h2>
          <p className="mt-4 text-base text-muted">
            Read{" "}
            <Link
              href="/privacy"
              className="font-semibold text-brand-red hover:underline"
            >
              Privacy and student data
            </Link>{" "}
            before creating an account or provisioning students. Questions
            about these terms can be sent through{" "}
            <a
              href="https://causey.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact Causey through causey.dev in a new tab"
              className="font-semibold text-brand-red hover:underline"
            >
              causey.dev <span aria-hidden="true">↗</span>
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  );
}
