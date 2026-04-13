import type {
  ZenchefAvailabilityDay,
  ZenchefOffer,
  ZenchefAuthToken,
  ZenchefBookingPayload,
  ZenchefRoom,
} from "./types.ts";

const BASE_URL = "https://bookings-middleware.zenchef.com";
const FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(
    () => controller.abort(new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`)),
    FETCH_TIMEOUT_MS
  );
  return fetch(url, { ...options, signal: controller.signal }).finally(() =>
    clearTimeout(timeout)
  );
}

async function apiGet<T>(endpoint: string, params: Record<string, string>): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/${endpoint}?${qs}`;
  const response = await fetchWithTimeout(url);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GET ${endpoint} failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(
  endpoint: string,
  params: Record<string, string>,
  payload: unknown,
  headers?: Record<string, string>
): Promise<T> {
  const qs = new URLSearchParams(params).toString();
  const url = `${BASE_URL}/${endpoint}?${qs}`;
  const response = await fetchWithTimeout(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST ${endpoint} failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}

export function getWidgetParams(restaurantId: string): Promise<{
  id: number;
  name: string;
  rooms: ZenchefRoom[];
  isDisabled: number;
  restaurantCountry: string;
}> {
  return apiGet("getWidgetParams", { restaurantId });
}

export function getAvailabilities(
  restaurantId: string,
  date: string
): Promise<ZenchefAvailabilityDay[]> {
  return apiGet<ZenchefAvailabilityDay[]>("getAvailabilities", {
    restaurantId,
    date_begin: date,
    date_end: date,
  });
}

export function getOffers(
  restaurantId: string
): Promise<ZenchefOffer[]> {
  return apiGet<ZenchefOffer[]>("getOffers", { restaurantId });
}

export function getAuthToken(
  restaurantId: string
): Promise<ZenchefAuthToken> {
  return apiGet<ZenchefAuthToken>("getAuthToken", { restaurantId });
}

export async function createBooking(
  restaurantId: string,
  payload: ZenchefBookingPayload
): Promise<{ id: number; uuid: string; status: string }> {
  const auth = await getAuthToken(restaurantId);
  return apiPost(
    "booking",
    { restaurantId },
    payload,
    {
      timestamp: String(auth.timestamp),
      "auth-token": auth.authToken,
    }
  );
}

export interface AvailabilitySummaryDay {
  date: string;
  isOpen: boolean;
  shifts: {
    id: number;
    name: string;
    name_translations: Record<string, string>;
    possible_guests: number[];
    waitlist_possible_guests: number[];
    closed: boolean;
  }[];
}

export function getAvailabilitiesSummary(
  restaurantId: string,
  dateBegin: string,
  dateEnd: string
): Promise<AvailabilitySummaryDay[]> {
  return apiGet<AvailabilitySummaryDay[]>("getAvailabilitiesSummary", {
    restaurantId,
    date_begin: dateBegin,
    date_end: dateEnd,
  });
}

export function getMandatoryFields(
  restaurantId: string
): Promise<Record<string, string>> {
  return apiGet<Record<string, string>>("getMandatoryFields", { restaurantId });
}
