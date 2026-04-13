# Test Restaurants

Reference for manually testing changes. Each restaurant covers different scenarios.

## Zenchef SDK restaurants

### Olidò (olido.amsterdam)
- **System:** Zenchef SDK
- **UID:** 379003
- **Scenario:** Happy path. Reliable availability, single shift, deposit/prepayment (€10/person).
- **Test commands:**
  ```
  bun src/index.ts check https://olido.amsterdam
  bun src/index.ts dates https://olido.amsterdam --guests 2
  bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 2
  ```

### Bistrobar Berlin (bistrobarberlin.nl)
- **System:** Zenchef SDK
- **UID:** 371381
- **Scenario:** Second Zenchef restaurant. Verifies behavior isn't Olidò-specific. Note: the correct URL is `bistrobarberlin.nl` (no hyphen).
- **Test commands:**
  ```
  bun src/index.ts check https://www.bistrobarberlin.nl
  bun src/index.ts dates https://www.bistrobarberlin.nl --guests 2
  ```

### Bokkedoorns (bokkedoorns.nl)
- **System:** Zenchef SDK
- **UID:** 371801
- **Scenario:** Multiple shifts (Lunch + Diner). Some days have both, some only Lunch. Also has waitlist configured (`waitlist_total=10`). Good for testing `--ticket <shift_id>` filtering and multi-shift display.
- **Test commands:**
  ```
  bun src/index.ts dates https://bokkedoorns.nl --guests 2
  bun src/index.ts availability https://bokkedoorns.nl --date 17/04 --guests 2
  ```
- **Expected:** Shows two shift sections (Lunch 12:00–14:00, Diner 19:00–21:00) with separate time slots.

### Locale Kaap (localekaap.nl)
- **System:** Zenchef SDK
- **UID:** 379010
- **Scenario:** Three shifts (Lunch, Diner, Diner). Tests rendering of 3+ shifts in a single day. Rotterdam restaurant.
- **Test commands:**
  ```
  bun src/index.ts availability https://localekaap.nl --date 16/04 --guests 2
  ```
- **Expected:** Three shift sections with different time windows and capacities.

### Waaghals (waaghals.nl)
- **System:** Zenchef SDK
- **UID:** 379015
- **Scenario:** Waitlist availability. Vegetarian restaurant that fills up fast. Has waitlist with `waitlist_total=40`. Sometimes shows different shift names (e.g. "Spring special" vs "Diner").
- **Test commands:**
  ```
  bun src/index.ts dates https://waaghals.nl --guests 2
  bun src/index.ts availability https://waaghals.nl --date DD/MM --guests 2
  ```

## Formitable restaurants

### BAK Restaurant (bakrestaurant.nl)
- **System:** Formitable (static HTML)
- **UID:** dadd7a3b
- **Scenario:** Formitable status code coverage. This restaurant returns `status 0` for available dates (not `status 6` like De Kas). With large guest counts (e.g. `--guests 10`), some dates return `status 6` (limited availability). Closed Mon/Tue (`status 1` with empty message). Past dates return `status 2`. Essential for verifying the `dates` command handles all Formitable status codes correctly.
- **Test commands:**
  ```
  bun src/index.ts dates https://bakrestaurant.nl --guests 2
  bun src/index.ts dates https://bakrestaurant.nl --guests 10
  ```
- **Expected:** Only future dates shown (no past dates). Available dates are Wed–Sun. Mon/Tue excluded (restaurant closed). With `--guests 10`, should still show available dates (status 0 + status 6 both treated as available).
- **Cross-check:** Compare output against `curl -s "https://widget-api.formitable.com/api/availability/dadd7a3b/month/<M>/<YYYY>/2/en"` — status 0 and 6 should appear as available, status 1 as closed/waitlist, status 2 (past) should be filtered out.

### Monsieur Rouge (monsieurrouge.nl)
- **System:** Formitable (static HTML, `ft-widget-b2` div)
- **UID:** b3d6c5c5
- **Scenario:** Multiple tickets/experiences. Shows both "Bartable with a view" and "Book a table for Brunch-Lunch" as separate bookable products. Good for testing `--ticket` filtering and multi-ticket display.
- **Test commands:**
  ```
  bun src/index.ts check https://monsieurrouge.nl
  bun src/index.ts availability https://monsieurrouge.nl --date 15/05 --guests 2
  bun src/index.ts availability https://monsieurrouge.nl --date 15/05 --guests 2 --ticket 36009b54
  ```
- **Expected:** Two ticket sections, each with their own time slots and spot counts.
- **Note:** Current month may show no dates available — check future months with `--month`.

### Restaurant De Kas (restaurantdekas.com)
- **System:** Formitable (static HTML, `ft-widget-b2` div)
- **UID:** 643e1a93
- **Scenario:** Scarce availability with multiple tickets (Lunch + Dinner). Most dates are fully booked or closed. Widget is on a subpage (`/nl/tuin`), not the homepage. The `dates` command shows a mix of available and waitlist-only dates. Good for testing that the multi-time ticket search works — De Kas's dinner service only returns tickets when queried at evening times, not noon.
- **Test commands:**
  ```
  bun src/index.ts check https://restaurantdekas.com/nl/tuin
  bun src/index.ts dates https://restaurantdekas.com/nl/tuin --guests 2
  bun src/index.ts dates https://restaurantdekas.com/nl/tuin --guests 2 --month 05/2026
  bun src/index.ts availability https://restaurantdekas.com/nl/tuin --date DD/MM --guests 2
  ```
- **Expected:** `availability` should show both Lunch and Dinner sections, likely all WAITLIST.

### Scheepskameel (scheepskameel.nl)
- **System:** Formitable (static HTML)
- **UID:** 4d144539
- **Scenario:** Basic Formitable detection. Straightforward `check` flow.
- **Test commands:**
  ```
  bun src/index.ts check https://scheepskameel.nl
  ```

## Client-side rendered widgets

### Restaurant Gitane (restaurantgitane.nl)
- **System:** Formitable, but widget is injected client-side by Nuxt.js
- **UID:** 86db0b51
- **Scenario:** The `ft-widget-b2` div with `data-restaurant` attribute is NOT in the server-rendered HTML — it's compiled into a Nuxt JS bundle. Tests the JS bundle scanning fallback in `scraper.ts`. If this restaurant stops being detected, the JS bundle filename has changed and the scanning logic may need updating.
- **How detection works:** The scraper first checks static HTML (finds nothing), then fetches linked JS bundles and scans them for `data-restaurant` patterns.
- **Test commands:**
  ```
  bun src/index.ts check https://restaurantgitane.nl
  bun src/index.ts dates https://restaurantgitane.nl --guests 2
  ```
- **Expected:** `check` detects Formitable UID `86db0b51`. `dates` typically shows very few or no available dates (mostly waitlist-only).

## Multi-venue / group widgets

### Ron Gastrobar (rongastrobar.nl)
- **System:** Formitable, `data-group` attribute (not `data-restaurant`)
- **UID:** c5e0a814
- **Scenario:** Uses `data-group` for a multi-restaurant chooser widget. The CLI detects the UID, but Formitable API calls (search, availability, dates) return 500 because group UIDs are not regular restaurant UIDs. This is a **known limitation** — the CLI doesn't support group widgets.
- **Test commands:**
  ```
  bun src/index.ts check https://rongastrobar.nl
  bun src/index.ts dates https://rongastrobar.nl --guests 2
  ```
- **Expected:** `check` detects UID `c5e0a814`. `dates` fails with a 500 error from Formitable.

## Edge cases

### Wrong/broken URLs
- `bistrobar-berlin.nl` (with hyphen) — wrong URL for Bistrobar Berlin. Should fail gracefully.
- `https://nonexistent-restaurant-xyz.com` — non-existent domain. Should show a fetch error.

### Non-Formitable/Zenchef restaurants
- `nnea.nl` — uses a different booking system entirely. `check` should report "does not use Zenchef/Formitable".

### Guest count limits
- `bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 8` — should show fewer time slots (max capacity is 9 per slot).
- `bun src/index.ts availability https://olido.amsterdam --date DD/MM --guests 10` — should show "No time slots available" (exceeds max of 9).

### Month navigation
- `bun src/index.ts dates <url> --guests 2 --month 06/2026` — test future months.
- `bun src/index.ts dates <url> --guests 2 --month 01/2026` — test past months (should show no availability).

### Past date filtering
- `bun src/index.ts dates https://bakrestaurant.nl --guests 2` — current month should only show dates from today onwards, never past dates. Cross-check that the first date in the output is today or later.
- Important for both Formitable and Zenchef paths — the API may return past dates (Formitable returns them with `status 2`, Zenchef returns them with `isOpen: false` or with shifts), but the CLI must filter them out.

### Formitable status code mapping
- The Formitable month availability API uses different status codes across restaurants. Always verify with at least two Formitable restaurants:
  - `bakrestaurant.nl` — uses `status 0` for available dates
  - `restaurantdekas.com/nl/tuin` — uses `status 6` for available dates
  - Both should show correct results from `bun src/index.ts dates <url> --guests 2`
- Status reference: `0` = available, `1` = closed/fully booked (check `message` field), `2` = past date, `6` = available/limited availability.

### Deep pages
- `restaurantdekas.com/nl/tuin` — widget is on a subpage, not the homepage. Verify the CLI works with full subpage URLs.
