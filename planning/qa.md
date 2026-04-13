# QA Checklist

How to verify the CLI works correctly after making changes. Use [testing.md](testing.md) for the full list of test restaurants and their scenarios.

## Pre-flight

```
npx tsc --noEmit
```

Must pass with zero errors before testing anything else.

## 1. Detection (`check`)

Verify the scraper correctly identifies the widget system and UID for each detection method.

| Method | Test restaurant | Expected |
|---|---|---|
| Zenchef SDK (static HTML) | `olido.amsterdam` | Zenchef, UID 379003 |
| Zenchef SDK (static HTML) | `www.bistrobarberlin.nl` | Zenchef, UID 371381 |
| Formitable div (static HTML) | `restaurantdekas.com/nl/tuin` | Formitable, UID 643e1a93 |
| Formitable div (static HTML) | `scheepskameel.nl` | Formitable, UID 4d144539 |
| Formitable (JS bundle scan) | `restaurantgitane.nl` | Formitable, UID 86db0b51 |
| Formitable data-group | `rongastrobar.nl` | Formitable, UID c5e0a814 |
| Not supported | `www.nnea.nl` | "does not use Zenchef/Formitable" |

```
bun src/index.ts check https://olido.amsterdam
bun src/index.ts check https://www.bistrobarberlin.nl
bun src/index.ts check https://restaurantdekas.com/nl/tuin
bun src/index.ts check https://scheepskameel.nl
bun src/index.ts check https://restaurantgitane.nl
bun src/index.ts check https://rongastrobar.nl
bun src/index.ts check https://www.nnea.nl
```

Things to watch for:
- `check` output includes `dates` in the "Next steps" section
- Zenchef restaurants say "Zenchef", Formitable say "Formitable"
- Non-supported exits with code 1

## 2. Date availability (`dates`)

Verify the `dates` command returns sensible results for both systems.

```
bun src/index.ts dates https://olido.amsterdam --guests 2
bun src/index.ts dates https://restaurantdekas.com/nl/tuin --guests 2
bun src/index.ts dates https://restaurantgitane.nl --guests 2
bun src/index.ts dates https://bokkedoorns.nl --guests 2
```

Things to watch for:
- Zenchef dates show shift names next to each date
- Formitable dates are grouped into "available" vs "fully booked (waitlist may be available)"
- Gitane (client-side) should show few/no available dates (mostly waitlist)
- Bokkedoorns should show "Lunch, Diner" for some days, "Lunch" only for others
- A "Next step" hint is printed when available dates exist
- `--month MM/YYYY` works: `bun src/index.ts dates https://olido.amsterdam --guests 2 --month 05/2026`

## 3. Availability (`availability`)

### Zenchef single shift
```
bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 2
```
Pick a date from `dates` output. Should show one shift section with time slots.

### Zenchef multi-shift
```
bun src/index.ts availability https://bokkedoorns.nl --date DD/MM --guests 2
```
Pick a day that has both Lunch and Diner. Should show two separate shift sections.

### Formitable multi-ticket
```
bun src/index.ts availability https://monsieurrouge.nl --date 15/05 --guests 2
```
Should show two ticket sections (Bartable + Brunch-Lunch). If current month is empty, use `dates --month` to find a month with availability.

### Formitable multi-time search (De Kas)
```
bun src/index.ts availability https://restaurantdekas.com/nl/tuin --date DD/MM --guests 2
```
Pick an available date from `dates` output. Should show both Lunch and Dinner sections (likely all WAITLIST). This tests that the multi-time ticket search (10:00, 14:00, 18:00 UTC) finds dinner-only tickets.

### Ticket/shift filter
```
bun src/index.ts availability https://bokkedoorns.nl --date DD/MM --guests 2 --ticket <shift_id>
```
Use a shift ID from the unfiltered output. Should show only that shift. An invalid ID should list available shifts and exit 1.

### Guest count limits
```
bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 8
bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 10
```
8 guests: fewer time slots. 10 guests: "No time slots available" (max is 9).

## 4. Input validation

All of these should produce clear error messages and exit 1.

```
bun src/index.ts availability https://olido.amsterdam --date 2026-04-14 --guests 2
bun src/index.ts dates https://olido.amsterdam --guests 0
bun src/index.ts dates https://olido.amsterdam --guests 2 --month 2026-04
bun src/index.ts check https://nonexistent-restaurant-xyz123.com
```

## 5. CLI metadata

```
bun src/index.ts --version
bun src/index.ts --help
bun src/index.ts dates --help
```

- `--version` should match `package.json` version
- `--help` should list all 5 commands: check, dates, availability, book, waitlist
- `dates --help` should show `--guests` (required) and `--month` (optional)

## 6. Known limitations

These are expected failures, not bugs. Verify they fail gracefully.

- **Group widgets:** `bun src/index.ts dates https://rongastrobar.nl --guests 2` — `data-group` UIDs return 500 from Formitable API.
- **Client-side widget staleness:** If `restaurantgitane.nl` stops being detected, their Nuxt build likely changed JS bundle filenames. The scanning logic in `scraper.ts` may need to be updated to handle new patterns.

## Quick smoke test

Minimum set to run after any change — covers both systems, dates, and availability:

```
npx tsc --noEmit
bun src/index.ts check https://olido.amsterdam
bun src/index.ts check https://restaurantdekas.com/nl/tuin
bun src/index.ts check https://restaurantgitane.nl
bun src/index.ts dates https://olido.amsterdam --guests 2
bun src/index.ts dates https://restaurantdekas.com/nl/tuin --guests 2
bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 2
bun src/index.ts availability https://restaurantdekas.com/nl/tuin --date DD/MM --guests 2
```

Replace `DD/MM` with an available date from the `dates` output.
