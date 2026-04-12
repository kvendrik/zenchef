import type {
  Ticket,
  TimeSlot,
  PaymentMethod,
  BookingPayload,
  WaitlistPayload,
} from "./types.ts";

const BASE_URL = "https://widget-api.formitable.com/api";
const LANG = "en";

async function apiGet<T>(path: string): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`);
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

async function apiPost<T>(path: string, payload: unknown): Promise<T> {
  const response = await fetch(`${BASE_URL}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!response.ok) {
    const body = await response.text();
    throw new Error(`API error ${response.status}: ${body}`);
  }
  return response.json() as Promise<T>;
}

export function getTickets(
  restaurantUid: string,
  isoDatetime: string,
  guests: number
): Promise<Ticket[]> {
  return apiGet<Ticket[]>(
    `/product/${restaurantUid}/search/${isoDatetime}/${guests}/${LANG}`
  );
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

export function getAvailability(
  restaurantUid: string,
  isoDatetime: string,
  guests: number
): Promise<TimeSlot[]> {
  return apiGet<TimeSlot[]>(
    `/availability/${restaurantUid}/day/${isoDatetime}/${guests}/${LANG}`
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
