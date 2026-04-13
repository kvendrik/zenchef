import chalk from "chalk";
import type { Ticket, TimeSlot, PaymentMethod, ZenchefShift, ZenchefShiftSlot, ZenchefOffer } from "./types.ts";

export function formatTicketHeader(ticket: Ticket): string {
  const parts = [chalk.bold.cyan(ticket.title)];
  if (ticket.deposit) {
    parts.push(chalk.yellow(`€${(ticket.price / 100).toFixed(2)} deposit`));
  }
  if (ticket.refundPolicy) {
    parts.push(chalk.dim(`refund: ${ticket.refundPolicy}`));
  }
  if (ticket.bookingDuration) {
    parts.push(chalk.dim(`${ticket.bookingDuration}min`));
  }
  return parts.join("  ·  ");
}

export function formatStatus(status: string): string {
  switch (status) {
    case "AVAILABLE":
      return chalk.green(status);
    case "WAITLIST":
      return chalk.yellow(status);
    case "FULL":
      return chalk.red(status);
    default:
      return chalk.dim(status);
  }
}

export function formatTimeSlot(slot: TimeSlot): string {
  const time = chalk.white.bold(slot.displayTime);
  const status = formatStatus(slot.status);
  const spots =
    slot.spotsTotal > 0
      ? chalk.dim(` (${slot.spotsOpen}/${slot.spotsTotal} spots)`)
      : "";
  return `  ${time}  ${status}${spots}`;
}

export function formatAvailabilityTable(
  ticket: Ticket,
  slots: TimeSlot[]
): string {
  const lines = [formatTicketHeader(ticket), ""];
  if (slots.length === 0) {
    lines.push(chalk.dim("  No time slots available"));
  } else {
    for (const slot of slots) {
      lines.push(formatTimeSlot(slot));
    }
  }
  return lines.join("\n");
}

export function formatPaymentMethod(method: PaymentMethod): string {
  const fee =
    method.paymentFee > 0
      ? chalk.dim(` (+€${(method.paymentFee / 100).toFixed(2)} fee)`)
      : "";
  return `  ${chalk.white.bold(method.id)}  ${method.description}${fee}`;
}

// --- Zenchef formatting ---

export function formatZenchefShiftHeader(shift: ZenchefShift): string {
  const parts = [chalk.bold.cyan(shift.name)];
  parts.push(chalk.dim(`${shift.open}–${shift.close}`));
  if (shift.prepayment_param) {
    const amount = (shift.prepayment_param.charge_per_guests / 100).toFixed(2);
    parts.push(chalk.yellow(`€${amount} deposit/person`));
  }
  return parts.join("  ·  ");
}

function zenchefSlotStatus(slot: ZenchefShiftSlot, guests: number): string {
  if (slot.closed || slot.marked_as_full) return "FULL";
  if (!slot.possible_guests.includes(guests)) {
    if (slot.waitlist_possible_guests.includes(guests)) return "WAITLIST";
    return "FULL";
  }
  return "AVAILABLE";
}

export function formatZenchefSlot(slot: ZenchefShiftSlot, guests: number): string {
  const time = chalk.white.bold(slot.name);
  const status = zenchefSlotStatus(slot, guests);
  const statusStr = formatStatus(status);
  const spots = slot.occupation.scheduled.available;
  const spotsStr = spots > 0 ? chalk.dim(` (${spots} spots)`) : "";
  return `  ${time}  ${statusStr}${spotsStr}`;
}

export function formatZenchefAvailabilityTable(
  shift: ZenchefShift,
  slots: ZenchefShiftSlot[],
  guests: number
): string {
  const lines = [formatZenchefShiftHeader(shift), ""];
  if (slots.length === 0) {
    lines.push(chalk.dim("  No time slots available"));
  } else {
    for (const slot of slots) {
      lines.push(formatZenchefSlot(slot, guests));
    }
  }
  return lines.join("\n");
}

export function formatZenchefOfferHeader(offer: ZenchefOffer): string {
  const parts = [chalk.bold.cyan(offer.name)];
  if (offer.has_prepayment) {
    const amount = (offer.charge_per_guests / 100).toFixed(2);
    parts.push(chalk.yellow(`€${amount}/person`));
  }
  return parts.join("  ·  ");
}

export function formatError(message: string): string {
  return chalk.red(`Error: ${message}`);
}

export function formatSuccess(message: string): string {
  return chalk.green(message);
}
