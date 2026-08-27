import { StatCluster } from "@/components/AdminStatStrip";
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

  return <StatCluster label="Event pulse" items={items} />;
}
