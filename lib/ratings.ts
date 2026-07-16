/**
 * USCF rating lookup — INTERFACE STUB ONLY. Not part of the MVP.
 *
 * Future "verified mode": a user enters their USCF ID, we look up their live
 * rating and grade-appropriate history from US Chess MSA
 * (https://www.uschess.org/msa/) and auto-compute section eligibility.
 * MSA has no API; this will be a scrape, same staging/review discipline as
 * ingestion/scrape-tla.ts.
 *
 * Nothing in the app may call this yet. It exists so the eligibility code has
 * a stable seam to plug into later.
 */

export interface RatingLookup {
  /** Resolve a USCF member ID to their current regular OTB rating. */
  getCurrentRating(uscfId: string): Promise<{
    uscfId: string;
    regularRating: number | null;
    expirationDate: string | null;
  }>;
}

export class NotImplementedRatingLookup implements RatingLookup {
  async getCurrentRating(): Promise<never> {
    throw new Error(
      "USCF/MSA rating lookup is not part of the MVP. See lib/ratings.ts for the plan."
    );
  }
}
