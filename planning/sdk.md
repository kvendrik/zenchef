# Zenchef CLI: Fix Formitable vs Zenchef API mismatch

## Context

The `zenchef` npm CLI (`github.com/kvendrik/zenchef`) books restaurants via the Formitable/Zenchef widget API. It has a bug: it can't handle restaurants that use the newer **Zenchef SDK** (as opposed to the legacy Formitable widget).

## The bug

`scraper.ts` extracts a restaurant UID from the page HTML by matching `data-restaurant="<uid>"`. This works for both Formitable and Zenchef widgets — but they're **different systems with different APIs**.

- **Formitable widgets** use `widget.formitable.com` iframes or `ft-widget-b2` divs. Their UIDs work against `widget-api.formitable.com/api/`.
- **Zenchef SDK widgets** use `sdk.zenchef.com/v1/sdk.min.js` and `zc-widget-config` divs. Their UIDs are Zenchef restaurant IDs that **do not work** against the Formitable API (returns 500).

Example: Olidò (`olido.amsterdam`) has `zc-widget-config` with `data-restaurant="379003"`. The CLI scrapes UID `379003` successfully, but `GET widget-api.formitable.com/api/product/379003/search/...` returns 500.

## What needs to happen

1. **In `scraper.ts`**: distinguish which system the restaurant uses. Return both the UID and the system type (`formitable` | `zenchef`). Detection signals:
   - Formitable: `widget.formitable.com` in iframe src, or `ft-widget-b2` class
   - Zenchef: `sdk.zenchef.com` script tag, or `zc-widget-config` class

2. **Reverse-engineer the Zenchef booking API**: The Zenchef booking widget is a Next.js SPA at `https://bookings.zenchef.com/results?rid=<id>`. Dig into its JS bundles (fetch the page, find `_next/static/chunks/` scripts) to find the API endpoints it calls for availability and booking. Likely a different base URL than `widget-api.formitable.com`.

3. **In `api.ts`**: add a parallel set of functions for the Zenchef API, or make the existing functions route to the right backend based on the system type.

4. **Update commands**: thread the system type through `check`, `availability`, `book`, and `waitlist`.

## Repo

The repo is at `github.com/kvendrik/zenchef`. Clone it and work from there. The source is TypeScript/Bun — entry point is `src/index.ts`.

Key files:
- `src/scraper.ts` — HTML scraping for widget UID
- `src/api.ts` — Formitable API client (`widget-api.formitable.com`)
- `src/commands/` — CLI commands (check, availability, book, waitlist)
- `src/types.ts` — shared types

## Test cases

- `https://olido.amsterdam` — Zenchef SDK, UID 379003 (currently: check passes, availability 500s)
- `https://www.nnea.nl` — unknown, needs testing
- `https://restaurantgitane.nl` — currently reports "not supported", may need re-checking
- Find a restaurant that uses the legacy Formitable widget to verify it still works after changes

## Approach suggestion

Start by fetching the Zenchef booking SPA page (`bookings.zenchef.com/results?rid=379003`) and analyzing its JS chunks to find the API it calls. Look for fetch/axios calls in the Next.js bundles. The API likely has similar endpoints to Formitable (search tickets, get availability, create booking) but on a different domain.
