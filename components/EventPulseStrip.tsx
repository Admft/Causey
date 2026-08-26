import type { EventPulse } from "@/lib/event-pulse";

export function EventPulseStrip({
  pulse,
  isPast,
  hasRegUrl,
}: {
  pulse: EventPulse;
  isPast: boolean;
  hasRegUrl: boolean;
}) {
  const items = [
    { label: "Invited", value: pulse.invited },
    { label: "Awaiting RSVP", value: pulse.awaiting },
    { label: "Going", value: pulse.going },
    { label: "Not going", value: pulse.notGoing },
    ...(hasRegUrl
      ? [
          {
            label: "Unfinished organizer registration",
            value: pulse.unfinishedRegistration,
          },
        ]
      : []),
    ...(isPast
      ? [
          { label: "Attended", value: pulse.attended },
          { label: "Results still blank", value: pulse.resultsBlank },
        ]
      : []),
  ];

  return (
    <section aria-label="Event pulse">
      <h2 className="text-sm font-semibold text-foreground">Event pulse</h2>
      <dl className="mt-3 divide-y divide-line border-y border-line bg-surface">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-baseline justify-between gap-4 px-4 py-3"
          >
            <dt className="text-sm text-muted-strong">{item.label}</dt>
            <dd className="font-display text-lg font-bold tabular-nums text-foreground">
              {item.value}
            </dd>
          </div>
        ))}
      </dl>
    </section>
  );
}
