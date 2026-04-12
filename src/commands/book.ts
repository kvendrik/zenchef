import { extractRestaurantUid } from "../scraper.ts";
import {
  getTickets,
  getTicketAvailability,
  getPaymentMethods,
  createBooking,
  getPaymentUrl,
} from "../api.ts";
import {
  formatTicketHeader,
  formatPaymentMethod,
  formatError,
  formatSuccess,
} from "../format.ts";
import { parseDateToIso } from "../date.ts";
import type { BookingPayload } from "../types.ts";

export async function book(args: {
  restaurantUrl: string;
  date: string;
  time: string;
  guests: number;
  ticket: string;
  name: string;
  email: string;
  phone: string;
  payment?: string;
}): Promise<void> {
  try {
    const uid = await extractRestaurantUid(args.restaurantUrl);
    const isoDatetime = parseDateToIso(args.date);

    const tickets = await getTickets(uid, isoDatetime, args.guests);
    const ticket = tickets.find((t) => t.uid === args.ticket);
    if (!ticket) {
      console.error(formatError(`Ticket "${args.ticket}" not found. Available tickets:`));
      for (const t of tickets) {
        console.log(`  ${t.uid}  ${t.title}`);
      }
      process.exit(1);
    }
    console.log(formatTicketHeader(ticket));
    console.log();

    // Check availability for the requested time
    const slots = await getTicketAvailability(
      uid,
      args.ticket,
      isoDatetime,
      args.guests
    );
    const slot = slots.find((s) => s.timeString === args.time);
    if (!slot) {
      console.error(
        formatError(
          `Time slot ${args.time} not found. Available times:`
        )
      );
      for (const s of slots) {
        console.log(`  ${s.timeString} (${s.status})`);
      }
      process.exit(1);
    }

    if (slot.status === "FULL") {
      console.error(
        formatError(
          `Time slot ${args.time} is FULL. Consider using the waitlist command.`
        )
      );
      process.exit(1);
    }

    // Handle deposit/payment
    let paymentMethodId = "";
    if (ticket.deposit && ticket.price > 0) {
      const methods = await getPaymentMethods(uid, ticket.price * args.guests);
      if (!args.payment) {
        console.log("Payment required. Available methods:");
        for (const method of methods) {
          console.log(formatPaymentMethod(method));
        }
        console.error(formatError("Use --payment <method> to select a payment method (e.g. --payment ideal)"));
        process.exit(1);
      }
      const selected = methods.find((m) => m.id === args.payment);
      if (!selected) {
        console.error(formatError(`Unknown payment method "${args.payment}". Available:`));
        for (const method of methods) {
          console.log(formatPaymentMethod(method));
        }
        process.exit(1);
      }
      paymentMethodId = selected.id;
      console.log(`Payment: ${selected.description}${selected.paymentFee > 0 ? ` (+€${(selected.paymentFee / 100).toFixed(2)} fee)` : ""}`);
    }

    // Parse name into first/last
    const nameParts = args.name.trim().split(/\s+/);
    const firstName = nameParts[0] ?? "";
    const lastName = nameParts.slice(1).join(" ") || firstName;

    const payload: BookingPayload = {
      booking: {
        title: "MALE",
        firstName,
        lastName,
        email: args.email,
        telephone: args.phone,
        numberOfPeople: args.guests,
        bookingDate: isoDatetime,
        bookingTime: slot.timeString,
        bookingDuration: slot.maxDuration || ticket.bookingDuration,
        newsletter: false,
        culture: "en",
        source: "Widget",
        sendFeedbackMail: true,
        comments: "",
        color: "#3edca8",
        walkIn: false,
        companyName: "",
        company: false,
        short: true,
        tags: [],
      },
      ticketUid: args.ticket,
      paymentMethodId,
      issuerId: "",
      returnUrl: `https://widget.formitable.com/side/en/${uid}/finish`,
      promotionCode: null,
      voucherCode: null,
      source: "Widget",
    };

    console.log();
    console.log("Booking summary:");
    console.log(`  Name:    ${firstName} ${lastName}`);
    console.log(`  Email:   ${args.email}`);
    console.log(`  Phone:   ${args.phone}`);
    console.log(`  Date:    ${args.date}`);
    console.log(`  Time:    ${slot.timeString}`);
    console.log(`  Guests:  ${args.guests}`);
    console.log(`  Ticket:  ${ticket.title}`);
    console.log();

    console.log("Attempting booking...");
    const result = await createBooking(uid, payload);

    const bookingResult = result as { bookingUid?: string; paymentUrl?: string | null };

    if (bookingResult.bookingUid) {
      console.log(formatSuccess(`Booking created: ${bookingResult.bookingUid}`));

      if (ticket.deposit && ticket.price > 0) {
        const payment = await getPaymentUrl(bookingResult.bookingUid);
        if (payment.paymentUrl) {
          console.log();
          console.log(`Payment URL: ${payment.paymentUrl}`);
        }
      }
    } else {
      console.log(formatSuccess("Booking response:"));
      console.log(JSON.stringify(result, null, 2));
    }
  } catch (err) {
    console.error(formatError((err as Error).message));
    process.exit(1);
  }
}

