export type WidgetSystem = "formitable" | "zenchef";

export interface ScrapeResult {
  uid: string;
  system: WidgetSystem;
}

export interface Ticket {
  uid: string;
  title: string;
  description: string;
  price: number;
  deposit: boolean;
  minPartySize: number;
  maxPartySize: number;
  refundPolicy: string;
  bookingDuration: number;
  image: string;
  color: string;
  areaId: number;
  areaName: string | null;
  showEndTime: boolean;
}

export interface TimeSlot {
  timeString: string;
  displayTime: string;
  time: string;
  status: "AVAILABLE" | "FULL" | "WAITLIST" | string;
  showEndTime: boolean;
  maxDuration: number;
  area: string;
  showAreaToGuest: boolean;
  partySize: number;
  minutes: number;
  waitlistAutoNotify: boolean;
  isExclusive: boolean;
  spotsTotal: number;
  spotsOpen: number;
}

export interface PaymentMethod {
  id: string;
  description: string;
  paymentFee: number;
  image: { url?: string } | null;
}

export interface BookingPayload {
  booking: {
    title: string;
    firstName: string;
    lastName: string;
    email: string;
    telephone: string;
    numberOfPeople: number;
    bookingDate: string;
    bookingTime: string;
    bookingDuration: number;
    newsletter: boolean;
    culture: string;
    source: string;
    sendFeedbackMail: boolean;
    comments: string;
    color: string;
    walkIn: boolean;
    companyName: string;
    company: boolean;
    short: boolean;
    tags: string[];
  };
  ticketUid: string;
  paymentMethodId: string | null;
  issuerId: string;
  returnUrl: string;
  promotionCode: string | null;
  voucherCode: string | null;
  source: string;
}

export interface WaitlistPayload {
  firstName: string;
  lastName: string;
  email: string;
  telephone: string;
  culture: string;
  date: string;
  fromTime: string;
  untilTime: string;
  duration: number;
  partySize: number;
  productUid: string;
  sendNotifications: boolean;
}

// --- Zenchef API types ---

export interface ZenchefShiftSlot {
  name: string;
  slot_name: string;
  possible_guests: number[];
  waitlist_possible_guests: number[];
  closed: boolean;
  marked_as_full: boolean;
  occupation: {
    scheduled: { available: number };
    waitlist: { available: number };
  };
  offers: {
    id: number;
    possible_guests: number[];
    rooms: number[];
  }[];
  available_rooms: Record<string, number[]>;
}

export interface ZenchefShift {
  id: number;
  name: string;
  name_translations: Record<string, string>;
  open: string;
  close: string;
  capacity: { min: number; max: number; total_per_slot: number };
  is_offer_required: boolean;
  prepayment_param: {
    is_web_booking_askable: boolean;
    min_guests: number;
    charge_per_guests: number;
    deposit_type: string;
  } | null;
  cancelation_param: { enduser_cancelable_before: number } | null;
  shift_slots: ZenchefShiftSlot[];
  offers: ZenchefOffer[];
  bookable_rooms: number[];
}

export interface ZenchefAvailabilityDay {
  date: string;
  shifts: ZenchefShift[];
}

export interface ZenchefOffer {
  id: number;
  name: string;
  name_translations: Record<string, string>;
  description: Record<string, string>;
  is_active: boolean;
  is_highlighted: boolean;
  charge_per_guests: number;
  has_prepayment: boolean;
  picture: { url: string } | null;
  weekdays: Record<string, boolean>;
}

export interface ZenchefAuthToken {
  timestamp: number;
  authToken: string;
}

export interface ZenchefBookingPayload {
  day: string;
  nb_guests: number;
  time: string;
  lang: string;
  firstname: string;
  lastname: string;
  civility: string;
  country: string;
  phone_number: string;
  email: string;
  comment: string;
  custom_field: Record<string, unknown>;
  customersheet: {
    firstname: string;
    lastname: string;
    civility: string;
    phone: string;
    email: string;
    optins: unknown[];
    country: string;
    lang: string;
  };
  wish: { booking_room_id?: number };
  offers: { offer_id: number; count: number }[];
  type: string;
}

export interface ZenchefRoom {
  id: number;
  name: string;
  name_translations: Record<string, string>;
}
