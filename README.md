# zenchef

CLI tool for checking restaurant availability and making reservations via the Zenchef/Formitable widget API.

## Setup

```bash
bun install
bun link
```

## Usage

```
zenchef <restaurant-url> availability --date DD/MM --guests <n> [--ticket <uid>]
zenchef <restaurant-url> book --date DD/MM --time HH:MM --guests <n> --ticket <uid> --name "..." --email "..." --phone "..."
zenchef <restaurant-url> waitlist --date DD/MM --time HH:MM --guests <n> --ticket <uid> --name "..." --email "..." --phone "..."
```

### Check availability

```bash
zenchef https://www.restaurant.nl availability --date 26/04 --guests 2
```

Returns all tickets (experiences/seatings) and their time slots for the given date. Optionally filter to a specific ticket:

```bash
zenchef https://www.restaurant.nl availability --date 26/04 --guests 2 --ticket e2cc8eac
```

### Book a table

```bash
zenchef https://www.restaurant.nl book \
  --date 26/04 \
  --time 19:00 \
  --guests 2 \
  --ticket e2cc8eac \
  --name "Jane Doe" \
  --email "jane@example.com" \
  --phone "+31612345678"
```

Checks the time slot is available, shows payment methods if a deposit is required, and attempts the booking.

### Join a waitlist

```bash
zenchef https://www.restaurant.nl waitlist \
  --date 26/04 \
  --time 19:00 \
  --guests 2 \
  --ticket e2cc8eac \
  --name "Jane Doe" \
  --email "jane@example.com" \
  --phone "+31612345678"
```

## How it works

1. Fetches the restaurant's website and extracts the Formitable widget UID from the page HTML
2. Uses the public Formitable widget API to query tickets, availability, and submit bookings

The booking and waitlist POST endpoints are based on reverse-engineered payloads and may need adjustment.
