import type { EventStanding } from "@/lib/event-standing";

/**
 * Scale label only. Featured status is shown by FeaturedAwardMark on the card
 * — do not repeat "Featured" here (anti-vibecode: no restating badges).
 */
export function EventStandingLabel({
  standing,
  showHint = false,
}: {
  standing: EventStanding;
  showHint?: boolean;
}) {
  return (
    <div>
      <p className="text-2xs font-semibold uppercase tracking-[0.06em] text-muted-strong">
        {standing.label}
      </p>
      {showHint ? <p className="mt-1 text-sm text-muted">{standing.hint}</p> : null}
    </div>
  );
}
