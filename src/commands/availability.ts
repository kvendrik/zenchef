import { extractRestaurantInfo } from "../scraper.ts";
import { getTickets, getTicketAvailability, getMonthAvailability } from "../api.ts";
import * as zenchefApi from "../zenchef-api.ts";
import type { Ticket, TimeSlot } from "../types.ts";
import {
  formatAvailabilityByTime,
  formatZenchefAvailabilityByTime,
  formatError,
} from "../format.ts";
import type { TicketSlotEntry, ZenchefShiftSlotEntry } from "../format.ts";
import { parseDateToIso } from "../date.ts";
import chalk from "chalk";

export async function availability(args: {
  restaurantUrl: string;
  guests: number;
  date?: string;
  month?: string;
  ticket?: string;
}): Promise<void> {
  try {
    const { uid, system } = await extractRestaurantInfo(args.restaurantUrl);

    if (args.date) {
      // Drill into a specific date — show time slots
      if (system === "zenchef") {
        await zenchefTimeSlots(uid, args as { date: string; guests: number; ticket?: string });
      } else {
        await formitableTimeSlots(uid, args as { date: string; guests: number; ticket?: string });
      }
    } else {
      // No date — show month overview
      const { month, year } = parseMonth(args.month);
      if (system === "zenchef") {
        await zenchefDates(uid, month, year, args.guests);
      } else {
        await formitableDates(uid, month, year, args.guests);
      }
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

// --- Month overview (no --date) ---

function parseMonth(monthStr?: string): { month: number; year: number } {
  const now = new Date();
  if (!monthStr) {
    return { month: now.getMonth() + 1, year: now.getFullYear() };
  }
  const parts = monthStr.split("/");
  if (parts.length !== 2) {
    throw new Error(`Invalid month format "${monthStr}". Expected MM/YYYY.`);
  }
  const month = Number(parts[0]);
  const year = Number(parts[1]);
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new Error(`Invalid month "${parts[0]}". Must be 1-12.`);
  }
  if (!Number.isInteger(year) || year < 2000) {
    throw new Error(`Invalid year "${parts[1]}".`);
  }
  return { month, year };
}

function formatMonthHeader(month: number, year: number): string {
  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];
  return chalk.bold(`${monthNames[month - 1]} ${year}`);
}

function weekdayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}

async function formitableDates(
  uid: string,
  month: number,
  year: number,
  guests: number
) {
  const days = await getMonthAvailability(uid, month, year, guests);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const futureDays = days.filter((d) => new Date(d.dayString + "T12:00:00") >= today);

  console.log(formatMonthHeader(month, year));
  console.log();

  const available = futureDays.filter((d) => d.status === 0 || d.status === 6);
  const waitlist = futureDays.filter((d) => d.status === 1 && d.message?.toLowerCase().includes("fully booked"));
  const closed = futureDays.filter((d) => d.status === 1 || d.status === 2);

  if (available.length === 0 && waitlist.length === 0) {
    console.log(chalk.dim("  No available dates this month."));
    console.log();
    console.log("Try a different month with --month MM/YYYY");
    return;
  }

  if (available.length > 0) {
    console.log(chalk.green(`  ${available.length} available date${available.length === 1 ? "" : "s"}:`));
    for (const d of available) {
      const weekday = weekdayName(d.dayString);
      console.log(`    ${chalk.white.bold(d.dayString)}  ${chalk.dim(weekday)}`);
    }
    console.log();
  }

  if (waitlist.length > 0) {
    console.log(chalk.yellow(`  ${waitlist.length} fully booked (waitlist may be available):`));
    for (const d of waitlist) {
      const weekday = weekdayName(d.dayString);
      console.log(`    ${chalk.dim(d.dayString)}  ${chalk.dim(weekday)}`);
    }
    console.log();
  }

  if (available.length > 0) {
    const first = available[0]!;
    const dd = String(first.day).padStart(2, "0");
    const mm = String(first.month).padStart(2, "0");
    console.log("Next step:");
    console.log(`  zenchef availability ${chalk.dim("<url>")} --date ${dd}/${mm} --guests ${guests}`);
  }
}

async function zenchefDates(
  uid: string,
  month: number,
  year: number,
  guests: number
) {
  const mm = String(month).padStart(2, "0");
  const daysInMonth = new Date(year, month, 0).getDate();
  const dateBegin = `${year}-${mm}-01`;
  const dateEnd = `${year}-${mm}-${String(daysInMonth).padStart(2, "0")}`;

  const days = await zenchefApi.getAvailabilitiesSummary(uid, dateBegin, dateEnd);

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  console.log(formatMonthHeader(month, year));
  console.log();

  const available: typeof days = [];
  const waitlistOnly: typeof days = [];

  for (const d of days) {
    if (new Date(d.date + "T12:00:00") < today) continue;
    if (!d.isOpen || d.shifts.length === 0) continue;

    const hasAvail = d.shifts.some(
      (s) => !s.closed && s.possible_guests.includes(guests)
    );
    const hasWaitlist = d.shifts.some(
      (s) => s.waitlist_possible_guests.includes(guests)
    );

    if (hasAvail) {
      available.push(d);
    } else if (hasWaitlist) {
      waitlistOnly.push(d);
    }
  }

  if (available.length === 0 && waitlistOnly.length === 0) {
    console.log(chalk.dim("  No available dates this month."));
    console.log();
    console.log("Try a different month with --month MM/YYYY");
    return;
  }

  if (available.length > 0) {
    console.log(chalk.green(`  ${available.length} available date${available.length === 1 ? "" : "s"}:`));
    for (const d of available) {
      const weekday = weekdayName(d.date);
      const shifts = d.shifts
        .filter((s) => !s.closed && s.possible_guests.includes(guests))
        .map((s) => s.name)
        .join(", ");
      console.log(`    ${chalk.white.bold(d.date)}  ${chalk.dim(weekday)}  ${chalk.dim(shifts)}`);
    }
    console.log();
  }

  if (waitlistOnly.length > 0) {
    console.log(chalk.yellow(`  ${waitlistOnly.length} waitlist-only date${waitlistOnly.length === 1 ? "" : "s"}:`));
    for (const d of waitlistOnly) {
      const weekday = weekdayName(d.date);
      console.log(`    ${chalk.dim(d.date)}  ${chalk.dim(weekday)}`);
    }
    console.log();
  }

  if (available.length > 0) {
    const first = available[0]!;
    const [, m, day] = first.date.split("-");
    console.log("Next step:");
    console.log(`  zenchef availability ${chalk.dim("<url>")} --date ${day}/${m} --guests ${guests}`);
  }
}

// --- Time slots (with --date) ---

async function formitableTimeSlots(
  uid: string,
  args: { date: string; guests: number; ticket?: string }
) {
  const isoDatetime = parseDateToIso(args.date);

  const tickets = await getTickets(uid, isoDatetime, args.guests);
  if (tickets.length === 0) {
    console.log(formatError("No tickets/experiences found for this date."));
    process.exit(1);
  }

  if (args.ticket && !tickets.some((t) => t.uid === args.ticket)) {
    console.log(
      formatError(`Ticket "${args.ticket}" not found. Available tickets:`)
    );
    for (const t of tickets) {
      console.log(`  ${t.uid}  ${t.title}`);
    }
    process.exit(1);
  }

  // Fetch availability for all tickets in parallel
  const ticketSlots = await Promise.all(
    tickets.map(async (ticket) => ({
      ticket,
      slots: await getTicketAvailability(uid, ticket.uid, isoDatetime, args.guests),
    }))
  );

  // Collect all unique times across all tickets
  const allTimes = new Map<string, string>(); // timeString -> displayTime
  for (const { slots } of ticketSlots) {
    for (const slot of slots) {
      if (!allTimes.has(slot.timeString)) {
        allTimes.set(slot.timeString, slot.displayTime);
      }
    }
  }

  if (allTimes.size === 0) {
    console.log(formatError("No time slots available for this date."));
    process.exit(1);
  }

  // Group by time: for each time, show all tickets
  const timeSlotMap = new Map<string, TicketSlotEntry[]>();
  for (const [timeString, displayTime] of allTimes) {
    const entries: TicketSlotEntry[] = [];
    for (const { ticket, slots } of ticketSlots) {
      if (args.ticket && ticket.uid !== args.ticket) continue;
      const slot = slots.find((s) => s.timeString === timeString) ?? null;
      entries.push({ ticket, slot });
    }
    timeSlotMap.set(displayTime, entries);
  }

  console.log(formatAvailabilityByTime(timeSlotMap));
}

async function zenchefTimeSlots(
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

  if (args.ticket && !shifts.some((s) => String(s.id) === args.ticket)) {
    console.log(
      formatError(`Shift "${args.ticket}" not found. Available shifts:`)
    );
    for (const s of shifts) {
      console.log(`  ${s.id}  ${s.name}`);
    }
    process.exit(1);
  }

  // Collect all unique slot times across all shifts
  const allTimes = new Set<string>();
  for (const shift of shifts) {
    for (const slot of shift.shift_slots) {
      allTimes.add(slot.name);
    }
  }

  if (allTimes.size === 0) {
    console.log(formatError("No time slots available for this date."));
    process.exit(1);
  }

  // Group by time: for each time, show all shifts
  const timeSlotMap = new Map<string, ZenchefShiftSlotEntry[]>();
  for (const time of allTimes) {
    const entries: ZenchefShiftSlotEntry[] = [];
    for (const shift of shifts) {
      if (args.ticket && String(shift.id) !== args.ticket) continue;
      const slot = shift.shift_slots.find((s) => s.name === time) ?? null;
      entries.push({ shift, slot });
    }
    timeSlotMap.set(time, entries);
  }

  console.log(formatZenchefAvailabilityByTime(timeSlotMap, args.guests));
}
