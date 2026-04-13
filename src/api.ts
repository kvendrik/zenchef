import type {
  Ticket,
  TimeSlot,
  PaymentMethod,
  BookingPayload,
  WaitlistPayload,
} from "./types.ts";

const BASE_URL = "https://widget-api.formitable.com/api";
const LANG = "en";
const FETCH_TIMEOUT_MS = 15_000;

function fetchWithTimeout(url: string, options?: RequestInit): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(new Error(`Request timed out after ${FETCH_TIMEOUT_MS / 1000}s`)), FETCH_TIMEOUT_MS);
  return fetch(url, { ...options, signal: controller.signal }).finally(() => clearTimeout(timeout));
}

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetchWithTimeout(`${BASE_URL}${path}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`GET ${path} failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetchWithTimeout(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`POST ${path} failed (${response.status}): ${body}`);
  }
  return response.json() as Promise<T>;
}

export async function getTickets(
  restaurantUid: string,
  isoDatetime: string,
  guests: number
): Promise<Ticket[]> {
  // The Formitable search API is time-sensitive — restaurants with only
  // lunch or only dinner service return 0 tickets if queried at the wrong
  // time of day. Search multiple time points and deduplicate.
  const dateBase = isoDatetime.split("T")[0]!;
  const times = [
    `${dateBase}T10:00:00.000Z`,
    `${dateBase}T14:00:00.000Z`,
    `${dateBase}T18:00:00.000Z`,
  ];

  const results = await Promise.all(
    times.map((t) =>
      apiGet<Ticket[]>(
        `/product/${restaurantUid}/search/${t}/${guests}/${LANG}`
      )
    )
  );

  // Deduplicate by ticket UID
  const seen = new Set<string>();
  const tickets: Ticket[] = [];
  for (const batch of results) {
    for (const ticket of batch) {
      if (!seen.has(ticket.uid)) {
        seen.add(ticket.uid);
        tickets.push(ticket);
      }
    }
  }
  return tickets;
}

export function getTicketAvailability(
  restaurantUid: string,
  ticketUid: string,
  isoDatetime: string,
  guests: number
): Promise<TimeSlot[]> {
  return apiGet<TimeSlot[]>(
    `/availability/${restaurantUid}/ticket/day/${ticketUid}/${isoDatetime}/${guests}/${LANG}`
  );
}

export function getTicketDetails(
  restaurantUid: string,
  ticketUid: string
): Promise<Ticket> {
  return apiGet<Ticket>(
    `/product/${restaurantUid}/${ticketUid}/${LANG}?friendCode=null`
  );
}

export function getPaymentMethods(
  restaurantUid: string,
  amountInCents: number
): Promise<PaymentMethod[]> {
  return apiGet<PaymentMethod[]>(
    `/payments/${restaurantUid}/methods/${amountInCents}/TICKET`
  );
}

export function createBooking(
  restaurantUid: string,
  payload: BookingPayload
): Promise<unknown> {
  return apiPost<unknown>(`/booking/${restaurantUid}`, payload);
}

export function getPaymentUrl(
  bookingUid: string
): Promise<{ paymentUrl: string | null }> {
  return apiGet<{ paymentUrl: string | null }>(
    `/payments/url/booking/${bookingUid}`
  );
}

export function joinWaitlist(
  restaurantUid: string,
  payload: WaitlistPayload
): Promise<unknown> {
  return apiPost<unknown>(`/waitlist/${restaurantUid}`, payload);
}

export interface MonthDay {
  day: number;
  month: number;
  dayString: string;
  status: number;
  message: string;
}

export function getMonthAvailability(
  restaurantUid: string,
  month: number,
  year: number,
  guests: number
): Promise<MonthDay[]> {
  return apiGet<MonthDay[]>(
    `/availability/${restaurantUid}/month/${month}/${year}/${guests}/${LANG}`
  );
}
