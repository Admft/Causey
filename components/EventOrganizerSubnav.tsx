import Link from "next/link";

export function EventOrganizerSubnav({
  slug,
  tab,
  canEditListing,
}: {
  slug: string;
  tab: "people" | "listing";
  canEditListing: boolean;
}) {
  const peopleHref = `/event/${slug}/manage`;
  const listingHref = `/event/${slug}/edit`;

  return (
    <nav
      aria-label="Event workspace"
      className="border-b border-line bg-surface"
    >
      <div className="mx-auto flex max-w-3xl gap-5 px-5 sm:px-8">
        <Link
          href={peopleHref}
          aria-current={tab === "people" ? "page" : undefined}
          className={`border-b-2 py-3 text-sm font-semibold ${
            tab === "people"
              ? "border-brand-red text-foreground"
              : "border-transparent text-muted-strong hover:text-foreground"
          }`}
        >
          People
        </Link>
        {canEditListing ? (
          <Link
            href={listingHref}
            aria-current={tab === "listing" ? "page" : undefined}
            className={`border-b-2 py-3 text-sm font-semibold ${
              tab === "listing"
                ? "border-brand-red text-foreground"
                : "border-transparent text-muted-strong hover:text-foreground"
            }`}
          >
            Listing
          </Link>
        ) : null}
      </div>
    </nav>
  );
}
