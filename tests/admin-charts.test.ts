import { describe, expect, it } from "vitest";
import {
  adminChartKnown,
  adminChartUnavailable,
  remainderCount,
  scrapeRunBarValue,
  scrapeRunTone,
} from "@/lib/admin-charts";

describe("admin chart helpers", () => {
  it("fails the whole mix closed when any count is missing", () => {
    expect(
      adminChartUnavailable([
        { value: 3 },
        { value: null },
        { value: 1 },
      ])
    ).toBe(true);
    expect(adminChartKnown([{ label: "A", value: 1, tone: "ok" }, { label: "B", value: null, tone: "quiet" }])).toBeNull();
  });

  it("keeps real zeros and does not invent a remainder", () => {
    expect(adminChartUnavailable([{ value: 0 }, { value: 4 }])).toBe(false);
    expect(remainderCount(10, 2)).toBe(8);
    expect(remainderCount(null, 2)).toBeNull();
    expect(remainderCount(10, null)).toBeNull();
  });

  it("does not treat a successful scrape with unknown rows as zero", () => {
    expect(
      scrapeRunBarValue({ status: "succeeded", rows_upserted: null })
    ).toBeNull();
    expect(scrapeRunBarValue({ status: "failed", rows_upserted: null })).toBe(0);
    expect(scrapeRunBarValue({ status: "succeeded", rows_upserted: 12 })).toBe(12);
    expect(scrapeRunTone("failed")).toBe("attention");
    expect(scrapeRunTone("succeeded")).toBe("ok");
  });
});
