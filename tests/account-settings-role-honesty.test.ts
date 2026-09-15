import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import {
  notificationPreferenceChoicesForRole,
  preferenceKeyAppliesToRole,
} from "@/lib/notifications";

const read = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("account settings role honesty", () => {
  it("scopes guardian routing to students and RSVP updates to coaches", () => {
    expect(preferenceKeyAppliesToRole("guardian_routing", "student")).toBe(
      true
    );
    expect(preferenceKeyAppliesToRole("guardian_routing", "parent")).toBe(
      false
    );
    expect(preferenceKeyAppliesToRole("guardian_routing", "coach")).toBe(
      false
    );
    expect(preferenceKeyAppliesToRole("rsvp_update", "coach")).toBe(true);
    expect(preferenceKeyAppliesToRole("rsvp_update", "student")).toBe(false);
    expect(preferenceKeyAppliesToRole("rsvp_update", "parent")).toBe(false);

    const parentKeys = notificationPreferenceChoicesForRole("parent").map(
      (choice) => choice.key
    );
    expect(parentKeys).not.toContain("guardian_routing");
    expect(parentKeys).not.toContain("rsvp_update");

    const studentKeys = notificationPreferenceChoicesForRole("student").map(
      (choice) => choice.key
    );
    expect(studentKeys).toContain("guardian_routing");
    expect(studentKeys).not.toContain("rsvp_update");

    const coachKeys = notificationPreferenceChoicesForRole("coach").map(
      (choice) => choice.key
    );
    expect(coachKeys).toContain("rsvp_update");
    expect(coachKeys).not.toContain("guardian_routing");
  });

  it("wires Account alerts, grade, and Leave to the signed-in person type", () => {
    const account = read("app/account/page.tsx");
    const form = read("components/NotificationPreferencesForm.tsx");
    const profileEditor = read("components/ProfileEditor.tsx");
    const leave = read("components/LeaveOrgButton.tsx");
    const save = read("lib/actions/district.ts");

    expect(account).toContain("role={profile.role}");
    expect(form).toContain("notificationPreferenceChoicesForRole");
    expect(save).toContain("preferenceKeyAppliesToRole");
    expect(save).toContain('"guardian_routing"');
    expect(save).toContain('"rsvp_update"');
    expect(save).toContain("profile.role");

    expect(profileEditor).toContain('profile.role === "student"');
    expect(profileEditor).toContain("Grade");

    expect(account).toContain("LeaveOrgButton");
    expect(account).toContain("row.memberRole");
    expect(account).toContain("owner_profile_id !== profile.id");
    expect(leave).toContain("Leave this school");
    expect(leave).toContain("Leave this district");
    expect(leave).toContain("Claim another invitation");
  });
});
