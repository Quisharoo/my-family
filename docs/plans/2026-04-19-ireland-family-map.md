# Ireland Family Map Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild the Quish map as an island-of-Ireland experience with nationwide family lines and a secondary sightings layer.

**Architecture:** Move map-payload assembly into a testable library, generate a richer JSON payload from the existing family-line analysis plus static coordinates, and update the existing Leaflet UI to support island overview, focused zoom, and tiered marker treatment.

**Tech Stack:** Node.js scripts, Next.js App Router, React 19, React Leaflet, Node test runner

---

### Task 1: Document the approved scope

**Files:**
- Create: `docs/plans/2026-04-19-ireland-family-map-design.md`
- Create: `docs/plans/2026-04-19-ireland-family-map.md`

**Step 1: Write the approved design**

- Capture the island-wide scope, evidence tiers, and selection behavior.

**Step 2: Save the implementation plan**

- Capture the code, data, testing, and verification steps below.

### Task 2: Add failing tests for the new map payload

**Files:**
- Create: `test/build-map-payload.test.mjs`
- Create: `scripts/lib/build-map-payload.mjs`

**Step 1: Write the failing tests**

- Assert that the builder returns:
  - nationwide `lines` for all `2+ census` family lines
  - `sightings` for all `1 census` households
  - metadata counts for both groups
  - `Tipperary` and `Dublin` line coverage

**Step 2: Run the targeted tests to verify failure**

Run: `npm test -- test/build-map-payload.test.mjs`

Expected: FAIL because the helper does not exist yet and/or the payload shape is still Limerick-specific.

### Task 3: Implement the new map payload builder

**Files:**
- Create: `scripts/lib/build-map-payload.mjs`
- Modify: `scripts/build-map-data.mjs`
- Modify: `scripts/data/townland-coordinates.json`

**Step 1: Write the minimal builder**

- Read family lines, households, and coordinates.
- Emit:
  - `lines` from `familyLines` where `censusYears.length >= 2`
  - `sightings` from `familyLines` where `censusYears.length === 1`
- Add per-entry coordinates, year records, and simple evidence-tier metadata.

**Step 2: Expand the coordinate file**

- Add static coordinates for every mapped place in the new payload.
- Keep the file as the only coordinate source.

**Step 3: Run the targeted tests**

Run: `npm test -- test/build-map-payload.test.mjs`

Expected: PASS

### Task 4: Update the map UI for island overview and tiered markers

**Files:**
- Modify: `src/components/family-map/FamilyMap.js`
- Modify: `src/components/family-map/FamilyMapClient.js`
- Modify: `src/components/family-map/RosterPanel.js`
- Modify: `src/app/page.js`
- Modify: `src/app/home.css`
- Modify: `src/app/lines/page.js`

**Step 1: Update page copy**

- Replace south-Limerick-only framing with island-wide framing.

**Step 2: Render both marker tiers**

- Keep full interactivity for `lines`.
- Add secondary markers for `sightings`.
- Limit permanent labels to selected/focused contexts instead of island-scale default.

**Step 3: Keep focus behavior**

- Fit the full island initially.
- Fly to the selected line on click.
- Show a smaller factual panel for single sightings.

### Task 5: Verify, commit, and push

**Files:**
- Modify: generated outputs under `src/data/`

**Step 1: Run all tests**

Run: `npm test`

Expected: PASS

**Step 2: Run the production build**

Run: `npm run build`

Expected: PASS with regenerated map data.

**Step 3: Commit**

```bash
git add docs/plans/2026-04-19-ireland-family-map-design.md docs/plans/2026-04-19-ireland-family-map.md scripts/lib/build-map-payload.mjs scripts/build-map-data.mjs scripts/data/townland-coordinates.json test/build-map-payload.test.mjs src/data/quish-map-data.json src/components/family-map/FamilyMap.js src/components/family-map/FamilyMapClient.js src/components/family-map/RosterPanel.js src/app/page.js src/app/home.css src/app/lines/page.js
git commit -m "feat: expand family map to island-wide view"
```

**Step 4: Push**

```bash
git push origin main
```
