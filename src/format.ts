import chalk from "chalk";
import type { Ticket, TimeSlot, PaymentMethod } from "./types.ts";

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
  return `  ${chalk.white(method.description)}${fee}`;
}

export function formatError(message: string): string {
  return chalk.red(`Error: ${message}`);
}

export function formatSuccess(message: string): string {
  return chalk.green(message);
}
