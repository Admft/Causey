export type AdminChartTone = "attention" | "progress" | "ok" | "quiet";

export type AdminChartSegment = {
  label: string;
  value: number | null;
  tone: AdminChartTone;
};

/** Any failed count fails the whole chart closed — never draw a fake zero. */
export function adminChartUnavailable(
  segments: readonly { value: number | null }[]
): boolean {
  return segments.some((segment) => segment.value === null);
}

export function adminChartKnown(
  segments: readonly AdminChartSegment[]
): { label: string; value: number; tone: AdminChartTone }[] | null {
  if (adminChartUnavailable(segments)) return null;
  return segments.map((segment) => ({
    label: segment.label,
    value: segment.value as number,
    tone: segment.tone,
  }));
}

export function remainderCount(
  total: number | null,
  part: number | null
): number | null {
  if (total === null || part === null) return null;
  return Math.max(0, total - part);
}

export function scrapeRunBarValue(run: {
  status: "running" | "succeeded" | "failed";
  rows_upserted: number | null;
}): number | null {
  if (run.status === "succeeded" && run.rows_upserted === null) return null;
  return run.rows_upserted ?? 0;
}

export function scrapeRunTone(status: "running" | "succeeded" | "failed"): AdminChartTone {
  if (status === "failed") return "attention";
  if (status === "running") return "progress";
  return "ok";
}
