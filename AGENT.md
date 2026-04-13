# zenchef — Agent Instructions

You have access to a CLI tool called `zenchef` that can check restaurant availability and make reservations at any restaurant using Zenchef/Formitable. Run it with `bunx zenchef` — no install needed.

## Commands

### Check if a restaurant is supported

```bash
bunx zenchef check <restaurant-url>
```

Returns whether the restaurant uses Zenchef/Formitable. Exit code 0 = supported, 1 = not supported. Always run this first before trying other commands.

### Check availability

```bash
bunx zenchef availability <restaurant-url> --guests <n> [--date DD/MM] [--month <MM/YYYY>] [--ticket <uid>]
```

- `<restaurant-url>`: the restaurant's website URL (e.g. `https://bakrestaurant.nl`)
- `--guests`: number of people
- `--date`: optional, date in DD/MM format (uses current year, or next year if the date is in the past)
- `--month`: optional, month to check in MM/YYYY format (defaults to current month, only used without --date)
- `--ticket`: optional, filter to a specific ticket/experience UID (only used with --date)

Without `--date`: returns which dates in the month have availability vs. are fully booked (waitlist-only) vs. closed. Use this to find open dates first.

With `--date`: returns time slots for that date, grouped by time. Each slot lists all ticket types (experiences/seatings) with their status (AVAILABLE, WAITLIST, FULL), spot counts, and ticket ID.

### Show ticket details

```bash
bunx zenchef tickets <restaurant-url> --date DD/MM --guests <n>
```

- `--date`: date in DD/MM format
- `--guests`: number of people

Returns all ticket types (experiences/seatings) for the given date with their full descriptions, deposit info, refund policy, duration, and ticket IDs. Use this when the user wants to understand what each ticket type offers before choosing one.

### Book a table

```bash
bunx zenchef book <restaurant-url> \
  --date DD/MM --time HH:MM --guests <n> \
  --ticket <uid> \
  --name "First Last" \
  --email "email@example.com" \
  --phone "+31612345678" \
  [--payment <method>]
```

- `--time`: must match a `timeString` from the availability output
- `--ticket`: required, the ticket UID from availability
- `--payment`: payment method ID. Required if the ticket has a deposit. If omitted and a deposit is required, the CLI prints available payment methods with their fees and exits — use this to discover which methods are available.

On success, prints the booking UID and a payment URL (if deposit required). Give the payment URL to the user so they can complete payment.

### Join a waitlist

```bash
bunx zenchef waitlist <restaurant-url> \
  --date DD/MM --time HH:MM --guests <n> \
  --ticket <uid> \
  --name "First Last" \
  --email "email@example.com" \
  --phone "+31612345678"
```

Use this when a time slot has status WAITLIST or FULL.

## Typical workflow

1. Run `bunx zenchef check <url>` to check if the restaurant is supported
2. If the user hasn't picked a date, run `bunx zenchef availability <url> --guests <n>` to find dates with availability
3. Run `bunx zenchef availability <url> --date DD/MM --guests <n>` to see time slots and ticket types for a specific date
4. If the user wants more detail on what each ticket offers, run `bunx zenchef tickets <url> --date DD/MM --guests <n>`
5. Pick a ticket UID and time from the results
6. Run `bunx zenchef book` with the user's details (omit `--payment` first to discover available payment methods if a deposit is required)

## Notes

- The tool works by scraping the restaurant's website for a Formitable widget embed, then using the public widget API. If a restaurant doesn't use Formitable/Zenchef, it won't work.
- Dates are DD/MM format, not MM/DD.
- Phone numbers should include country code (e.g. `+31612345678`).
- Only time slots with AVAILABLE status can be booked directly. WAITLIST, FULL, and other statuses require using the waitlist command.
