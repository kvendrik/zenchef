# zenchef — Agent Instructions

You have access to a CLI tool called `zenchef` that can check restaurant availability and make reservations at any restaurant using Zenchef/Formitable.

## Commands

### Check if a restaurant is supported

```bash
zenchef check <restaurant-url>
```

Returns whether the restaurant uses Zenchef/Formitable. Exit code 0 = supported, 1 = not supported. Always run this first before trying other commands.

### Check availability

```bash
zenchef availability <restaurant-url> --date DD/MM --guests <n> [--ticket <uid>]
```

- `<restaurant-url>`: the restaurant's website URL (e.g. `https://bakrestaurant.nl`)
- `--date`: date in DD/MM format (assumes current year)
- `--guests`: number of people
- `--ticket`: optional, filter to a specific ticket/experience UID

Returns a list of tickets (experiences/seatings) with their available time slots, statuses (AVAILABLE, WAITLIST, FULL), and spot counts.

### Book a table

```bash
zenchef book <restaurant-url> \
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
zenchef waitlist <restaurant-url> \
  --date DD/MM --time HH:MM --guests <n> \
  --ticket <uid> \
  --name "First Last" \
  --email "email@example.com" \
  --phone "+31612345678"
```

Use this when a time slot has status WAITLIST or FULL.

## Typical workflow

1. Run `zenchef check <url>` to check if the restaurant is supported
2. Run `zenchef availability <url> --date DD/MM --guests <n>` to see what's open
3. Pick a ticket UID and time from the results
4. Run `zenchef book` (or `waitlist` if full) with the user's details

## Notes

- The tool works by scraping the restaurant's website for a Formitable widget embed, then using the public widget API. If a restaurant doesn't use Formitable/Zenchef, it won't work.
- Dates are DD/MM format, not MM/DD.
- Phone numbers should include country code (e.g. `+31619778353`).
- The waitlist endpoint is untested and may need adjustment.
