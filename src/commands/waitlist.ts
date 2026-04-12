import { extractRestaurantUid } from "../scraper.ts";
import { getTicketDetails, joinWaitlist } from "../api.ts";
import { formatError, formatSuccess } from "../format.ts";
import { parseDateToIso } from "../date.ts";
import type { WaitlistPayload } from "../types.ts";

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

    const uid = await extractRestaurantUid(args.restaurantUrl);
    const isoDatetime = parseDateToIso(args.date);
    const ticket = await getTicketDetails(uid, args.ticket);

    const nameParts = args.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ");

    // Build time range: requested time to requested time + duration
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
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

