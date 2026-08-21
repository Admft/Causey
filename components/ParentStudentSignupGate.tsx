import Link from "next/link";

/**
 * Shown when a signed-in parent opens student signup in the same browser.
 * Creating a student account here would replace the parent session — so we
 * stop and send them back to the Family separate-device handoff.
 */
export function ParentStudentSignupGate({
  joiningOrganization = false,
}: {
  joiningOrganization?: boolean;
}) {
  return (
    <div className="mx-auto max-w-xl px-5 py-10 sm:px-8">
      <p className="text-sm font-semibold text-brand-red">Family setup</p>
      <h1 className="mt-2 font-display text-display-lg font-bold tracking-tight text-foreground">
        Open this on the student’s device
      </h1>
      <p className="mt-3 text-sm text-muted">
        You are still signed in as the parent. Creating a student account in
        this browser would switch you out of your parent session. Keep this
        device signed in as the parent
        {joiningOrganization
          ? ", and let the student open the join link on their own device."
          : ", and let the student create their account on their own device."}
      </p>
      <div className="section-rule mt-8 space-y-3 pt-8">
        <p className="text-sm font-semibold text-foreground">What to do next</p>
        <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-strong">
          <li>Stay signed in here as the parent — do not sign out.</li>
          <li>
            Send the student signup link from Family, or open it in a private
            window or on the student’s phone.
          </li>
          <li>
            The student uses <span className="font-semibold text-foreground">their</span>{" "}
            email (not yours), confirms the account, then you link from Family.
          </li>
        </ol>
        <div className="mt-6 flex flex-wrap items-center gap-4">
          <Link
            href="/family#student-account-setup"
            className="cta-enabled inline-flex"
          >
            Back to Family setup
          </Link>
          <Link
            href="/family#link-student"
            className="text-sm font-semibold text-muted-strong hover:text-brand-red"
          >
            Student already has an account
          </Link>
        </div>
      </div>
    </div>
  );
}
