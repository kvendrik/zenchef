import type { ScrapeResult } from "./types.ts";

export async function extractRestaurantInfo(
  restaurantUrl: string
): Promise<ScrapeResult> {
  let url = restaurantUrl;
  if (!/^https?:\/\//i.test(url)) {
    url = `https://${url}`;
  }
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error("Request timed out after 15s")), 15_000);
  const response = await fetch(url, { signal: controller.signal }).finally(() => clearTimeout(timeout));
  if (!response.ok) {
    throw new Error(
      `Failed to fetch ${restaurantUrl}: ${response.status} ${response.statusText}`
    );
  }

  const html = await response.text();
  const baseUrl = new URL(response.url);

  // Try static HTML first
  const staticResult = extractFromHtml(html);
  if (staticResult) return staticResult;

  // If not found, scan linked JS bundles for client-side rendered widgets
  const jsResult = await extractFromJsBundles(html, baseUrl);
  if (jsResult) return jsResult;

  throw new Error(
    "Could not find Formitable/Zenchef widget UID on this page. The restaurant may not use Formitable/Zenchef for reservations."
  );
}

function extractFromHtml(html: string): ScrapeResult | null {
  // --- Zenchef SDK detection ---
  // <script src="https://sdk.zenchef.com/v1/sdk.min.js">
  // <div class="zc-widget-config" data-restaurant="379003">
  const isZenchef =
    html.includes("sdk.zenchef.com") ||
    html.includes("zc-widget-config");

  if (isZenchef) {
    // Zenchef UIDs can be numeric (not hex)
    // Match both HTML (data-restaurant="123") and JS (data-restaurant":"123") formats
    const zcMatch = html.match(/data-restaurant["=:]+["']?(\d+)["']?/i);
    if (zcMatch?.[1]) {
      return { uid: zcMatch[1], system: "zenchef" };
    }
  }

  // --- Formitable detection ---

  // Pattern 1: iframe src with Formitable widget
  const iframeMatch = html.match(
    /widget\.formitable\.com\/side\/\w+\/([a-f0-9]{6,})\//i
  );
  if (iframeMatch?.[1]) return { uid: iframeMatch[1], system: "formitable" };

  // Pattern 2: widget div with data-restaurant attribute (Formitable hex UIDs)
  // Match both HTML (="uid") and JS bundle (":"uid") formats
  const dataRestaurantMatch = html.match(
    /data-restaurant["=:]+["']?([a-f0-9]{6,})["']?/i
  );
  if (dataRestaurantMatch?.[1]) return { uid: dataRestaurantMatch[1], system: "formitable" };

  // Pattern 3: widget div with data-group attribute
  const dataGroupMatch = html.match(/data-group["=:]+["']?([a-f0-9]{6,})["']?/i);
  if (dataGroupMatch?.[1]) return { uid: dataGroupMatch[1], system: "formitable" };

  return null;
}

async function extractFromJsBundles(
  html: string,
  baseUrl: URL
): Promise<ScrapeResult | null> {
  // Find JS bundle URLs (Nuxt, Next.js, Vite, etc.)
  const scriptUrls: string[] = [];
  const scriptRegex = /["']([^"'\s]*\.js)["']/gi;
  let match;
  while ((match = scriptRegex.exec(html)) !== null) {
    const src = match[1]!;
    // Skip common libraries that won't contain widget config
    if (
      src.includes("polyfill") ||
      src.includes("framework") ||
      src.includes("webpack") ||
      src.includes("vendor")
    ) {
      continue;
    }
    try {
      const absolute = new URL(src, baseUrl).href;
      scriptUrls.push(absolute);
    } catch {
      // Invalid URL, skip
    }
  }

  if (scriptUrls.length === 0) return null;

  // Fetch bundles in parallel (limit to 10 to avoid hammering)
  const fetches = scriptUrls.slice(0, 10).map(async (jsUrl) => {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10_000);
      const res = await fetch(jsUrl, { signal: controller.signal }).finally(() =>
        clearTimeout(timeout)
      );
      if (!res.ok) return null;
      const js = await res.text();
      return extractFromHtml(js);
    } catch {
      return null;
    }
  });

  const results = await Promise.all(fetches);
  return results.find((r) => r !== null) ?? null;
}

/** @deprecated Use extractRestaurantInfo instead */
export async function extractRestaurantUid(
  restaurantUrl: string
): Promise<string> {
  const result = await extractRestaurantInfo(restaurantUrl);
  return result.uid;
}
