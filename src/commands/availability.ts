import { extractRestaurantUid } from "../scraper.ts";
import { getTickets, getTicketAvailability } from "../api.ts";
import { formatAvailabilityTable, formatError } from "../format.ts";
import { parseDateToIso } from "../date.ts";

export async function availability(args: {
  restaurantUrl: string;
  date: string;
  guests: number;
  ticket?: string;
}): Promise<void> {
  try {
    const uid = await extractRestaurantUid(args.restaurantUrl);
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
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

