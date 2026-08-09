import { describe, expect, it } from "vitest";
import {
  JOIN_CODE_ALPHABET,
  JOIN_CODE_LENGTH,
  formatJoinCode,
  isValidJoinCode,
  normalizeJoinCode,
} from "@/lib/org-codes";

describe("normalizeJoinCode", () => {
  it("uppercases and strips separators", () => {
    expect(normalizeJoinCode("bcdf-ghjk")).toBe("BCDFGHJK");
    expect(normalizeJoinCode(" bcdf ghjk ")).toBe("BCDFGHJK");
    expect(normalizeJoinCode("BC.DF_GH/JK")).toBe("BCDFGHJK");
  });

  it("keeps digits", () => {
    expect(normalizeJoinCode("2345-bcdf")).toBe("2345BCDF");
  });
});

describe("isValidJoinCode", () => {
  it("accepts a well-formed code in any casing", () => {
    expect(isValidJoinCode("BCDFGHJK")).toBe(true);
    expect(isValidJoinCode("bcdf-ghjk")).toBe(true);
    expect(isValidJoinCode("W2X3Y4Z5")).toBe(true);
    expect(isValidJoinCode("2P85-8DZ6")).toBe(true);
  });

  it("rejects wrong lengths", () => {
    expect(isValidJoinCode("BCDFGHJ")).toBe(false);
    expect(isValidJoinCode("BCDFGHJKM")).toBe(false);
    expect(isValidJoinCode("")).toBe(false);
  });

  it("rejects characters outside the alphabet (vowels, lookalikes)", () => {
    expect(isValidJoinCode("ACDFGHJK")).toBe(false); // A is a vowel
    expect(isValidJoinCode("BCDFGHJ0")).toBe(false); // 0 looks like O
    expect(isValidJoinCode("BCDFGHJ1")).toBe(false); // 1 looks like I/L
    expect(isValidJoinCode("LCDFGHJK")).toBe(false); // L excluded
  });

  it("alphabet matches the SQL generator: 28 unambiguous characters", () => {
    expect(JOIN_CODE_ALPHABET).toHaveLength(28);
    expect(JOIN_CODE_LENGTH).toBe(8);
    for (const ch of "AEIOU01L") {
      expect(JOIN_CODE_ALPHABET.includes(ch)).toBe(false);
    }
  });
});

describe("formatJoinCode", () => {
  it("groups 4-4 for display", () => {
    expect(formatJoinCode("BCDFGHJK")).toBe("BCDF-GHJK");
    expect(formatJoinCode("bcdfghjk")).toBe("BCDF-GHJK");
  });

  it("leaves non-standard lengths untouched", () => {
    expect(formatJoinCode("BCD")).toBe("BCD");
  });
});
