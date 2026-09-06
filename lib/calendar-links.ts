/**
 * Calendar URLs that work without native calendar APIs (Expo Go, simulators
 * with no writable calendar). DTEND is exclusive, matching /event/[slug]/ics.
 */

function dateDigits(iso: string): string {
  return iso.replace(/-/g, "");
}

function nextDay(iso: string): string {
  const [year, month, day] = iso.split("-").map(Number);
  const next = new Date(Date.UTC(year, month - 1, day + 1));
  return next.toISOString().slice(0, 10);
}

export function eventIcsUrl(apiOrigin: string, slug: string): string {
  const origin = apiOrigin.replace(/\/$/, "");
  return `${origin}/event/${encodeURIComponent(slug)}/ics`;
}

export function eventWebcalUrl(apiOrigin: string, slug: string): string {
  return eventIcsUrl(apiOrigin, slug)
    .replace(/^https:/, "webcal:")
    .replace(/^http:/, "webcal:");
}

export function googleCalendarTemplateUrl(input: {
  title: string;
  startDate: string;
  endDate: string | null;
  location: string | null;
  details: string | null;
}): string {
  const start = dateDigits(input.startDate);
  const end = dateDigits(nextDay(input.endDate ?? input.startDate));
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: input.title,
  });
  if (input.location) params.set("location", input.location);
  if (input.details) params.set("details", input.details);
  return `https://calendar.google.com/calendar/render?${params.toString()}&dates=${start}/${end}`;
}
