#!/usr/bin/env bun

import { Command } from "commander";
import { availability } from "./commands/availability.ts";
import { book } from "./commands/book.ts";
import { waitlist } from "./commands/waitlist.ts";
import { check } from "./commands/check.ts";
import { dates } from "./commands/dates.ts";

const pkg = await Bun.file(new URL("../package.json", import.meta.url)).json();
const program = new Command();

program
  .name("zenchef")
  .description("Book restaurants from your terminal via the Zenchef/Formitable widget API")
  .version(pkg.version);

program
  .command("check")
  .description("Check if a restaurant uses Zenchef/Formitable")
  .argument("<url>", "Restaurant website URL")
  .action(async (url: string) => {
    await check({ restaurantUrl: url });
  });

program
  .command("dates")
  .description("Show which dates have availability")
  .argument("<url>", "Restaurant website URL")
  .requiredOption("--guests <n>", "Number of guests (minimum 1)", (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) throw new Error("Guests must be at least 1.");
    return n;
  })
  .option("--month <MM/YYYY>", "Month to check (default: current month)")
  .action(async (url: string, opts: { guests: number; month?: string }) => {
    await dates({ restaurantUrl: url, guests: opts.guests, month: opts.month });
  });

program
  .command("availability")
  .description("Check available time slots")
  .argument("<url>", "Restaurant website URL")
  .requiredOption("--date <DD/MM>", "Date in DD/MM format")
  .requiredOption("--guests <n>", "Number of guests (minimum 1)", (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) throw new Error("Guests must be at least 1.");
    return n;
  })
  .option("--ticket <uid>", "Filter to a specific ticket UID")
  .action(async (url: string, opts: { date: string; guests: number; ticket?: string }) => {
    await availability({ restaurantUrl: url, date: opts.date, guests: opts.guests, ticket: opts.ticket });
  });

program
  .command("book")
  .description("Book a table")
  .argument("<url>", "Restaurant website URL")
  .requiredOption("--date <DD/MM>", "Date in DD/MM format")
  .requiredOption("--time <HH:MM>", "Time slot")
  .requiredOption("--guests <n>", "Number of guests (minimum 1)", (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) throw new Error("Guests must be at least 1.");
    return n;
  })
  .requiredOption("--ticket <uid>", "Ticket UID from availability")
  .requiredOption("--name <name>", "Full name")
  .requiredOption("--email <email>", "Email address")
  .requiredOption("--phone <phone>", "Phone number with country code")
  .option("--payment <method>", "Payment method: ideal, creditcard, applepay")
  .action(async (url: string, opts: { date: string; time: string; guests: number; ticket: string; name: string; email: string; phone: string; payment?: string }) => {
    await book({ restaurantUrl: url, ...opts });
  });

program
  .command("waitlist")
  .description("Join a waitlist")
  .argument("<url>", "Restaurant website URL")
  .requiredOption("--date <DD/MM>", "Date in DD/MM format")
  .requiredOption("--time <HH:MM>", "Time slot")
  .requiredOption("--guests <n>", "Number of guests (minimum 1)", (v) => {
    const n = parseInt(v, 10);
    if (isNaN(n) || n < 1) throw new Error("Guests must be at least 1.");
    return n;
  })
  .requiredOption("--ticket <uid>", "Ticket UID from availability")
  .requiredOption("--name <name>", "Full name")
  .requiredOption("--email <email>", "Email address")
  .requiredOption("--phone <phone>", "Phone number with country code")
  .action(async (url: string, opts: { date: string; time: string; guests: number; ticket: string; name: string; email: string; phone: string }) => {
    await waitlist({ restaurantUrl: url, ...opts });
  });

program.parse();
