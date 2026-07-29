/**
 * Minimal iCalendar builder for all-day tournament events. Pure so it can
 * be tested with an injected timestamp; served by /event/[slug]/ics.
 */

function escapeText(value: string): string {
  return value
    .replace(/\\/g, "\\\\")
    .replace(/;/g, "\\;")
    .replace(/,/g, "\\,")
    .replace(/\r?\n/g, "\\n");
}

function dateDigits(iso: string): string {
  return iso.replace(/-/g, "");
}

/** iCal DTEND is exclusive: the day after the event's last day. */
function nextDay(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(y, m - 1, d + 1));
  return next.toISOString().slice(0, 10);
}

export function buildEventIcs(
  event: {
    slug: string;
    name: string;
    start_date: string;
    end_date: string | null;
    venue_name: string | null;
    address: string | null;
    city: string;
    state: string;
    zip: string;
  },
  now: Date = new Date()
): string {
  const stamp = now.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
  const location = [event.venue_name, event.address, `${event.city}, ${event.state} ${event.zip}`]
    .filter(Boolean)
    .join(", ");
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Causey//Tournaments//EN",
    "BEGIN:VEVENT",
    `UID:${event.slug}@causey.dev`,
    `DTSTAMP:${stamp}`,
    `DTSTART;VALUE=DATE:${dateDigits(event.start_date)}`,
    `DTEND;VALUE=DATE:${dateDigits(nextDay(event.end_date ?? event.start_date))}`,
    `SUMMARY:${escapeText(event.name)}`,
    `LOCATION:${escapeText(location)}`,
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return lines.join("\r\n") + "\r\n";
}
