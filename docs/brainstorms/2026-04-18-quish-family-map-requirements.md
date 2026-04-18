---
date: 2026-04-18
topic: quish-family-map
---

# Quish Family Map

## Problem Frame
We have a validated census substrate with six Quish family lines that can be traced across 1901, 1911, and 1926 in a tight cluster of south Limerick townlands. Non-technical family members need a way to encounter this that feels personal, rooted in place, and permanent — not a spreadsheet, not a generic family-tree tool.

The core emotional goal is three things at once:
- **Rootedness** — "we've been in *this place* for generations"
- **Personal** — they see the actual names
- **Legacy** — a proper, shareable record exists

## Requirements
- **R1. Map-first artifact.** A single web page whose primary element is a map of south Limerick with six pins, one per proven multi-census family line.
- **R2. Historic base map.** The map tiles use a period-appropriate historic Ordnance Survey of Ireland source (via GeoHive or equivalent), not a modern OSM/Mapbox base. Pan and zoom supported.
- **R3. Pin detail = full household roster.** Tapping/clicking a pin opens the household roster for that line at each census it appears in (1901, 1911, 1926 as applicable): every named person with age and role (head, wife, son, sister, etc.).
- **R4. Anchor lines only.** The six multi-census lines are the entire content. Unanchored 1926 households and single-census appearances are intentionally excluded from v1.
- **R5. Grandparent-friendly.** Large readable type, generous tap targets, no jargon ("head of family" is fine; "person-link score" is not). Works on phone and tablet.
- **R6. Shareable.** Works as a public URL relatives can open with no login, no install.
- **R7. Print-respectable.** A browser "Save as PDF" or print produces something a family member could frame or stick in a folder. This does not need to be poster-grade in v1; it needs to not look broken.
- **R8. Data-driven.** The page reads from the existing `data/analysis/` outputs. Adding a new household, promoting an unanchored household to a line, or correcting a roster requires only a data/rebuild change, never a hand-edit of the page.
- **R9. Tile source is swappable.** The historic tile URL lives in a single config constant, with 2–3 fallback providers documented, so the artifact survives if GeoHive changes or paywalls.

## Success Criteria
- A relative who has never used a family-tree site can open the link on their phone, tap a pin, and read their ancestor's name within 30 seconds.
- The six anchor lines and their rosters match the data in `data/analysis/quish-family-lines.csv` exactly — no hand-typed drift.
- The page still works if the backing data is regenerated with new or corrected records.

## Scope Boundaries
- **No family-tree view.** The data proves household continuity, not parentage. Drawing a tree would imply kinship we haven't established.
- **No unanchored 1926 households in v1.** They are real but not yet linked; showing them on the same map would muddle the "proven continuity" story. Can be added as an "Also recorded" list in a later version.
- **No birth/marriage/death records, no church records, no land records.** Census data only.
- **No hand illustrations or commissioned art in v1.** Historic OS base map + clean typography carries the aesthetic.
- **No authentication, no comments, no user accounts.**

## Key Decisions
- **Map over tree**: the data is geographic + temporal, not genealogical. A map is the honest shape.
- **Tight focus (south Limerick only)**: every pin is a proven story; no filler.
- **Historic OS base**: directly serves rootedness + legacy; unique vs. generic family-tree tools.
- **Web first, print-respectable**: fastest to relatives' hands; print can be elevated to a dedicated poster later without throwing work away.
- **Non-anchor households excluded from v1**: honesty of "this is what the evidence actually shows" outweighs completeness for the keepsake.

## Dependencies / Assumptions
- Ordnance Survey Ireland / GeoHive historic tiles are publicly available and WMTS-compatible. To confirm during planning.
- The existing Next.js app (`.worktrees/quish-analysis-substrate/src/app/` or main app) is the home for this page.
- The data substrate (fixed this session) stays authoritative; no parallel data store in the UI.

## Outstanding Questions

### Resolve Before Planning
None — the product shape is clear enough to plan against.

### Deferred to Planning
- [Affects R2][Needs research] Which specific GeoHive (or alternative) tile URL and zoom range best covers south Limerick townlands at the detail we want? What's the attribution requirement?
- [Affects R2][Technical] Leaflet vs MapLibre vs a lighter bespoke SVG implementation — which fits best with the existing Next.js app and print stylesheet?
- [Affects R1, R5] Landing experience: open straight onto the map, or a short title card that transitions in? Grandparent usability argues for the latter but it's tuneable post-build.
- [Affects R3] Visual treatment of the roster panel (side sheet, modal, inline scroll). Pick during implementation based on mobile feel.
- [Affects R7] Print stylesheet scope: just "doesn't break" in v1, or a specific A4 portrait layout? Decide after seeing the web version.

## Next Steps
→ `/ce:plan` for structured implementation planning
