# zenchef

Book restaurants from your terminal. No browser, no app, no clicking through widget flows — just give it a restaurant URL and go.

Works with any restaurant that uses [Zenchef/Formitable](https://www.zenchef.com/) for reservations (thousands across the Netherlands and Europe).

## Setup

```bash
bun install
bun link
```

## Usage

### Check if a restaurant is supported

```bash
zenchef https://bakrestaurant.nl
```

Returns whether the restaurant uses Zenchef/Formitable and prints its UID. Exits with code 0 if supported, 1 if not.

### 1. Check availability

```bash
zenchef https://bakrestaurant.nl availability --date 26/04 --guests 2
```

Shows all available experiences/seatings with time slots, color-coded by status. Filter to a specific ticket with `--ticket <uid>`.

### 2. Book a table

```bash
zenchef https://bakrestaurant.nl book \
  --date 26/04 --time 12:30 --guests 2 \
  --ticket 0b0d0586 \
  --name "Jane Doe" \
  --email "jane@example.com" \
  --phone "+31612345678" \
  --payment ideal
```

Creates the booking and returns a payment URL if a deposit is required. If you omit `--payment`, the CLI will show you which methods are available and their fees. Payment methods: `ideal`, `creditcard`, `applepay`. If the ticket has no deposit, `--payment` is not needed.

### 3. Join a waitlist

```bash
zenchef https://bakrestaurant.nl waitlist \
  --date 26/04 --time 12:30 --guests 2 \
  --ticket 0b0d0586 \
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
