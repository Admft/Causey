import {
  adminChartKnown,
  type AdminChartSegment,
  type AdminChartTone,
} from "@/lib/admin-charts";

const TONE_FILL: Record<AdminChartTone, string> = {
  attention: "bg-brand-red",
  progress: "bg-brand-red/45",
  ok: "bg-brand-blue",
  quiet: "bg-foreground/20",
};

function ChartUnavailable({ title }: { title: string }) {
  return (
    <p className="text-sm text-muted" role="status">
      {title} is unavailable. Reload and try again — missing counts are not
      zero.
    </p>
  );
}

function ChartLegend({
  bars,
}: {
  bars: { label: string; value: number; tone: AdminChartTone }[];
}) {
  return (
    <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
      {bars.map((bar) => (
        <li key={bar.label} className="flex items-center gap-1.5 text-xs text-muted-strong">
          <span
            aria-hidden="true"
            className={`h-2 w-2 shrink-0 rounded-sm ${TONE_FILL[bar.tone]}`}
          />
          <span>
            {bar.label}{" "}
            <span className="tabular-nums text-foreground">{bar.value}</span>
          </span>
        </li>
      ))}
    </ul>
  );
}

export function AdminMixChart({
  title,
  segments,
}: {
  title: string;
  segments: AdminChartSegment[];
}) {
  const bars = adminChartKnown(segments);
  if (!bars) return <ChartUnavailable title={title} />;

  const total = bars.reduce((sum, bar) => sum + bar.value, 0);

  return (
    <figure>
      <figcaption className="text-2xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </figcaption>
      {total === 0 ? (
        <p className="mt-2 text-sm text-muted">No records in this mix yet.</p>
      ) : (
        <div
          className="mt-2 flex h-3 overflow-hidden rounded-sm bg-surface-soft"
          role="img"
          aria-label={bars
            .map((bar) => `${bar.label} ${bar.value}`)
            .join(", ")}
        >
          {bars.map((bar) =>
            bar.value <= 0 ? null : (
              <span
                key={bar.label}
                title={`${bar.label}: ${bar.value}`}
                className={`h-full min-w-0.5 ${TONE_FILL[bar.tone]}`}
                style={{ width: `${(bar.value / total) * 100}%` }}
              />
            )
          )}
        </div>
      )}
      <ChartLegend bars={bars} />
    </figure>
  );
}

export function AdminBarChart({
  title,
  segments,
  unit = "",
}: {
  title: string;
  segments: AdminChartSegment[];
  unit?: string;
}) {
  const bars = adminChartKnown(segments);
  if (!bars) return <ChartUnavailable title={title} />;

  const max = Math.max(0, ...bars.map((bar) => bar.value));

  return (
    <figure>
      <figcaption className="text-2xs font-semibold uppercase tracking-wide text-muted">
        {title}
      </figcaption>
      {max === 0 ? (
        <p className="mt-2 text-sm text-muted">No values to plot yet.</p>
      ) : (
        <div
          className="mt-3 flex h-36 items-stretch gap-1.5"
          role="img"
          aria-label={bars
            .map((bar) => `${bar.label} ${bar.value}${unit ? ` ${unit}` : ""}`)
            .join(", ")}
        >
          {bars.map((bar, index) => {
            const height = max === 0 ? 0 : (bar.value / max) * 100;
            return (
              <div
                key={`${bar.label}-${index}`}
                className="flex min-w-0 flex-1 flex-col items-center"
              >
                <span className="text-2xs tabular-nums text-muted">
                  {bar.value}
                </span>
                <div className="mt-1 flex min-h-0 w-full flex-1 items-end">
                  <div
                    title={`${bar.label}: ${bar.value}${unit ? ` ${unit}` : ""}`}
                    className={`mx-auto w-full rounded-t-sm ${TONE_FILL[bar.tone]}`}
                    style={{
                      height: `${bar.value > 0 ? Math.max(6, height) : 0}%`,
                    }}
                  />
                </div>
                <span className="mt-1 w-full truncate text-center text-2xs text-muted">
                  {bar.label}
                </span>
              </div>
            );
          })}
        </div>
      )}
    </figure>
  );
}
