import { describe, expect, it } from "vitest";
import { homePathForRole } from "@/lib/auth/home-path";

describe("homePathForRole", () => {
  it("sends parents to the family workspace", () => {
    expect(homePathForRole("parent")).toBe("/family");
  });

  it("sends coaches to orgs and students to their tournament plan", () => {
    expect(homePathForRole("coach")).toBe("/orgs");
    expect(homePathForRole("student")).toBe("/me");
  });

  it("falls back to /me when role is missing", () => {
    expect(homePathForRole(null)).toBe("/me");
    expect(homePathForRole(undefined)).toBe("/me");
    expect(homePathForRole("nope")).toBe("/me");
  });
});
