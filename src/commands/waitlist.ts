import { extractRestaurantInfo } from "../scraper.ts";
import { getTicketDetails, joinWaitlist } from "../api.ts";
import * as zenchefApi from "../zenchef-api.ts";
import { formatError, formatSuccess } from "../format.ts";
import { parseDateToIso } from "../date.ts";
import type { WaitlistPayload, ZenchefBookingPayload } from "../types.ts";

export async function waitlist(args: {
  restaurantUrl: string;
  date: string;
  time: string;
  guests: number;
  ticket: string;
  name: string;
  email: string;
  phone: string;
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
      await zenchefWaitlist(uid, args);
    } else {
      await formitableWaitlist(uid, args);
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

async function formitableWaitlist(
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
  const ticket = await getTicketDetails(uid, args.ticket);

  const nameParts = args.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  const timeParts = args.time.split(":");
  if (timeParts.length !== 2) {
    throw new Error(`Invalid time format "${args.time}". Expected HH:MM.`);
  }
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    throw new Error(`Invalid time "${args.time}". Hours must be 0-23, minutes must be 0-59.`);
  }
  const fromMinutes = hours * 60 + minutes;
  const untilMinutes = Math.min(fromMinutes + ticket.bookingDuration, 23 * 60 + 59);
  const untilHours = Math.floor(untilMinutes / 60);
  const untilMins = untilMinutes % 60;
  const untilTime = `${String(untilHours).padStart(2, "0")}:${String(untilMins).padStart(2, "0")}`;

  const payload: WaitlistPayload = {
    firstName,
    lastName,
    email: args.email,
    telephone: args.phone,
    culture: "en",
    date: isoDatetime,
    fromTime: args.time,
    untilTime,
    duration: ticket.bookingDuration,
    partySize: args.guests,
    productUid: args.ticket,
    sendNotifications: true,
  };

  console.log("Joining waitlist...");
  const result = await joinWaitlist(uid, payload);

  console.log(formatSuccess("Waitlist response received:"));
  console.log(JSON.stringify(result, null, 2));
}

async function zenchefWaitlist(
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

  // For Zenchef, waitlist is a booking with phase: "waiting_list"
  const nameParts = args.name.trim().split(/\s+/);
  const firstName = nameParts[0] ?? "";
  const lastName = nameParts.slice(1).join(" ");

  // Get offers for this shift
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

  const slot = shift.shift_slots.find((s) => s.name === args.time);
  const offers = slot?.offers.map((o) => ({ offer_id: o.id, count: args.guests })) ?? [];

  const payload: ZenchefBookingPayload & { phase: string; status: string } = {
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
    wish: { waiting_list: true } as any,
    offers,
    type: "web",
    phase: "waiting_list",
    status: "waiting",
  };

  console.log("Joining waitlist...");
  const auth = await zenchefApi.getAuthToken(uid);
  const response = await fetch(
    `https://bookings-middleware.zenchef.com/booking?restaurantId=${uid}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        timestamp: String(auth.timestamp),
        "auth-token": auth.authToken,
      },
      body: JSON.stringify(payload),
    }
  );

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Waitlist request failed (${response.status}): ${body}`);
  }

  const result = await response.json();
  console.log(formatSuccess("Waitlist response received:"));
  console.log(JSON.stringify(result, null, 2));
}
