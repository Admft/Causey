import { CompetitionCard } from "@/components/CompetitionCard";
import { CompetitionCoverImage } from "@/components/CompetitionCoverImage";
import { EligibilityBadges } from "@/components/EligibilityBadges";
import { SourceBadge } from "@/components/SourceBadge";
import { formatCompetitionFacetLabel } from "@/lib/category-discovery";
import { competitionTypeLabel } from "@/lib/competition-types";
import { organizerCoverUrl } from "@/lib/cover-url";
import type { CompetitionResult } from "@/lib/data/types";
import { eventStanding } from "@/lib/event-standing";
import {
  formatDate,
  formatDateRangeWithWeekday,
  formatFeeCents,
} from "@/lib/format";

export function CompetitionHostPreview({
  result,
  searchNote,
}: {
  result: CompetitionResult;
  searchNote: string;
}) {
  const isChess = result.category === "chess";
  const standing = eventStanding({
    name: result.name,
    source: result.source,
    series: result.series,
    details: result.details,
  });
  const typeLabel = [
    competitionTypeLabel({
      category: result.category,
      customCategoryName: result.custom_category_name,
    }),
    formatCompetitionFacetLabel(result.category, result.details.facets),
  ]
    .filter(Boolean)
    .join(" · ");
  const eyebrowLabel = [
    typeLabel,
    isChess && standing.id !== "local" ? standing.label : null,
  ]
    .filter(Boolean)
    .join(" · ");
  const coverPhoto = organizerCoverUrl(result.image_url);
  const feeLabel =
    result.entry_fee_cents === null || result.entry_fee_cents === undefined
      ? "Fee not listed"
      : result.entry_fee_cents === 0
        ? "No entry fee"
        : formatFeeCents(result.entry_fee_cents);
  const whereLabel =
    result.participation_mode === "online"
      ? "Online"
      : result.venue_name
        ? result.venue_name
        : result.city
          ? [result.city, [result.state, result.zip].filter(Boolean).join(" ")]
              .filter(Boolean)
              .join(", ")
          : null;
  const whereDetail = result.venue_name
    ? [
        result.address,
        [result.city, result.state, result.zip].filter(Boolean).join(" "),
      ]
        .filter(Boolean)
        .join(", ")
    : null;

  return (
    <div className="flex flex-col gap-8">
      <section aria-labelledby="host-search-preview-heading">
        <h3
          id="host-search-preview-heading"
          className="text-sm font-semibold text-foreground"
        >
          Search listing
        </h3>
        <p className="mt-1 text-xs text-muted">{searchNote}</p>
        <div className="mt-3 max-w-md">
          <CompetitionCard result={result} preview />
        </div>
      </section>

      <section
        className="section-rule pt-8"
        aria-labelledby="host-event-preview-heading"
      >
        <h3
          id="host-event-preview-heading"
          className="text-sm font-semibold text-foreground"
        >
          Event page
        </h3>
        <p className="mt-1 text-xs text-muted">
          How the event page starts. RSVP and comments appear after you publish.
        </p>
        <div className="mt-5">
          <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-brand-red">
            {eyebrowLabel}
          </p>
          <h4 className="mt-2 max-w-[24ch] font-display text-display font-bold tracking-tight text-foreground">
            {result.name}
          </h4>
          {isChess ? (
            <p className="mt-3 max-w-prose text-sm text-muted">{standing.hint}</p>
          ) : null}
          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2">
            <SourceBadge source={result.source} />
            {result.org_id ? (
              <span className="rounded-md border border-org-gold bg-org-gold-soft px-2 py-0.5 text-2xs font-semibold uppercase tracking-[0.06em] text-org-gold-strong">
                Organization hosted
              </span>
            ) : null}
          </div>
          {coverPhoto ? (
            <CompetitionCoverImage
              src={coverPhoto}
              source={result.source}
              alt=""
              aspectClass="aspect-[2/1]"
              className="mt-6 rounded-2xl"
            />
          ) : null}
          <dl className="mt-8 grid grid-cols-2 gap-x-6 gap-y-6 border-y border-line py-6 sm:grid-cols-3">
            <div>
              <dt className="text-xs font-semibold text-muted-strong">When</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {formatDateRangeWithWeekday(result.start_date, result.end_date)}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Where</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {whereLabel ?? (
                  <span className="font-medium text-muted">Not listed</span>
                )}
                {whereDetail ? (
                  <span className="mt-0.5 block text-xs font-medium text-muted">
                    {whereDetail}
                  </span>
                ) : null}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Entry fee</dt>
              <dd
                className={`mt-1 text-sm ${
                  result.entry_fee_cents === null
                    ? "font-medium text-muted"
                    : "font-semibold text-foreground"
                }`}
              >
                {feeLabel}
              </dd>
            </div>
            <div>
              <dt className="text-xs font-semibold text-muted-strong">Organizer</dt>
              <dd className="mt-1 text-sm font-semibold text-foreground">
                {result.organizer_name ?? (
                  <span className="font-medium text-muted">Not listed</span>
                )}
              </dd>
            </div>
            {isChess ? (
              <div>
                <dt className="text-xs font-semibold text-muted-strong">Rating</dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {result.rated ? "US Chess rated" : "Not rated"}
                </dd>
              </div>
            ) : null}
            {result.reg_deadline ? (
              <div>
                <dt className="text-xs font-semibold text-muted-strong">
                  Register by
                </dt>
                <dd className="mt-1 text-sm font-semibold text-foreground">
                  {formatDate(result.reg_deadline)}
                </dd>
              </div>
            ) : null}
          </dl>
          <div className="mt-8">
            <h4 className="font-display text-xl font-bold tracking-tight text-foreground">
              {isChess ? "Sections & who can enter" : "Divisions & who can enter"}
            </h4>
            <ul className="mt-4 flex flex-col">
              {result.sections.map((section) => (
                <li
                  key={section.id}
                  className="flex flex-col gap-2 border-t border-line py-4 first:border-t-0 sm:flex-row sm:items-baseline sm:justify-between"
                >
                  <div>
                    <p className="text-base font-semibold text-foreground">
                      {section.name}
                    </p>
                    <div className="mt-1.5">
                      <EligibilityBadges section={section} />
                    </div>
                  </div>
                  {section.entry_fee_cents !== null ? (
                    <p className="shrink-0 text-sm text-muted-strong">
                      {formatFeeCents(section.entry_fee_cents)} for this{" "}
                      {isChess ? "section" : "division"}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </div>
  );
}
