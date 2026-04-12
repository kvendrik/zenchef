export async function extractRestaurantUid(
  restaurantUrl: string
): Promise<string> {
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

  // Pattern 1: iframe src with Formitable widget
  // <iframe src="https://widget.formitable.com/side/{lang}/{uid}/book?...">
  const iframeMatch = html.match(
    /widget\.formitable\.com\/side\/\w+\/([a-f0-9]{6,})\//i
  );
  if (iframeMatch?.[1]) return iframeMatch[1];

  // Pattern 2: widget div with data-restaurant attribute
  // <div class="ft-widget-b2" data-restaurant="{uid}" ...>
  const dataRestaurantMatch = html.match(
    /data-restaurant="([a-f0-9]{6,})"/i
  );
  if (dataRestaurantMatch?.[1]) return dataRestaurantMatch[1];

  // Pattern 3: widget div with data-group attribute
  // <div class="ft-widget-b2" data-group="{uid}" ...>
  const dataGroupMatch = html.match(/data-group="([a-f0-9]{6,})"/i);
  if (dataGroupMatch?.[1]) return dataGroupMatch[1];

  throw new Error(
    "Could not find Formitable/Zenchef widget UID on this page. The restaurant may not use Formitable/Zenchef for reservations."
  );
}
