const DEFAULT_PUBLIC_URL = "https://causey.dev";

function publicUrl() {
  return (process.env.CAUSEY_PUBLIC_URL ?? DEFAULT_PUBLIC_URL).replace(
    /\/+$/,
    ""
  );
}

async function getJson(url) {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    signal: AbortSignal.timeout(15000),
  });
  const body = await response.json().catch(() => null);
  return { response, body };
}

function fail(message) {
  console.error(`public-directory smoke: ${message}`);
  process.exitCode = 1;
}

async function main() {
  const origin = publicUrl();
  const searchUrl = `${origin}/api/competitions?category=chess&limit=1`;
  const search = await getJson(searchUrl);
  if (!search.response.ok) {
    fail(`${searchUrl} returned ${search.response.status}`);
    return;
  }
  if (search.body?.error) {
    fail(`${searchUrl} returned error: ${search.body.error}`);
    return;
  }
  if (!Array.isArray(search.body?.results)) {
    fail(`${searchUrl} did not return a results array`);
    return;
  }

  const slug = search.body.results[0]?.slug;
  if (slug) {
    const eventUrl = `${origin}/api/competitions/${slug}`;
    const event = await getJson(eventUrl);
    if (!event.response.ok) {
      fail(`${eventUrl} returned ${event.response.status}`);
      return;
    }
    if (event.body?.error) {
      fail(`${eventUrl} returned error: ${event.body.error}`);
      return;
    }
  }

  const pathwaysUrl = `${origin}/api/pathways`;
  const pathways = await getJson(pathwaysUrl);
  if (!pathways.response.ok) {
    fail(`${pathwaysUrl} returned ${pathways.response.status}`);
    return;
  }
  if (pathways.body?.error) {
    fail(`${pathwaysUrl} returned error: ${pathways.body.error}`);
    return;
  }

  console.log(
    `Unsigned public directory answered at ${origin} (search, event, pathways).`
  );
}

main().catch((error) => {
  fail(error instanceof Error ? error.message : String(error));
});
