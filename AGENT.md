# zenchef — Agent Instructions

You have access to a CLI tool called `zenchef` that can check restaurant availability and make reservations at any restaurant using Zenchef/Formitable. Run it with `bunx zenchef` — no install needed.

## Commands

### Check if a restaurant is supported

```bash
bunx zenchef check <restaurant-url>
```

Returns whether the restaurant uses Zenchef/Formitable. Exit code 0 = supported, 1 = not supported. Always run this first before trying other commands.

### Show dates with availability

```bash
bunx zenchef dates <restaurant-url> --guests <n> [--month <MM/YYYY>]
```

- `<restaurant-url>`: the restaurant's website URL (e.g. `https://bakrestaurant.nl`)
- `--guests`: number of people
- `--month`: optional, month to check in MM/YYYY format (defaults to current month)

Returns which dates in the month have availability vs. are fully booked (waitlist-only) vs. closed. Use this to find open dates before checking specific time slots with `availability`.

### Check availability

```bash
bunx zenchef availability <restaurant-url> --date DD/MM --guests <n> [--ticket <uid>]
```

- `<restaurant-url>`: the restaurant's website URL (e.g. `https://bakrestaurant.nl`)
- `--date`: date in DD/MM format (uses current year, or next year if the date is in the past)
- `--guests`: number of people
- `--ticket`: optional, filter to a specific ticket/experience UID

Returns a list of tickets (experiences/seatings) with their available time slots, statuses (AVAILABLE, WAITLIST, FULL), and spot counts.

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
- `--payment`: `ideal`, `creditcard`, or `applepay`. Required if the ticket has a deposit. If omitted, the CLI prints available methods and exits.

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
2. If the user hasn't picked a date, run `bunx zenchef dates <url> --guests <n>` to find dates with availability
3. Run `bunx zenchef availability <url> --date DD/MM --guests <n>` to see time slots for a specific date
4. Pick a ticket UID and time from the results
5. Run `bunx zenchef book` (or `waitlist` if full) with the user's details

## Notes

- The tool works by scraping the restaurant's website for a Formitable widget embed, then using the public widget API. If a restaurant doesn't use Formitable/Zenchef, it won't work.
- Dates are DD/MM format, not MM/DD.
- Phone numbers should include country code (e.g. `+31612345678`).
- Only time slots with AVAILABLE status can be booked directly. WAITLIST, FULL, and other statuses require using the waitlist command.
