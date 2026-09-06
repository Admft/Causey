import { fetchWithTimeout } from "@/lib/browser-fetch";

function geolocationAllowedByPolicy(): boolean {
  if (typeof document === "undefined") return true;
  const doc = document as Document & {
    permissionsPolicy?: { allowsFeature?: (feature: string) => boolean };
    featurePolicy?: { allowsFeature?: (feature: string) => boolean };
  };
  const allows =
    doc.permissionsPolicy?.allowsFeature?.("geolocation") ??
    doc.featurePolicy?.allowsFeature?.("geolocation");
  return allows !== false;
}

export async function requestNearestZip(): Promise<
  { ok: true; zip: string } | { ok: false; error: string }
> {
  if (typeof window === "undefined" || !navigator.geolocation) {
    return {
      ok: false,
      error: "This browser cannot share a location. Type a 5-digit zip instead.",
    };
  }

  if (!geolocationAllowedByPolicy()) {
    return {
      ok: false,
      error:
        "This page is not allowed to ask for location. Type a 5-digit zip instead.",
    };
  }

  const position = await new Promise<GeolocationPosition>((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      enableHighAccuracy: false,
      timeout: 10000,
      maximumAge: 5 * 60 * 1000,
    });
  }).catch((err: GeolocationPositionError | Error) => err);

  if (!("coords" in position)) {
    const code =
      "code" in position && typeof position.code === "number"
        ? position.code
        : null;
    if (code === 1) {
      return {
        ok: false,
        error:
          "Allow location when the browser asks, or type a 5-digit zip instead.",
      };
    }
    return {
      ok: false,
      error: "Could not read a location. Type a 5-digit zip instead.",
    };
  }

  let response: Response;
  try {
    response = await fetchWithTimeout("/api/geo/nearest-zip", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lat: position.coords.latitude,
        lng: position.coords.longitude,
      }),
    });
  } catch {
    // Geolocation already answered, so the person is waiting on us now.
    return {
      ok: false,
      error: "Could not reach the zip lookup. Type a 5-digit zip instead.",
    };
  }
  const payload = (await response.json().catch(() => null)) as
    | { zip?: string; error?: string }
    | null;
  if (!response.ok || !payload?.zip || !/^\d{5}$/.test(payload.zip)) {
    return {
      ok: false,
      error:
        payload?.error ??
        "Could not match that location to a zip. Type it instead.",
    };
  }
  return { ok: true, zip: payload.zip };
}
