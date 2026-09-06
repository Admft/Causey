import type { Metadata } from "next";
import Link from "next/link";
import { PageBackLink } from "@/components/PageBackLink";

export const metadata: Metadata = {
  title: "Privacy and student data",
  description:
    "How Causey collects, uses, shares, and protects account and student data.",
};

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <PageBackLink />
      <p className="mt-6 text-sm font-semibold text-brand-red">Trust</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Privacy and student data
      </h1>
      <p className="mt-4 max-w-2xl text-md text-muted">
        Causey is unfinished software. This page describes the data the current
        product handles; it does not claim that Causey has completed a district
        privacy review or signed a district data agreement.
      </p>
      <p className="mt-3 text-xs text-muted">Effective August 8, 2026</p>

      <div className="mt-10 space-y-10">
        <section aria-labelledby="collect">
          <h2
            id="collect"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            What Causey collects
          </h2>
          <ul className="mt-4 list-disc space-y-2 pl-5 text-base text-muted">
            <li>
              Account information such as email address, display name, account
              type, state, zip code, and competition interests.
            </li>
            <li>
              A student&rsquo;s date of birth, used to derive an age band for
              age-appropriate eligibility and account guidance.
            </li>
            <li>
              School and club participation, roster membership, groups,
              invitations, RSVPs, attendance, saved events, and organizer
              registration status.
            </li>
            <li>
              Parent-student links, staff roles, notification preferences, and
              in-app notification history.
            </li>
            <li>
              Problem reports sent from Support, including the contact email,
              description, optional screenshot, and replies from the founding
              team.
            </li>
            <li>
              Basic technical records needed to secure, operate, and
              troubleshoot the service.
            </li>
            <li>
              On the iOS and Android apps, the same account data as the
              website, plus a sign-in session on the device. The phone app does
              not currently collect push tokens, advertising IDs, or precise
              GPS. Zip search uses the zip you type or save on your profile.
            </li>
          </ul>
        </section>

        <section aria-labelledby="use">
          <h2
            id="use"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            How the data is used
          </h2>
          <p className="mt-4 text-base text-muted">
            Causey uses account and participation data to provide tournament
            discovery, roster and invitation workflows, family action lists,
            reminders, attendance reporting, account support, security, and
            service improvement. Causey does not use student data for targeted
            advertising and does not sell personal information.
          </p>
        </section>

        <section aria-labelledby="access">
          <h2
            id="access"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Who can see it
          </h2>
          <p className="mt-4 text-base text-muted">
            Students and linked parents can see their own planning information.
            Authorized school or club staff can see roster, invitation, RSVP,
            and attendance information for the organizations they manage.
            District administrators receive aggregate school reporting instead
            of a district-wide student directory. Causey platform
            administrators can access limited information when needed for
            support, moderation, safety, and access management.
          </p>
        </section>

        <section aria-labelledby="providers">
          <h2
            id="providers"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Service providers and event organizers
          </h2>
          <p className="mt-4 text-base text-muted">
            Causey uses Vercel for hosting, Supabase for authentication and
            database storage, Resend for email delivery, Sentry for error
            reporting when it is configured, OpenAI for optional pathway
            enrichment, and GitHub Actions for build and ingest jobs. They
            process data only to provide those services. Tournament registration
            happens on an organizer&rsquo;s website; information submitted there
            is governed by that organizer&rsquo;s privacy practices, not this
            notice. Problem reports and optional screenshots are stored and
            emailed to the founding team so they can reply.
          </p>
        </section>

        <section aria-labelledby="choices">
          <h2
            id="choices"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Family and account choices
          </h2>
          <p className="mt-4 text-base text-muted">
            Users can update profile and notification choices in{" "}
            <Link
              href="/account"
              className="font-semibold text-brand-red hover:underline"
            >
              Account settings
            </Link>
            . Parents and students can manage family links there. Signed-in
            users can download a JSON copy of their account from{" "}
            <Link
              href="/account#data"
              className="font-semibold text-brand-red hover:underline"
            >
              Your data
            </Link>{" "}
            and can delete the account after typing their email. Organization
            owners must transfer ownership first. Founder super-admin accounts
            cannot be self-deleted.
          </p>
        </section>

        <section aria-labelledby="districts">
          <h2
            id="districts"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Schools, districts, and children
          </h2>
          <p className="mt-4 text-base text-muted">
            District use must be reviewed with Causey before students are
            provisioned. Causey will document the district&rsquo;s instructions,
            permitted uses, retention expectations, and deletion process in an
            agreement approved by the district. Causey does not claim FERPA,
            COPPA, or state student-privacy compliance merely because this page
            exists. Whether under-13 students use parental consent, a
            school-official instruction in that agreement, or a block is not
            decided. Causey does not sell an under-13 paid cohort. Public event
            comments already block under-13 posters.
          </p>
        </section>

        <section aria-labelledby="mobile">
          <h2
            id="mobile"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            iOS and Android apps
          </h2>
          <p className="mt-4 text-base text-muted">
            The phone apps use the same accounts and privacy rules as the
            website. They are for ages 13 and up. Students under 13 cannot
            sign in on a phone. Account export and deletion stay on{" "}
            <Link
              href="/account#data"
              className="font-semibold text-brand-red hover:underline"
            >
              Account
            </Link>
            . Support is at{" "}
            <Link href="/support" className="font-semibold text-brand-red hover:underline">
              Support
            </Link>
            .
          </p>
        </section>

        <section aria-labelledby="contact">
          <h2
            id="contact"
            className="font-display text-display-sm font-bold tracking-tight text-foreground"
          >
            Questions or requests
          </h2>
          <p className="mt-4 text-base text-muted">
            Contact the founding team through{" "}
            <a
              href="https://causey.dev"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Contact Causey through causey.dev in a new tab"
              className="font-semibold text-brand-red hover:underline"
            >
              causey.dev <span aria-hidden="true">↗</span>
            </a>
            . Include the account email and the school or district involved,
            but do not send passwords or sensitive student records.
          </p>
        </section>
      </div>
    </div>
  );
}
