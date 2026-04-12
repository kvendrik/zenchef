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
    const uid = await extractRestaurantUid(args.restaurantUrl);
    const isoDatetime = parseDateToIso(args.date);
    const ticket = await getTicketDetails(uid, args.ticket);

    const nameParts = args.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    // Build time range: requested time to requested time + duration
    const [hours, minutes] = args.time.split(":").map(Number);
    if (hours === undefined || minutes === undefined) {
      throw new Error(`Invalid time format "${args.time}". Expected HH:MM.`);
    }
    const fromMinutes = hours * 60 + minutes;
    const untilMinutes = fromMinutes + ticket.bookingDuration;
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

