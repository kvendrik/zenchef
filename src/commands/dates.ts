import { extractRestaurantInfo } from "../scraper.ts";
import { getMonthAvailability } from "../api.ts";
import * as zenchefApi from "../zenchef-api.ts";
import { formatError } from "../format.ts";
import chalk from "chalk";

export async function dates(args: {
  restaurantUrl: string;
  guests: number;
  month?: string;
}): Promise<void> {
  try {
    const { uid, system } = await extractRestaurantInfo(args.restaurantUrl);

    const { month, year } = parseMonth(args.month);

    if (system === "zenchef") {
      await zenchefDates(uid, month, year, args.guests);
    } else {
      await formitableDates(uid, month, year, args.guests);
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

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

async function formitableDates(
  uid: string,
  month: number,
  year: number,
  guests: number
) {
  const days = await getMonthAvailability(uid, month, year, guests);

  console.log(formatMonthHeader(month, year));
  console.log();

  const available = days.filter((d) => d.status === 6);
  const waitlist = days.filter((d) => d.status === 1 && d.message?.toLowerCase().includes("fully booked"));
  const closed = days.filter((d) => d.status === 0 || (d.status === 1 && d.message?.toLowerCase().includes("closed")));

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

  console.log(formatMonthHeader(month, year));
  console.log();

  const available: typeof days = [];
  const waitlistOnly: typeof days = [];

  for (const d of days) {
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

function weekdayName(dateStr: string): string {
  const d = new Date(dateStr + "T12:00:00");
  return d.toLocaleDateString("en-US", { weekday: "short" });
}
