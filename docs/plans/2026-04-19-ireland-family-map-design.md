# Ireland Family Map Design

## Goal

Extend the current Quish map from a south Limerick artifact into an island-of-Ireland experience while keeping evidence tiers honest.

## Approved Decisions

- The map opens on the full island of Ireland.
- `Family lines` are any accepted linked household continuity covering at least two censuses.
- `1926` extends a line where present, but is not required for line status.
- `Isolated sightings` remain visible as a lighter secondary layer.
- Selecting a line should zoom into its local area and open the full roster panel.
- Limerick is not privileged in the framing; it remains richer because the data is richer.

## Evidence Model

### Primary

- Two-census lines: accepted linked households across `1901 -> 1911`.
- Three-census lines: accepted linked households across `1901 -> 1911 -> 1926` or `1911 -> 1926` where the line already exists in the analysis output.

### Secondary

- Single-census households remain on the map as isolated sightings.
- They are visually lighter and do not get the same treatment as linked lines.

## UX Model

- Initial state shows the whole island and both evidence tiers.
- Full line labels appear only for selected or strongly focused lines, not for every marker at island scale.
- Selecting a line zooms toward the local cluster and opens the roster panel.
- Selecting a sighting opens a smaller factual panel rather than a full continuity story.

## Data Requirements

- `src/data/quish-map-data.json` needs to include:
  - `lines`: all mappable `2+ census` family lines
  - `sightings`: all mappable `1 census` households
  - counts for both tiers
  - coordinate coverage across all mapped places
- The payload must remain fully generated from `data/analysis/` plus the coordinate lookup file.

## Non-Goals

- No genealogical tree.
- No runtime geocoding.
- No hand-curated HTML content per county or household.
- No change to the underlying continuity-analysis rules in this pass.
