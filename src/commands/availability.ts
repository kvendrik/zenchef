import { extractRestaurantInfo } from "../scraper.ts";
import { getTickets, getTicketAvailability } from "../api.ts";
import * as zenchefApi from "../zenchef-api.ts";
import {
  formatAvailabilityTable,
  formatZenchefAvailabilityTable,
  formatError,
} from "../format.ts";
import { parseDateToIso } from "../date.ts";

export async function availability(args: {
  restaurantUrl: string;
  date: string;
  guests: number;
  ticket?: string;
}): Promise<void> {
  try {
    const { uid, system } = await extractRestaurantInfo(args.restaurantUrl);

    if (system === "zenchef") {
      await zenchefAvailability(uid, args);
    } else {
      await formitableAvailability(uid, args);
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

async function formitableAvailability(
  uid: string,
  args: { date: string; guests: number; ticket?: string }
) {
  const isoDatetime = parseDateToIso(args.date);

  const tickets = await getTickets(uid, isoDatetime, args.guests);
  if (tickets.length === 0) {
    console.log(formatError("No tickets/experiences found for this date."));
    process.exit(1);
  }

  const filtered = args.ticket
    ? tickets.filter((t) => t.uid === args.ticket)
    : tickets;

  if (filtered.length === 0) {
    console.log(
      formatError(`Ticket "${args.ticket}" not found. Available tickets:`)
    );
    for (const t of tickets) {
      console.log(`  ${t.uid}  ${t.title}`);
    }
    process.exit(1);
  }

  for (const ticket of filtered) {
    const slots = await getTicketAvailability(
      uid,
      ticket.uid,
      isoDatetime,
      args.guests
    );
    console.log(formatAvailabilityTable(ticket, slots));
    console.log();
  }
}

async function zenchefAvailability(
  uid: string,
  args: { date: string; guests: number; ticket?: string }
) {
  // Parse DD/MM to YYYY-MM-DD
  const isoDatetime = parseDateToIso(args.date);
  const dateOnly = isoDatetime.split("T")[0]!;

  const days = await zenchefApi.getAvailabilities(uid, dateOnly);
  if (days.length === 0) {
    console.log(formatError("No availability data for this date."));
    process.exit(1);
  }

  const day = days[0]!;
  const shifts = day.shifts;

  if (shifts.length === 0) {
    console.log(formatError("No shifts available for this date."));
    process.exit(1);
  }

  // If --ticket is provided, treat it as a shift ID filter
  const filtered = args.ticket
    ? shifts.filter((s) => String(s.id) === args.ticket)
    : shifts;

  if (filtered.length === 0) {
    console.log(
      formatError(`Shift "${args.ticket}" not found. Available shifts:`)
    );
    for (const s of shifts) {
      console.log(`  ${s.id}  ${s.name}`);
    }
    process.exit(1);
  }

  for (const shift of filtered) {
    // Filter slots where the guest count is possible
    const relevantSlots = shift.shift_slots.filter(
      (slot) =>
        !slot.closed &&
        !slot.marked_as_full &&
        (slot.possible_guests.includes(args.guests) ||
          slot.waitlist_possible_guests.includes(args.guests))
    );
    console.log(
      formatZenchefAvailabilityTable(shift, relevantSlots, args.guests)
    );
    console.log();
  }
}
