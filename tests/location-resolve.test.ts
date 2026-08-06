import { describe, expect, it } from "vitest";
import {
  parseChessResultsLocation,
  pickPostalZip,
} from "@/ingestion/normalize-chess-results";
import { guessCityFromText, lookupCityZip } from "@/ingestion/geo";
import { parseFideLocation } from "@/ingestion/normalize-fide";

describe("pickPostalZip", () => {
  it("ignores street numbers that look like zips", () => {
    expect(
      pickPostalZip("Lakeside Upper School, 14050 1st Avenue NE, Seattle, WA, USA")
    ).toBeNull();
  });

  it("takes the zip after the state code", () => {
    expect(pickPostalZip("Houston, TX 77009")).toBe("77009");
    expect(
      pickPostalZip("250 Patton St Suite H, Houston, TX 77009")
    ).toBe("77009");
  });
});

describe("parseChessResultsLocation", () => {
  it("parses city/state/zip without treating venue as city", () => {
    expect(
      parseChessResultsLocation(
        "Lakeside Upper School, 14050 1st Avenue NE, Seattle, WA, USA"
      )
    ).toMatchObject({
      city: "Seattle",
      state: "WA",
      zip: null, // street number rejected; no real zip in string after state
    });
  });

  it("parses simple city, ST zip", () => {
    expect(parseChessResultsLocation("Houston, TX 77009")).toMatchObject({
      city: "Houston",
      state: "TX",
      zip: "77009",
    });
  });

  it("maps full state names", () => {
    expect(parseChessResultsLocation("Austin, Texas")).toMatchObject({
      city: "Austin",
      state: "TX",
    });
  });
});

describe("guessCityFromText", () => {
  const index = new Map([
    ["chicago|IL", "60601"],
    ["dallas|TX", "75201"],
    ["minneapolis|MN", "55401"],
  ]);

  it("pulls city from organizer names", () => {
    expect(guessCityFromText(index, "Chicago Chess Center", "IL")).toBe("Chicago");
    expect(guessCityFromText(index, "Dallas Chess Club", "TX")).toBe("Dallas");
    expect(lookupCityZip(index, "Chicago", "IL")).toBe("60601");
  });

  it("returns null when no city match", () => {
    expect(guessCityFromText(index, "Ed Mandell Chess Club", "MI")).toBeNull();
  });
});

describe("parseFideLocation", () => {
  it("parses City, State, USA", () => {
    expect(parseFideLocation("Saint Louis, Missouri, USA")).toMatchObject({
      city: "Saint Louis",
      state: "MO",
      country: "USA",
    });
  });

  it("parses City, State without country", () => {
    expect(parseFideLocation("Saint Louis, Missouri")).toMatchObject({
      city: "Saint Louis",
      state: "MO",
    });
  });
});
