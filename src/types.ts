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
  paymentMethodId: string;
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
