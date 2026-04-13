# zenchef

Book restaurants from your terminal. No browser, no app, no clicking through widget flows — just give it a restaurant URL and go.

Works with any restaurant that uses [Zenchef/Formitable](https://www.zenchef.com/) for reservations (thousands across the Netherlands and Europe).

## Quick start

No install needed — just run it with `bunx`:

```bash
bunx zenchef check https://bakrestaurant.nl
```

## Usage

### Check if a restaurant is supported

```bash
bunx zenchef check https://bakrestaurant.nl
```

Tells you if the restaurant uses Zenchef/Formitable and suggests next commands. Exit code 0 = supported, 1 = not.

### Check availability

```bash
bunx zenchef availability https://bakrestaurant.nl --guests 2
```

Without `--date`, shows which dates in the current month have availability. Use `--month MM/YYYY` to check a different month.

```
April 2026

  12 available dates:
    2026-04-15  Wed
    2026-04-16  Thu
    2026-04-17  Fri
    ...

Next step:
  zenchef availability <url> --date 15/04 --guests 2
```

```bash
bunx zenchef availability https://bakrestaurant.nl --date 16/04 --guests 2
```

With `--date`, drills into that date and shows time slots. Each time slot lists all ticket types (experiences/seatings) with their availability status and ticket ID. Use `--ticket <uid>` to filter to a specific ticket.

```
6:30 PM
  Reservation (822a8062)  AVAILABLE (5/10 spots)
  Exclusive wines (c0c5cea0)  AVAILABLE (5/10 spots)

7:00 PM
  Reservation (822a8062)  WAITLIST
  Exclusive wines (c0c5cea0)  WAITLIST

7:30 PM
  Reservation (822a8062)  AVAILABLE (5/6 spots)
  Exclusive wines (c0c5cea0)  AVAILABLE (5/6 spots)

8:00 PM
  Reservation (822a8062)  AVAILABLE (5/6 spots)
  Exclusive wines (c0c5cea0)  AVAILABLE (5/6 spots)

8:30 PM
  Reservation (822a8062)  WAITLIST
  Exclusive wines (c0c5cea0)  FULL
```

### Show ticket details

```bash
bunx zenchef tickets https://bakrestaurant.nl --date 16/04 --guests 2
```

Shows all ticket types (experiences/seatings) for a date with their full descriptions, deposit info, and ticket IDs. Use this to understand what each ticket offers before booking.

```
Reservation (822a8062)
  €40.00 deposit/person  ·  refund: 24h  ·  180min

  What an excellent choice! Welcome to BAK restaurant. We offer a fixed €75
  tasting menu, with the option to add à la carte specials in the restaurant.

  Please note, if you have specific dietary requirements please mention these
  to us in advance.

Exclusive wines (c0c5cea0)
  €40.00 deposit/person  ·  refund: 24h  ·  180min

  This ticket includes our tasting menu with an exclusive wine pairing.

  Alongside the menu, we will serve an aperitif followed by five carefully
  selected rare and remarkable wines that pair beautifully with the menu.

  The price for the menu + the exclusive wines is 245€ per person.

  This option is only available through advance booking due to the
  preparation required.
```

### Book a table

```bash
bunx zenchef book https://bakrestaurant.nl \
  --date 16/04 --time 18:30 --guests 2 \
  --ticket 822a8062 \
  --name "Jane Doe" \
  --email "jane@example.com" \
  --phone "+31612345678" \
  --payment ideal
```

Creates the booking and returns a payment URL if a deposit is required. If the ticket has a deposit and you omit `--payment`, the CLI lists available payment methods and their fees so you can pick one. If the ticket has no deposit, `--payment` is not needed.

### Join a waitlist

```bash
bunx zenchef waitlist https://bakrestaurant.nl \
  --date 16/04 --time 19:00 --guests 2 \
  --ticket 822a8062 \
  --name "Jane Doe" \
  --email "jane@example.com" \
  --phone "+31612345678"
```

## Agent usage

This tool is designed to be used by LLM agents. Point your agent at [`AGENT.md`](./AGENT.md) for full instructions on how to use the CLI.

## How it works

1. Scrapes the restaurant's website to find the Formitable widget UID
2. Hits the public Formitable widget API — the same one the booking widget on restaurant sites uses

No API keys needed. No auth. Just a URL.
