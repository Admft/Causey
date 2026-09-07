import { describe, expect, it, vi } from "vitest";
import { isConnectTimeoutError } from "@/ingestion/fetch-html";
import { stageChessSources } from "@/ingestion/scrape-all";

describe("scrape:all source isolation", () => {
  it("keeps earlier and later stages when FIDE staging fails", async () => {
    const steps = [
      { label: "TLA", script: "tla.ts", source: "tla_scrape" },
      { label: "FIDE", script: "fide.ts", source: "fide_calendar_scrape" },
      { label: "TCA", script: "tca.ts", source: "tca_scrape" },
    ];
    const ran: string[] = [];
    const result = await stageChessSources(
      steps,
      async (script) => {
        ran.push(script);
        if (script === "fide.ts") {
          throw new Error("ingestion/scrape-fide.ts exited with code 1");
        }
      },
      process.env
    );
    expect(ran).toEqual(["tla.ts", "fide.ts", "tca.ts"]);
    expect(result.staged).toEqual(["tla_scrape", "tca_scrape"]);
    expect(result.failures).toEqual([
      {
        label: "FIDE",
        source: "fide_calendar_scrape",
        message: "ingestion/scrape-fide.ts exited with code 1",
      },
    ]);
  });
});

describe("connect timeout detection", () => {
  it("recognizes undici connect timeouts so hub fetches can retry then fail closed", () => {
    const error = new TypeError("fetch failed", {
      cause: { code: "UND_ERR_CONNECT_TIMEOUT", message: "Connect Timeout Error" },
    });
    expect(isConnectTimeoutError(error)).toBe(true);
    expect(isConnectTimeoutError(new Error("socket reset"))).toBe(false);
  });
});

describe("fetch retries log between attempts", () => {
  it("does not swallow the last network error", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    const { fetchResponseWithRetry } = await import("@/ingestion/fetch-html");
    const fetchImpl = vi.fn(async () => {
      throw new TypeError("fetch failed", {
        cause: { code: "UND_ERR_CONNECT_TIMEOUT" },
      });
    });
    await expect(
      fetchResponseWithRetry(
        "https://calendar.fide.com/calendar.php",
        {},
        {
          fetchImpl: fetchImpl as typeof fetch,
          sleepImpl: async () => undefined,
          randomImpl: () => 0,
          maxAttempts: 3,
        }
      )
    ).rejects.toMatchObject({ message: "fetch failed" });
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(warn).toHaveBeenCalledTimes(2);
    warn.mockRestore();
  });
});
