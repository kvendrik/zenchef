import { extractRestaurantInfo } from "../scraper.ts";
import { getTickets } from "../api.ts";
import * as zenchefApi from "../zenchef-api.ts";
import { formatError } from "../format.ts";
import { parseDateToIso } from "../date.ts";
import chalk from "chalk";

export async function tickets(args: {
  restaurantUrl: string;
  date: string;
  guests: number;
}): Promise<void> {
  try {
    const { uid, system } = await extractRestaurantInfo(args.restaurantUrl);

    if (system === "zenchef") {
      await zenchefTickets(uid, args);
    } else {
      await formitableTickets(uid, args);
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function indentText(text: string, indent: string): string {
  return text.split("\n").map((line) => indent + line).join("\n");
}

async function formitableTickets(
  uid: string,
  args: { date: string; guests: number }
) {
  const isoDatetime = parseDateToIso(args.date);

  const tickets = await getTickets(uid, isoDatetime, args.guests);
  if (tickets.length === 0) {
    console.log(formatError("No tickets/experiences found for this date."));
    process.exit(1);
  }

  for (const ticket of tickets) {
    const parts = [chalk.bold.cyan(ticket.title), chalk.dim(`(${ticket.uid})`)];
    console.log(parts.join(" "));

    const meta: string[] = [];
    if (ticket.deposit) {
      meta.push(chalk.yellow(`€${(ticket.price / 100).toFixed(2)} deposit/person`));
    }
    if (ticket.refundPolicy) {
      meta.push(chalk.dim(`refund: ${ticket.refundPolicy}`));
    }
    if (ticket.bookingDuration) {
      meta.push(chalk.dim(`${ticket.bookingDuration}min`));
    }
    if (meta.length > 0) {
      console.log(`  ${meta.join("  ·  ")}`);
    }

    if (ticket.description) {
      console.log();
      console.log(indentText(stripHtml(ticket.description), "  "));
    }
    console.log();
  }
}

async function zenchefTickets(
  uid: string,
  args: { date: string; guests: number }
) {
  const isoDatetime = parseDateToIso(args.date);
  const dateOnly = isoDatetime.split("T")[0]!;

  const days = await zenchefApi.getAvailabilities(uid, dateOnly);
  if (days.length === 0) {
    console.log(formatError("No availability data for this date."));
    process.exit(1);
  }

  const day = days[0]!;
  if (day.shifts.length === 0) {
    console.log(formatError("No shifts available for this date."));
    process.exit(1);
  }

  for (const shift of day.shifts) {
    const parts = [chalk.bold.cyan(shift.name), chalk.dim(`(${shift.id})`)];
    console.log(parts.join(" "));

    const meta: string[] = [];
    meta.push(chalk.dim(`${shift.open}–${shift.close}`));
    if (shift.prepayment_param) {
      const amount = (shift.prepayment_param.charge_per_guests / 100).toFixed(2);
      meta.push(chalk.yellow(`€${amount} deposit/person`));
    }
    console.log(`  ${meta.join("  ·  ")}`);

    if (shift.offers.length > 0) {
      console.log();
      for (const offer of shift.offers) {
        const offerParts = [chalk.white(`  ${offer.name}`)];
        if (offer.has_prepayment) {
          offerParts.push(chalk.yellow(`€${(offer.charge_per_guests / 100).toFixed(2)}/person`));
        }
        console.log(offerParts.join("  ·  "));

        const desc = offer.description?.en || Object.values(offer.description)[0];
        if (desc) {
          console.log();
          console.log(indentText(stripHtml(desc), "    "));
        }
      }
    }
    console.log();
  }
}
