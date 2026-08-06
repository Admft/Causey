import { describe, expect, it } from "vitest";
import { homePathForRole } from "@/lib/auth/home-path";

describe("homePathForRole", () => {
  it("sends parents to the family workspace", () => {
    expect(homePathForRole("parent")).toBe("/family");
  });

  it("sends coaches and students to orgs", () => {
    expect(homePathForRole("coach")).toBe("/orgs");
    expect(homePathForRole("student")).toBe("/orgs");
  });

  it("falls back to /me when role is missing", () => {
    expect(homePathForRole(null)).toBe("/me");
    expect(homePathForRole(undefined)).toBe("/me");
    expect(homePathForRole("nope")).toBe("/me");
  });
});
