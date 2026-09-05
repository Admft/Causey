/**
 * First state series (else first series, else first event) so the phone
 * explorer opens on a chain, same as `defaultPathwaySource` on the website.
 */
export function defaultPathwaySource(options: {
  series: { id: string; level: string }[];
  competitions: { id: string }[];
}): string {
  const stateSeries = options.series.find((series) => series.level === "state");
  const series = stateSeries ?? options.series[0];
  if (series) return `series:${series.id}`;
  const competition = options.competitions[0];
  return competition ? `competition:${competition.id}` : "";
}
