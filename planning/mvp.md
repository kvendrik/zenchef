# Build a CLI tool called `zenchef`

A Bun + TypeScript CLI tool for checking restaurant availability and making reservations via the Zenchef/Formitable widget API. Use `chalk` for pretty printing output.

This tool will be used by an LLM agent — so output should be structured and parseable, but also human-readable.

## CLI Interface

```
zenchef <restaurant-url> availability --date DD/MM --guests <n> [--ticket <uid>]
zenchef <restaurant-url> book --date DD/MM --time HH:MM --guests <n> --ticket <uid> --name "..." --email "..." --phone "..."
zenchef <restaurant-url> waitlist --date DD/MM --time HH:MM --guests <n> --ticket <uid> --name "..." --email "..." --phone "..."
```

All flags are required (no defaults). `--guests` must always be provided.

## Architecture

```
src/
  index.ts          — arg parsing (no libraries, just process.argv), command dispatch
  scraper.ts        — fetch restaurant URL HTML, extract Formitable UID
  api.ts            — typed Formitable widget API client (just fetch, no libraries)
  commands/
    availability.ts — availability command
    book.ts         — book command
    waitlist.ts     — waitlist command
  types.ts          — shared types
  format.ts         — chalk formatting helpers
```

## How to extract the restaurant UID

Fetch the restaurant's website HTML and look for one of these patterns:

```html
<iframe src="https://widget.formitable.com/side/{lang}/{restaurantUid}/book?...">
```

or in a widget div:

```html
<div class="ft-widget-b2" data-restaurant="{restaurantUid}" ...>
<div class="ft-widget-b2" data-group="{restaurantUid}" ...>
```

Extract the UID (8-char hex string like `dadd7a3b`).

## Widget API — What We Know

**Base URL:** `https://widget-api.formitable.com/api`

No authentication required. All endpoints are public (this is the same API the booking widget on restaurant websites calls).

### Confirmed & Tested Endpoints

**Get tickets/products (experiences a restaurant offers):**
```
GET /product/{restaurantUid}/search/{isoDatetime}/{guests}/{lang}
```
- `isoDatetime` example: `2026-04-12T10:30:00.000Z`
- `lang`: `en` or `nl`
- Returns array of ticket objects:
```json
{
  "uid": "e2cc8eac",
  "title": "Lunch reservering",
  "description": "<p>HTML description</p>",
  "price": 4000,        // cents — €40.00
  "deposit": true,      // whether prepayment is required
  "minPartySize": 0,    // 0 = no limit
  "maxPartySize": 0,
  "refundPolicy": "2d",
  "bookingDuration": 210, // minutes
  "image": "https://ftstorageprod.blob.core.windows.net/...",
  "color": "#B58DFF",
  "areaId": 18867,
  "areaName": null,
  "showEndTime": false
}
```

**Get availability for a specific ticket on a day:**
```
GET /availability/{restaurantUid}/ticket/day/{ticketUid}/{isoDatetime}/{guests}/{lang}
```
Returns array of time slots:
```json
{
  "timeString": "12:30",
  "displayTime": "12:30",
  "time": "2026-04-26T10:30:00Z",    // UTC ISO
  "status": "AVAILABLE",              // or other statuses — likely FULL, WAITLIST
  "showEndTime": true,
  "maxDuration": 150,
  "area": "",
  "showAreaToGuest": false,
  "partySize": 2,
  "minutes": 750,                     // minutes since midnight (local time)
  "waitlistAutoNotify": true,
  "isExclusive": false,
  "spotsTotal": 10,
  "spotsOpen": 5
}
```

**Get availability without ticket filter:**
```
GET /availability/{restaurantUid}/day/{isoDatetime}/{guests}/{lang}
```

**Get first available date for a ticket:**
```
GET /availability/{restaurantUid}/ticket/first/{ticketUid}/{guests}/{isoDatetime}/{lang}?includeWaitlist=false
```

**Get payment methods:**
```
GET /payments/{restaurantUid}/methods/{amountInCents}/{type}
```
- `type`: `TICKET`
- Returns array:
```json
[
  {"id": "ideal", "description": "iDEAL", "paymentFee": 29, "image": {...}},
  {"id": "creditcard", "description": "Credit card", "paymentFee": 209, "image": {...}},
  {"id": "applepay", "description": "Apple Pay", "paymentFee": 0, "image": {...}}
]
```

**Get single ticket details:**
```
GET /product/{restaurantUid}/{ticketUid}/{lang}?friendCode=null
```

### Discovered From Source Code But NOT Yet Tested

These endpoints were extracted from the minified Angular source (`all.side.min.js`). The URL patterns and payload shapes are inferred from code — **they have not been tested with real HTTP calls yet**. The actual request/response shapes may differ.

**Create booking:**
```
POST /booking/{restaurantUid}
```
Inferred payload (from Angular source analysis of property assignments):
```typescript
{
  booking: {
    firstName: string,
    lastName: string,
    email: string,
    telephone: string,
    companyName?: string,
    company?: string,
    title?: string,        // salutation — e.g. "mr", "mrs"
    numberOfPeople: number,
    bookingDate: string,   // unclear format — ISO date? local date string?
    bookingTime: string,   // unclear format — ISO datetime? the "time" field from availability?
    bookingDuration: number, // minutes, from ticket
    newsletter: boolean,
    culture: string,       // "nl", "en"
    tags?: string,         // tracking tag
    short?: string,        // unclear purpose
  },
  ticketUid: string,
  paymentMethodId: string,  // "ideal", "creditcard", "" for free
  returnUrl: string,        // where Mollie redirects after payment
  source?: string,
  voucherCode?: string,
  promotionCode?: string,
  friendCode?: string,
  campaignId?: string,
  recipientId?: string,
  waitlistItemId?: string,
  issuerId?: string,
}
```

**⚠️ UNKNOWNS about the booking POST:**
- We have NOT seen a real request/response for this endpoint
- The exact format of `bookingDate` and `bookingTime` is unclear — could be ISO, could be the `time` field from availability, could be something else
- We don't know the response shape — it might return a booking confirmation object, a payment redirect URL, or something else
- For paid bookings (deposit: true), the flow likely involves getting a Mollie payment URL back — but we haven't confirmed this
- The `returnUrl` should probably be set to `https://reservation.formitable.com` (the real confirmation page)

**Get booking details:**
```
GET /booking/{bookingId}
```
- Unknown response shape

**Cancel option:**
```
DELETE /booking/option/cancel/{optionId}
```

**Accept option:**
```
PUT /booking/option/accept
```
- Unknown payload

**Join waitlist:**
```
POST /waitlist/{restaurantUid}
```
Inferred waitlist item properties (from source):
```typescript
{
  firstName: string,
  lastName: string,
  email: string,
  telephone: string,
  company?: string,
  companyName?: string,
  title?: string,
  culture: string,
  date: string,           // unknown format
  fromTime: string,       // unknown format
  untilTime: string,      // unknown format
  duration: number,
  partySize: number,
  productUid: string,     // = ticketUid
  sendNotifications: boolean,
}
```

**⚠️ UNKNOWNS about the waitlist POST:**
- Same unknowns as booking — date/time formats not confirmed
- Response shape unknown

**Get payment URL for booking:**
```
GET /payments/url/booking/{bookingId}
```

**Other endpoints found in source:**
```
GET  /restaurant/{uid}                    — restaurant info (returns unknown shape, may not work without auth)
GET  /restaurant/multivenuegroup/{uid}    — multi-venue group
GET  /waitlist/{restaurantUid}/{id}       — get waitlist item
DELETE /waitlist/{waitlistId}             — cancel waitlist
GET  /order/{uid}                         — get order
POST /order/{uid}/CreateProductOrder      — create product order
POST /order/{uid}/CreateTakeAwayOrder     — create takeaway order
POST /g/{uid}                             — analytics tracking
POST /g/{uid}/intent                      — booking intent signal
```

## Command Behavior

### `availability`

1. Fetch restaurant URL, extract UID
2. Convert `--date DD/MM` to ISO datetime (assume current year, use `T10:30:00.000Z` as the base time — this is what the widget uses)
3. `GET /product/{uid}/search/{datetime}/{guests}/en` → list all tickets
4. For each ticket, `GET /availability/{uid}/ticket/day/{ticketUid}/{datetime}/{guests}/en`
5. Print results grouped by ticket:
   - Ticket name, price (if deposit), refund policy
   - Table of time slots: time, status, spots open/total
   - Highlight AVAILABLE in green, WAITLIST in yellow, FULL in red

### `book`

1. Extract UID
2. Get product details for the given `--ticket`
3. Check availability for that time slot
4. If the ticket requires a deposit:
   - Fetch payment methods
   - Show them to the user: which methods available + fees
   - **For now, just print a message that payment is required and the booking flow can't be fully completed yet** (since we haven't tested the POST)
5. Attempt `POST /booking/{uid}` with the constructed payload
6. If response contains a payment URL, print it (do NOT open browser — this CLI is used by an LLM)
7. If response is a confirmation, print booking details

### `waitlist`

1. Extract UID  
2. Attempt `POST /waitlist/{uid}` with the constructed payload
3. Print result

### Error handling

- If UID can't be extracted: clear error message explaining the restaurant may not use Formitable/Zenchef
- If availability returns empty: "No availability for this date"
- If API returns non-200: print status code and body
- All commands should exit with code 0 on success, 1 on error

## Date/Time Handling

- User provides `--date DD/MM` — assume current year
- Convert to ISO: `2026-04-26T10:30:00.000Z` (the `T10:30:00.000Z` base is what the widget uses as a starting point for day queries)
- `--time HH:MM` — match against `timeString` from availability response to get the full ISO `time` value and `minutes` value

## Project Setup

- Bun + TypeScript
- `chalk` for colors (only dependency)
- No arg parsing library — just process.argv
- Make `src/index.ts` the entry point with a shebang: `#!/usr/bin/env bun`
- Add `bin` field in package.json pointing to `src/index.ts`

## What To Build Now vs Later

**Build now:**
- UID extraction from restaurant websites
- `availability` command (fully working — these endpoints are confirmed)
- `book` command structure with the POST attempt (it may fail — that's fine, we need to see the error to learn the correct format)
- `waitlist` command structure with the POST attempt (same — may fail)
- Pretty chalk output

**Defer:**
- UID caching
- Opening payment URLs
- Booking modification/cancellation
