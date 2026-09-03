import { describe, expect, it } from "vitest";
import {
  ageBandFromDateOfBirth,
  ageFromDateOfBirth,
  canPostPublicComments,
  parseDateOnly,
} from "@/lib/auth/age-band";

describe("parseDateOnly", () => {
  it("parses YYYY-MM-DD as local date", () => {
    const d = parseDateOnly("2015-06-15");
    expect(d?.getFullYear()).toBe(2015);
    expect(d?.getMonth()).toBe(5);
    expect(d?.getDate()).toBe(15);
  });

  it("rejects invalid calendar dates", () => {
    expect(parseDateOnly("2015-02-31")).toBeNull();
    expect(parseDateOnly("not-a-date")).toBeNull();
  });
});

describe("ageBandFromDateOfBirth", () => {
  const asOf = new Date(2026, 6, 28); // Jul 28, 2026

  it("maps ages to bands", () => {
    expect(ageBandFromDateOfBirth("2018-07-29", asOf)).toBe("u10");
    expect(ageFromDateOfBirth("2016-07-28", asOf)).toBe(10);
    expect(ageBandFromDateOfBirth("2016-07-28", asOf)).toBe("u12");
    expect(ageFromDateOfBirth("2014-07-28", asOf)).toBe(12);
    expect(ageBandFromDateOfBirth("2014-07-28", asOf)).toBe("u14");
    expect(ageFromDateOfBirth("2012-07-28", asOf)).toBe(14);
    expect(ageBandFromDateOfBirth("2012-07-28", asOf)).toBe("u18");
    expect(ageFromDateOfBirth("2008-07-28", asOf)).toBe(18);
    expect(ageBandFromDateOfBirth("2008-07-28", asOf)).toBe("18plus");
    expect(ageBandFromDateOfBirth("2000-01-01", asOf)).toBe("18plus");
  });

  it("uses birthday boundary correctly", () => {
    expect(ageFromDateOfBirth("2016-07-29", asOf)).toBe(9);
    expect(ageBandFromDateOfBirth("2016-07-29", asOf)).toBe("u10");
  });
});

describe("canPostPublicComments", () => {
  it("blocks under-13 and students without a date of birth", () => {
    const asOf = new Date();
    const month = String(asOf.getMonth() + 1).padStart(2, "0");
    const day = String(asOf.getDate()).padStart(2, "0");
    const thirteen = `${asOf.getFullYear() - 13}-${month}-${day}`;
    const twelve = `${asOf.getFullYear() - 12}-${month}-${day}`;
    expect(
      canPostPublicComments({
        date_of_birth: twelve,
        role: "student",
      })
    ).toBe(false);
    expect(
      canPostPublicComments({
        date_of_birth: thirteen,
        role: "student",
      })
    ).toBe(true);
    expect(
      canPostPublicComments({ date_of_birth: null, role: "student" })
    ).toBe(false);
    expect(
      canPostPublicComments({ date_of_birth: null, role: "coach" })
    ).toBe(true);
  });
});
