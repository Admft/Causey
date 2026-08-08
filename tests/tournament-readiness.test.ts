import { describe, expect, it } from "vitest";
import {
  isLocationPublishReady,
  isTournamentPublishReady,
} from "@/lib/tournament-readiness";

const readyBase = {
  name: "Austin Open",
  start_date: "2026-09-12",
  city: "Austin",
  state: "TX",
  zip: "78701",
  lat: 30.27,
  lng: -97.74,
  reg_url: "https://example.com/register",
};

describe("tournament publish readiness", () => {
  it("marks complete location + details as ready", () => {
    expect(isLocationPublishReady(readyBase)).toBe(true);
    expect(isTournamentPublishReady(readyBase)).toBe(true);
  });

  it("rejects sentinel zip and zero coords", () => {
    expect(
      isTournamentPublishReady({
        ...readyBase,
        zip: "00000",
        lat: 0,
        lng: 0,
      })
    ).toBe(false);
  });

  it("rejects unknown place and missing registration", () => {
    expect(
      isTournamentPublishReady({
        ...readyBase,
        city: "Unknown",
        state: "XX",
      })
    ).toBe(false);
    expect(
      isTournamentPublishReady({
        ...readyBase,
        reg_url: null,
      })
    ).toBe(false);
  });
});
