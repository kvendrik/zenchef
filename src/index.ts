#!/usr/bin/env bun

import { availability } from "./commands/availability.ts";
import { book } from "./commands/book.ts";
import { waitlist } from "./commands/waitlist.ts";
import { check } from "./commands/check.ts";
import { formatError } from "./format.ts";

const args = process.argv.slice(2);
const restaurantUrl = args[0];
const command = args[1];

if (!restaurantUrl) {
  printUsage();
  process.exit(1);
}

if (!command) {
  await check({ restaurantUrl });
  process.exit(0);
}

function getFlag(name: string): string | undefined {
  const index = args.indexOf(`--${name}`);
  if (index === -1 || index + 1 >= args.length) return undefined;
  const value = args[index + 1]!;
  if (value.startsWith("--")) return undefined;
  return value;
}

function requireFlag(name: string): string {
  const value = getFlag(name);
  if (!value) {
    console.error(formatError(`Missing required flag: --${name}`));
    process.exit(1);
  }
  return value;
}

function requireNumericFlag(name: string): number {
  const value = requireFlag(name);
  const num = parseInt(value, 10);
  if (isNaN(num)) {
    console.error(formatError(`--${name} must be a number, got "${value}"`));
    process.exit(1);
  }
  return num;
}

switch (command) {
  case "availability": {
    const date = requireFlag("date");
    const guests = requireNumericFlag("guests");
    const ticket = getFlag("ticket");
    await availability({ restaurantUrl, date, guests, ticket });
    break;
  }
  case "book": {
    const date = requireFlag("date");
    const time = requireFlag("time");
    const guests = requireNumericFlag("guests");
    const ticket = requireFlag("ticket");
    const name = requireFlag("name");
    const email = requireFlag("email");
    const phone = requireFlag("phone");
    const payment = getFlag("payment");
    await book({ restaurantUrl, date, time, guests, ticket, name, email, phone, payment });
    break;
  }
  case "waitlist": {
    const date = requireFlag("date");
    const time = requireFlag("time");
    const guests = requireNumericFlag("guests");
    const ticket = requireFlag("ticket");
    const name = requireFlag("name");
    const email = requireFlag("email");
    const phone = requireFlag("phone");
    await waitlist({ restaurantUrl, date, time, guests, ticket, name, email, phone });
    break;
  }
  default:
    console.error(formatError(`Unknown command: ${command}`));
    printUsage();
    process.exit(1);
}

function printUsage(): void {
  console.log(`
Usage:
  zenchef <restaurant-url> availability --date DD/MM --guests <n> [--ticket <uid>]
  zenchef <restaurant-url> book --date DD/MM --time HH:MM --guests <n> --ticket <uid> --name "..." --email "..." --phone "..." [--payment <method>]
  zenchef <restaurant-url> waitlist --date DD/MM --time HH:MM --guests <n> --ticket <uid> --name "..." --email "..." --phone "..."
  `);
}
