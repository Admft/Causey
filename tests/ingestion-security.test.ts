import { describe, expect, it, vi } from "vitest";
import {
  fetchPublicHtml,
  fetchResponseWithRetry,
  isPublicInternetAddress,
  validatePublicHttpUrl,
} from "@/ingestion/fetch-html";

const publicLookup = async () => [{ address: "93.184.216.34", family: 4 }];

describe("organizer fetch SSRF protection", () => {
  it("rejects local, private, link-local, metadata, and credentialed targets", async () => {
    expect(isPublicInternetAddress("127.0.0.1")).toBe(false);
    expect(isPublicInternetAddress("10.0.0.1")).toBe(false);
    expect(isPublicInternetAddress("169.254.169.254")).toBe(false);
    expect(isPublicInternetAddress("::1")).toBe(false);
    expect(isPublicInternetAddress("fe80::1")).toBe(false);
    expect(isPublicInternetAddress("2606:2800:220:1:248:1893:25c8:1946")).toBe(true);

    await expect(
      validatePublicHttpUrl("https://user:pass@example.com/", publicLookup)
    ).rejects.toThrow(/credentials/i);
    await expect(
      validatePublicHttpUrl("file:///etc/passwd", publicLookup)
    ).rejects.toThrow(/http or https/i);
    await expect(
      validatePublicHttpUrl("http://metadata.example/", async () => [
        { address: "169.254.169.254", family: 4 },
      ])
    ).rejects.toThrow(/non-public/i);
  });

  it("revalidates redirect destinations before fetching them", async () => {
    const fetchImpl = vi.fn(async () => {
      return new Response(null, {
        status: 302,
        headers: { location: "http://metadata.internal/latest/meta-data/" },
      });
    });
    const lookupImpl = async (hostname: string) =>
      hostname === "metadata.internal"
        ? [{ address: "169.254.169.254", family: 4 }]
        : [{ address: "93.184.216.34", family: 4 }];

    await expect(
      fetchPublicHtml("https://organizer.example/event", {
        fetchImpl: fetchImpl as typeof fetch,
        lookupImpl,
        maxAttempts: 1,
      })
    ).rejects.toThrow(/non-public/i);
    expect(fetchImpl).toHaveBeenCalledTimes(1);
  });
});

describe("fetch retries", () => {
  it("retries 429 and network failures with bounded backoff", async () => {
    const sleepImpl = vi.fn(async () => undefined);
    const responses: Array<Response | Error> = [
      new Error("socket reset"),
      new Response("slow down", { status: 429 }),
      new Response("ok", { status: 200 }),
    ];
    const fetchImpl = vi.fn(async () => {
      const next = responses.shift()!;
      if (next instanceof Error) throw next;
      return next;
    });

    const response = await fetchResponseWithRetry(
      "https://example.com",
      {},
      {
        fetchImpl: fetchImpl as typeof fetch,
        sleepImpl,
        randomImpl: () => 0,
        maxAttempts: 3,
      }
    );
    expect(await response.text()).toBe("ok");
    expect(fetchImpl).toHaveBeenCalledTimes(3);
    expect(sleepImpl).toHaveBeenCalledTimes(2);
  });
});
