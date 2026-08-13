/**
 * Public-facing list of tournament hubs Causey indexes (or will index).
 * Logos + copy live in lib/ingestion-sources.ts (keep migration 0007 in sync).
 */
export {
  INGESTION_SOURCES as TOURNAMENT_SOURCES,
  sourceByCompetitionSource,
  sourceById,
  type IngestionSource as TournamentSource,
  type IngestionSourceStatus as TournamentSourceStatus,
} from "@/lib/ingestion-sources";

import { INGESTION_SOURCES } from "@/lib/ingestion-sources";

export const LIVE_SOURCES = INGESTION_SOURCES.filter(
  (source) => source.category === "chess" && source.status === "live"
);
export const SOON_SOURCES = INGESTION_SOURCES.filter(
  (source) => source.category === "chess" && source.status === "soon"
);
