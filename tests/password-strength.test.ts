import { describe, expect, it } from "vitest";
import {
  PASSWORD_HINT,
  WEAK_PASSWORD_MESSAGE,
  isPasswordAcceptable,
  scorePassword,
} from "@/lib/password-strength";

describe("password strength", () => {
  it("rejects short, common, and one-class passwords", () => {
    expect(isPasswordAcceptable("")).toBe(false);
    expect(isPasswordAcceptable("short1A")).toBe(false);
    expect(isPasswordAcceptable("password")).toBe(false);
    expect(isPasswordAcceptable("password1")).toBe(false);
    expect(isPasswordAcceptable("abcdefgh")).toBe(false);
    expect(isPasswordAcceptable("Abcdefgh")).toBe(false);
    expect(isPasswordAcceptable("abcdefgh1")).toBe(false);
    expect(isPasswordAcceptable("AAAAAAAA")).toBe(false);
    expect(scorePassword("abc").label).toBe("Weak");
    expect(scorePassword("RiverOak").label).toBe("Fair");
    expect(isPasswordAcceptable("RiverOak")).toBe(false);
  });

  it("accepts mixed case plus a number, or a long passphrase", () => {
    expect(isPasswordAcceptable("RiverOak9")).toBe(true);
    expect(scorePassword("RiverOak9").label).toBe("Good");
    expect(isPasswordAcceptable("CorrectHorseBattery")).toBe(true);
    expect(scorePassword("RiverOak9!").label).toBe("Strong");
    expect(PASSWORD_HINT).toMatch(/mixed case and a number/);
    expect(WEAK_PASSWORD_MESSAGE).toMatch(/stronger password/);
  });
});
