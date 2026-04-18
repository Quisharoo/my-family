---
title: Quish Family Map
type: feat
status: active
date: 2026-04-18
origin: docs/brainstorms/2026-04-18-quish-family-map-requirements.md
---

# Quish Family Map

## Overview

Add a new web page — `/family-map` — to the existing Next.js 16 app that presents six proven multi-census Quish family lines as pins on a historic map of south Limerick. Tapping a pin opens the full household roster for that line across 1901, 1911, and 1926, with links to the original National Archives of Ireland census records.

The artifact is a shareable, grandparent-friendly keepsake. It builds on the census substrate validated in this session (fixed linker, disambiguated lines, sanitised birthplaces) and reuses the existing build pipeline, CSS design tokens, and typographic system.

## Problem Statement / Motivation

Family members are non-technical. A CSV, a family-tree app, or a data dashboard all fail the "share it with your aunt" test. The data tells a specific story — households staying rooted in a handful of south Limerick townlands across three censuses spanning the British–Irish Free State transition — and that story is fundamentally geographic, not genealogical. A map honours what the evidence actually supports (continuity of place) without overclaiming what it does not (parentage).

See the origin document for the emotional target (rootedness + personal names + legacy) and the rationale for a tight south-Limerick-only scope.

## Proposed Solution

A single new route rendering:

1. A short title/intro (1–2 sentences).
2. A full-width interactive map centred on south Limerick, using **historic Ordnance Survey of Ireland tiles** as the base layer (25-inch 1888–1913 edition preferred — contemporary to the 1901/1911 censuses).
3. Six pins, one per multi-census family line (Martin Duntryleague, Patrick Knockaunavlyman, Patrick Killeen, Patrick Cush, Pat Ballycahill, Thomas Ballyfroota) plus one for the Martin Ballyfroota 1911→1926 line.
4. Pin click/tap → side sheet (desktop) or full-screen modal (mobile) showing the household roster at each census the line appears in: every named member, age, role, and a link to the original NAI record.
5. Print stylesheet that converts the interactive view into a printable static layout (map replaced with a labelled SVG fallback; roster cards listed per line).

The data for the page is generated at build time from existing `data/analysis/` outputs by a new `scripts/build-map-data.mjs`. Page renders purely client-side after hydration for the map; everything else is static.

## Technical Considerations

- **Framework fit.** Next.js 16 App Router, React 19, plain CSS with custom properties. Match the existing FamilyExplorer aesthetic (`src/components/family-explorer.js`): 56px min touch targets, ~18–19px base type, Fraunces for display / Work Sans for body, 260ms/180ms easings.
- **SSR + Leaflet.** Leaflet requires `window`. Wrap the map component with `next/dynamic(() => import('...'), { ssr: false })`. Render a server-side static list of the six lines as an SEO/accessibility fallback before hydration.
- **Tile source is the plan's one real unknown.** See Phase 1 below for a discover-or-fall-back strategy.
- **Pin coordinates.** Hand-curate six townland centroids (Ballyfroota, Killeen, Duntryleague, Knockaunavlyman, Ballycahill, Cush) using townlands.ie or OSM Nominatim. Store in a small JSON lookup, checked into the repo — not regenerated from upstream, because the upstream CSV has no coordinates.
- **Data join.** `build-map-data.mjs` reads `data/analysis/{quish-family-lines.json,quish-households.json,quish-observations.json}` (or already-generated CSVs) + the townland-coordinates JSON, and emits `src/data/quish-map-data.json` with one entry per pin containing denormalised roster records. Hook into the existing `data:build` npm script so `dev` and `build` pick it up automatically.
- **Accessibility**: keyboard navigation for pins; roster panel as a semantic `<dialog>` or ARIA-tagged drawer; the map has a text-list fallback rendered server-side for anyone who can't (or won't) load tiles.
- **No authentication, no analytics, no backend.** Static export works.

## System-Wide Impact

- **Interaction graph**: new route `/family-map`. No callbacks, middleware, or shared state. The existing `/` home and `/cluster/[slug]` routes are unaffected.
- **Error propagation**: if the tile source fails to load, the map shows a fallback tile-less background with pins + a small "map tiles unavailable" notice. The roster still works. If the JSON fails to load (shouldn't happen — build-time bundled), the SSR fallback list is all users see.
- **State lifecycle risks**: none. All data is static at build time.
- **API surface parity**: none. Nothing else exposes equivalent functionality.
- **Integration scenarios**:
  1. Regenerating `data/analysis/` with new or corrected records → map updates automatically after `npm run data:build`.
  2. Adding a 7th anchor line to `quish-family-lines.csv` → only needs a new entry in the townland-coordinates JSON to appear on the map; otherwise automatic.
  3. Removing the lenient age-match linker rule → fewer pins appear; the page doesn't break.
  4. Tile source 404s → fallback styling kicks in; pins and rosters still render.

## Implementation Phases

### Phase 1: Data & tile source foundation

**Goal:** prove the data shape and tile source before touching UI.

**Tasks:**
- 1.1 Write `scripts/build-map-data.mjs` that joins `quish-family-lines.json` + `quish-households.json` + `quish-observations.json` into one array of "line" objects. Each line carries: id, label (e.g. "Martin Quish line"), townland, ded, county, census years, and an array of households with their ordered members (name, age, role, NAI source URL). Output to `src/data/quish-map-data.json`.
- 1.2 Hand-curate `scripts/data/townland-coordinates.json` with six entries: `{ townland, ded, county, lat, lng }`. Use townlands.ie or OSM Nominatim. Commit with a source comment per entry.
- 1.3 Attach coordinates in the build script. Lines missing a coordinate entry → logged warning, excluded from map output (but kept in a `missingCoordinates` field for the page to list as text).
- 1.4 Wire into `package.json`: extend `data:build` to also run `build-map-data.mjs`.
- 1.5 **Tile source discovery.** In priority order:
  - (a) Inspect `https://map.geohive.ie/` network traffic to find the WMTS/XYZ URL for the historic 25-inch layer. If public and unauthenticated, use it. Note attribution requirements.
  - (b) Check Tailte Éireann / OSI ArcGIS REST services at `https://geohive.maps.arcgis.com/` for a public historic layer.
  - (c) Fall back to National Library of Scotland's Irish OS historic tiles (NLS is known to serve historic OS maps via public XYZ with CC-BY attribution).
  - (d) Absolute fallback: stylised typographic base (cream background, thin contour lines, townland labels in Fraunces) — the option (d) from brainstorming. Still period-feeling; avoids tile-legal risk entirely.
  - Document the chosen source and attribution string in `src/components/map/tile-config.js` as a single constant. List the others as commented fallbacks.

**Deliverables:**
- `scripts/build-map-data.mjs`
- `scripts/data/townland-coordinates.json`
- Updated `package.json` build script
- `src/data/quish-map-data.json` (generated)
- Decision recorded in `src/components/map/tile-config.js`

**Success criteria:**
- `npm run data:build` produces `quish-map-data.json` with six lines, each with ≥1 household.
- The chosen tile URL loads successfully from a plain HTML test page in a browser.
- Attribution text is documented.

### Phase 2: Map page skeleton

**Goal:** a working map with pins, no pin interactions yet.

**Tasks:**
- 2.1 Create route `src/app/family-map/page.js` (server component). Imports `quish-map-data.json`, renders title, intro paragraph, a text-list SSR fallback of the six lines, and a dynamically imported client map.
- 2.2 Add `src/components/family-map/FamilyMap.js` (`"use client"`). Uses `react-leaflet` with `next/dynamic(..., { ssr: false })` wrappers or defers the Leaflet CSS import into a client effect. Renders `MapContainer` → `TileLayer` (from tile-config) → six `Marker` components.
- 2.3 Add `react-leaflet` + `leaflet` deps. Wire in Leaflet's CSS via a `"use client"` side-effect import.
- 2.4 Map view: centred on approx [52.44, -8.36], zoom ~11 to frame the six pins in a single view on desktop; verify mobile framing at 360px wide and let users pinch-zoom.
- 2.5 Pin style: small circular marker in the app's accent colour (from CSS tokens), large enough to hit on a phone (~40px hitbox even if the visible pin is smaller). No clustering (we only have six).

**Deliverables:**
- `src/app/family-map/page.js`
- `src/components/family-map/FamilyMap.js`
- Updated `package.json` dependencies
- `src/app/family-map/family-map.css` (or equivalent)

**Success criteria:**
- Visiting `/family-map` in dev shows the map with all six pins visible on desktop and on a 360px-wide mobile viewport.
- View source shows the six line names in the SSR fallback (proves accessibility story).
- No hydration warnings in the console.

### Phase 3: Pin interactions and roster panel

**Goal:** tap a pin, see the story.

**Tasks:**
- 3.1 Design the roster panel: desktop = right-side sheet (~420px wide), mobile = bottom sheet rising to full screen. Close with X, swipe-down (mobile), or escape (desktop).
- 3.2 Panel content: line label ("Patrick Quish line"), place (townland, DED, county), then one card per census year with every member as a row — first name, age, role. Bottom of each card: "View original record" link to the NAI `source_record_url`.
- 3.3 Keyboard support: pins focusable; Enter/Space opens; Escape closes.
- 3.4 Small print treatment for the ages inside rosters so the names stay the visual hero.
- 3.5 Birthplace shown only when the sanitised value is set (1926 OCR junk never appears).

**Deliverables:**
- `src/components/family-map/RosterPanel.js`
- Roster card styles
- Dialog/drawer interaction logic

**Success criteria:**
- Tapping each of the six pins on mobile opens a readable roster.
- Names never truncate; ages never dominate.
- NAI links open the correct records (spot-check two pins).
- Screen reader announces the roster contents in a sensible order.

### Phase 4: Print stylesheet, polish, and ship

**Goal:** a proper "save as PDF" experience and grandparent-ready polish.

**Tasks:**
- 4.1 `@media print` rules in `globals.css`:
  - Hide the interactive map and replace with a pre-generated SVG of south Limerick showing the six pins with townland labels (committed as `public/family-map-print.svg` or inlined). Alternatively, for v1, a simple labelled list under a "Map" heading if the SVG turns out to be fiddly.
  - Render every roster panel expanded, one per page, with page breaks between lines.
  - Switch to serif body type and remove app chrome.
- 4.2 Hero polish: a one-sentence title in Fraunces, a sentence of context beneath, then the map. No sidebar, no nav chrome on this page.
- 4.3 Empty/edge states: if `quish-map-data.json` has zero lines, render a plain "No lines to show" message instead of a broken map.
- 4.4 OG / Twitter meta tags for the share preview (`"The Quishes of south Limerick, 1901–1926"` + a static map image).
- 4.5 Short footer note: "Based on Irish census records. Placements reflect where evidence shows households persisted, not proven family parentage." One sentence of honesty.
- 4.6 Accessibility audit: colour contrast, focus rings, keyboard traversal, screen-reader narration of the text-list fallback.

**Deliverables:**
- Updated `globals.css` with `@media print` block
- `public/family-map-print.svg` or equivalent
- Page metadata and share-preview image
- A11y audit pass

**Success criteria:**
- Browser "Save as PDF" produces a 2–3 page artefact that can be emailed to a relative without embarrassment.
- Lighthouse accessibility ≥ 95 on the route.
- The page renders correctly with JavaScript disabled (no interactive map, but the six lines and rosters are present as plain HTML).

## Acceptance Criteria

### Functional

- [ ] `/family-map` route renders successfully in development and production builds.
- [ ] Six pins appear on the map, positioned over the correct townlands.
- [ ] Each pin, when activated, shows the household roster at each applicable census year with names, ages, roles, and NAI source links.
- [ ] Regenerating `data/analysis/` via `npm run data:build` updates the map output without code changes.
- [ ] The chosen historic tile source loads with correct attribution text visible on the map.
- [ ] Non-anchor households are excluded (reinforces R4 in the origin).

### Non-functional

- [ ] Mobile viewport at 360px wide shows the map, all six pins, and allows a relative to reach a roster in ≤2 taps.
- [ ] Page renders without JavaScript (text-list fallback with names is visible).
- [ ] Lighthouse accessibility ≥ 95.
- [ ] First Contentful Paint < 2s on a throttled 4G profile.

### Quality gates

- [ ] No hydration warnings.
- [ ] `npm run build` succeeds and the route is included in the static export.
- [ ] Spot-check two pins against their source NAI pages to confirm rosters match.

## Dependencies & Prerequisites

- Existing `data/analysis/` substrate (in place as of this session's fixes).
- `react-leaflet` + `leaflet` npm packages (new).
- A working historic tile source — Phase 1.5 resolves this; the plan must not ship until a chosen source is confirmed or the typographic-base fallback is committed.

## Risk Analysis & Mitigation

- **High — Tile source unavailable or paywalled.** OSI/Tailte Éireann's MapGenie WMTS may require a licence. **Mitigation:** Phase 1.5 has four tiers. Worst case = stylised typographic base; still ships a defensible artefact without tile-legal risk.
- **Medium — Townland centroid inaccuracy.** Hand-curated coordinates might land on a neighbouring field. **Mitigation:** visually verify each pin against the NAI historic map viewer before Phase 2 merges; tolerance is a few hundred metres, which is fine for a keepsake.
- **Medium — React-leaflet SSR fragility in Next.js 16 + React 19.** **Mitigation:** `next/dynamic({ ssr: false })` is a standard, documented pattern; keep the map in a dedicated client component boundary.
- **Low — 1926 NAI record URL format drift.** Current code builds `#a_id=` URLs; if NAI restructures their site, links rot. **Mitigation:** centralise the URL builder in the existing `build-story-substrate.mjs` helpers (already done) and accept the rot risk for v1.
- **Low — A relative expects a proper family tree.** **Mitigation:** the footer honesty sentence, plus the map form itself, makes the artefact's shape obvious.

## Alternative Approaches Considered

- **Ribbon timeline (brainstorm option 2).** Honest about time, but undersells place. Rejected.
- **Printed postcard booklet (brainstorm option 3).** Warmest physical artefact but significantly more design work and not iterable. Deferred to post-v1 consideration.
- **Hand-illustrated map of south Limerick.** Most bespoke, but a commissioned-art project. Deferred.
- **Family-tree view.** Rejected: data proves household continuity, not parentage. Would overclaim.

## Resource Requirements

- One focused developer session (~1–2 days including Phase 1 tile source investigation).
- No design resources required for v1 (uses existing design tokens).
- No infrastructure: ships as part of the existing Next.js app.

## Future Considerations

- Adding the "Also recorded" list of non-anchor Quish households as a dedicated section or secondary page, once the main artefact has landed.
- Promoting unanchored 1926 households to anchor lines as church, civil, or land records are added in a separate research pass.
- Postcard-style print output as a v2, once the web version has been shared and feedback is in.
- Adding photos or documents per line, keyed on household id.

## Documentation Plan

- A short `README` section added to the project root describing the `/family-map` route, where its data comes from, and how to add a new line.
- Origin brainstorm (`docs/brainstorms/2026-04-18-quish-family-map-requirements.md`) remains the product-intent source of truth.
- This plan remains the technical source of truth until implementation is merged.

## Sources & References

### Origin

- **Origin document:** [docs/brainstorms/2026-04-18-quish-family-map-requirements.md](../brainstorms/2026-04-18-quish-family-map-requirements.md)
- Key decisions carried forward:
  - Map-first artefact with tight south-Limerick scope (origin: R1, R4)
  - Historic OS base tiles over modern map tiles (origin: R2, Key Decisions)
  - Pin detail = full household roster (origin: R3)
  - Non-anchor households excluded from v1 (origin: R4, Scope Boundaries)
  - Web first with print-respectable output (origin: R6, R7, Key Decisions)

### Internal references

- Next.js app entry: `src/app/page.js`, `src/app/layout.js`
- Existing design system: `src/app/globals.css` (CSS custom properties, Fraunces + Work Sans)
- Existing grandparent UX precedent: `src/components/family-explorer.js`
- Data pipeline: `scripts/build-story-substrate.mjs`, `scripts/build-viz-data.mjs`, `src/lib/quish-data.js`
- Substrate inputs: `.worktrees/quish-analysis-substrate/data/analysis/quish-family-lines.json`, `quish-households.json`, `quish-observations.json`
- Source URL builders: `sourceRecordUrl` in `scripts/build-story-substrate.mjs`

### External references

- GeoHive Map Viewer (tile source candidate): https://map.geohive.ie/
- Tailte Éireann / OSI historic maps info: https://osi.ie/services/mapgenie/
- react-leaflet docs: https://react-leaflet.js.org/
- Next.js + Leaflet SSR pattern: https://nextjs.org/docs/app/api-reference/components/lazy (`next/dynamic` with `ssr: false`)
- townlands.ie (coordinate lookup): https://www.townlands.ie/

### Related work

- Session transcript: validated substrate (linker fix, Patrick disambiguation, 1926 birthplace sanitisation) — the data layer this plan depends on.
