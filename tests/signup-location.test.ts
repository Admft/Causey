import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { stateForZip } from "@/lib/zip-state";

function source(path: string) {
  return readFileSync(resolve(process.cwd(), path), "utf8");
}

describe("signup location capture", () => {
  it("resolves a US state from the located zip", () => {
    expect(stateForZip("75201")).toBe("TX");
    expect(stateForZip("10001")).toBe("NY");
    expect(stateForZip("invalid")).toBeNull();
  });

  it("places the location action under State and fills both fields", () => {
    const signup = source("components/SignupForm.tsx");
    const stateField = signup.indexOf('htmlFor="signup-state"');
    const locationAction = signup.indexOf("<UseLocationControl", stateField);
    const zipField = signup.indexOf("<ZipCaptureField", locationAction);

    expect(stateField).toBeGreaterThan(-1);
    expect(locationAction).toBeGreaterThan(stateField);
    expect(zipField).toBeGreaterThan(locationAction);
    expect(signup).toContain("setZip(locatedZip)");
    expect(signup).toContain("setState(locatedState)");
    expect(signup).toContain("showLocationControl={false}");
  });
});
