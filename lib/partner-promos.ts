import type { DiscoveryCategory } from "@/lib/category-discovery";
import type { CompetitionRef } from "@/lib/data/types";
import type { Series } from "@/lib/schemas";

/**
 * Labeled pins above a category's result list. Not search ranking.
 * Swap copy when a partner sends written pathway rules; do not invent a
 * second partner until that deal exists.
 */
export type PartnerPromo = {
  id: string;
  category: DiscoveryCategory;
  eyebrow: string;
  headline: string;
  dek: string;
  honesty: string;
  ctaLabel: string;
  href: string;
};

export const PARTNER_PROMOS: readonly PartnerPromo[] = [
  {
    id: "us-chess-nationals",
    category: "chess",
    eyebrow: "Chess pathways",
    headline: "Get your kid to chess nationals",
    dek: "Start in local events, win your state championship, then a national invitational can open. Walk the current chess pathways.",
    honesty:
      "Not an official US Chess ruling. Confirm every invitation with the published announcement.",
    ctaLabel: "See the pathways",
    href: "/pathways",
  },
];

/**
 * The climb the pin is selling. Names only the three levels — not a
 * specific invitational, and not a US Chess ruling.
 */
export const CHESS_PATHWAY_STEPS = [
  {
    id: "local",
    mark: "01",
    name: "Local",
    line: "Play rated sections near home.",
  },
  {
    id: "state",
    mark: "02",
    name: "State",
    line: "Win the state championship.",
  },
  {
    id: "national",
    mark: "03",
    name: "Nationals",
    line: "Then a national invitational can open.",
  },
] as const;

export type PartnerPromoLayout = "featured" | "search";

export function partnerPromoForCategory(
  category: DiscoveryCategory
): PartnerPromo | null {
  return PARTNER_PROMOS.find((promo) => promo.category === category) ?? null;
}

/** First state series (else first series, else first event) so /pathways shows a chain. */
export function defaultPathwaySource(options: {
  series: Pick<Series, "id" | "level">[];
  competitions: Pick<CompetitionRef, "id">[];
}): string {
  const stateSeries = options.series.find((series) => series.level === "state");
  const series = stateSeries ?? options.series[0];
  if (series) return `series:${series.id}`;
  const competition = options.competitions[0];
  return competition ? `competition:${competition.id}` : "";
}
