import { extractRestaurantInfo } from "../scraper.ts";
import {
  getTickets,
  getTicketAvailability,
  getPaymentMethods,
  createBooking,
  getPaymentUrl,
} from "../api.ts";
import * as zenchefApi from "../zenchef-api.ts";
import {
  formatTicketHeader,
  formatPaymentMethod,
  formatError,
  formatSuccess,
  formatZenchefShiftHeader,
} from "../format.ts";
import { parseDateToIso } from "../date.ts";
import type { BookingPayload, ZenchefBookingPayload } from "../types.ts";

export async function book(args: {
  restaurantUrl: string;
  date: string;
  time: string;
  guests: number;
  ticket: string;
  name: string;
  email: string;
  phone: string;
  payment?: string;
}): Promise<void> {
  try {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(args.email)) {
      console.error(formatError(`Invalid email address "${args.email}".`));
      process.exit(1);
    }
    if (!/^\+?\d[\d\s\-()]{6,}$/.test(args.phone)) {
      console.error(formatError(`Invalid phone number "${args.phone}". Include country code (e.g. +31612345678).`));
      process.exit(1);
    }

    const { uid, system } = await extractRestaurantInfo(args.restaurantUrl);

    if (system === "zenchef") {
      await zenchefBook(uid, args);
    } else {
      await formitableBook(uid, args);
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

async function formitableBook(
  uid: string,
  args: {
    date: string;
    time: string;
    guests: number;
    ticket: string;
    name: string;
    email: string;
    phone: string;
    payment?: string;
  }
) {
  const isoDatetime = parseDateToIso(args.date);

  const tickets = await getTickets(uid, isoDatetime, args.guests);
  const ticket = tickets.find((t) => t.uid === args.ticket);
  if (!ticket) {
    console.error(formatError(`Ticket "${args.ticket}" not found. Available tickets:`));
    for (const t of tickets) {
      console.log(`  ${t.uid}  ${t.title}`);
    }
    process.exit(1);
  }
  console.log(formatTicketHeader(ticket));
  console.log();

  const slots = await getTicketAvailability(uid, args.ticket, isoDatetime, args.guests);
  const slot = slots.find((s) => s.timeString === args.time);
  if (!slot) {
    console.error(formatError(`Time slot ${args.time} not found. Available times:`));
    for (const s of slots) {
      console.log(`  ${s.timeString} (${s.status})`);
    }
    process.exit(1);
  }

  if (slot.status !== "AVAILABLE") {
    const hint = slot.status === "FULL" || slot.status === "WAITLIST"
      ? " Consider using the waitlist command."
      : "";
    console.error(formatError(`Time slot ${args.time} is ${slot.status}.${hint}`));
    process.exit(1);
  }

  let paymentMethodId = "";
  if (ticket.deposit && ticket.price > 0) {
    const methods = await getPaymentMethods(uid, ticket.price * args.guests);
    if (!args.payment) {
      console.log("Payment required. Available methods:");
      for (const method of methods) {
        console.log(formatPaymentMethod(method));
      }
      console.error(formatError("Use --payment <method> to select a payment method (e.g. --payment ideal)"));
      process.exit(1);
    }
    const selected = methods.find((m) => m.id === args.payment);
    if (!selected) {
      console.error(formatError(`Unknown payment method "${args.payment}". Available:`));
      for (const method of methods) {
        console.log(formatPaymentMethod(method));
      }
      process.exit(1);
    }
    paymentMethodId = selected.id;
    console.log(`Payment: ${selected.description}${selected.paymentFee > 0 ? ` (+€${(selected.paymentFee / 100).toFixed(2)} fee)` : ""}`);
  }

  const nameParts = args.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const payload: BookingPayload = {
    booking: {
      title: "OTHER",
      firstName,
      lastName,
      email: args.email,
      telephone: args.phone,
      numberOfPeople: args.guests,
      bookingDate: isoDatetime,
      bookingTime: slot.timeString,
      bookingDuration: slot.maxDuration || ticket.bookingDuration,
      newsletter: false,
      culture: "en",
      source: "Widget",
      sendFeedbackMail: true,
      comments: "",
      color: "#3edca8",
      walkIn: false,
      companyName: "",
      company: false,
      short: true,
      tags: [],
    },
    ticketUid: args.ticket,
    paymentMethodId,
    issuerId: "",
    returnUrl: `https://widget.formitable.com/side/en/${uid}/finish`,
    promotionCode: null,
    voucherCode: null,
    source: "Widget",
  };

  printBookingSummary(firstName, lastName, args);

  console.log("Attempting booking...");
  const result = await createBooking(uid, payload);

  const bookingResult = result != null && typeof result === "object" ? result as Record<string, unknown> : {};
  const bookingUid = typeof bookingResult.bookingUid === "string" ? bookingResult.bookingUid : null;

  if (bookingUid) {
    console.log(formatSuccess(`Booking created: ${bookingUid}`));
    if (ticket.deposit && ticket.price > 0) {
      const payment = await getPaymentUrl(bookingUid);
      if (payment.paymentUrl) {
        console.log();
        console.log(`Payment URL: ${payment.paymentUrl}`);
      }
    }
  } else {
    console.log(formatSuccess("Booking response:"));
    console.log(JSON.stringify(result, null, 2));
  }
}

async function zenchefBook(
  uid: string,
  args: {
    date: string;
    time: string;
    guests: number;
    ticket: string;
    name: string;
    email: string;
    phone: string;
  }
) {
  const isoDatetime = parseDateToIso(args.date);
  const dateOnly = isoDatetime.split("T")[0]!;

  // Get availability to validate shift + time slot
  const days = await zenchefApi.getAvailabilities(uid, dateOnly);
  if (days.length === 0) {
    throw new Error("No availability data for this date.");
  }

  const day = days[0]!;
  const shift = day.shifts.find((s) => String(s.id) === args.ticket);
  if (!shift) {
    console.error(formatError(`Shift "${args.ticket}" not found. Available shifts:`));
    for (const s of day.shifts) {
      console.log(`  ${s.id}  ${s.name}`);
    }
    process.exit(1);
  }
  console.log(formatZenchefShiftHeader(shift));
  console.log();

  const slot = shift.shift_slots.find((s) => s.name === args.time);
  if (!slot) {
    console.error(formatError(`Time slot ${args.time} not found. Available times:`));
    for (const s of shift.shift_slots) {
      if (!s.closed && !s.marked_as_full) {
        console.log(`  ${s.name}`);
      }
    }
    process.exit(1);
  }

  if (slot.closed || slot.marked_as_full || !slot.possible_guests.includes(args.guests)) {
    const canWaitlist = slot.waitlist_possible_guests.includes(args.guests);
    const hint = canWaitlist ? " This slot supports waitlist — try the waitlist command." : "";
    console.error(formatError(`Time slot ${args.time} is not available for ${args.guests} guests.${hint}`));
    process.exit(1);
  }

  const nameParts = args.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  // Build offers array from slot offers
  const offers = slot.offers.map((o) => ({
    offer_id: o.id,
    count: args.guests,
  }));

  // Pick the first available room
  const roomId = slot.available_rooms?.[String(args.guests)]?.[0];

  const payload: ZenchefBookingPayload = {
    day: dateOnly,
    nb_guests: args.guests,
    time: args.time,
    lang: "en",
    firstname: firstName,
    lastname: lastName,
    civility: "mr",
    country: "nl",
    phone_number: args.phone,
    email: args.email,
    comment: "",
    custom_field: {},
    customersheet: {
      firstname: firstName,
      lastname: lastName,
      civility: "mr",
      phone: args.phone,
      email: args.email,
      optins: [],
      country: "nl",
      lang: "en",
    },
    wish: roomId ? { booking_room_id: roomId } : {},
    offers,
    type: "web",
  };

  printBookingSummary(firstName, lastName, args);

  console.log("Attempting booking...");
  const result = await zenchefApi.createBooking(uid, payload);

  if (result.uuid) {
    console.log(formatSuccess(`Booking created: ${result.uuid}`));
    console.log(`  Status: ${result.status}`);
  } else {
    console.log(formatSuccess("Booking response:"));
    console.log(JSON.stringify(result, null, 2));
  }
}

function printBookingSummary(
  firstName: string,
  lastName: string,
  args: { date: string; time: string; guests: number; email: string; phone: string }
) {
  console.log("Booking summary:");
  console.log(`  Name:    ${firstName} ${lastName}`);
  console.log(`  Email:   ${args.email}`);
  console.log(`  Phone:   ${args.phone}`);
  console.log(`  Date:    ${args.date}`);
  console.log(`  Time:    ${args.time}`);
  console.log(`  Guests:  ${args.guests}`);
  console.log();
}
