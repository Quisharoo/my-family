# Quish Research Brief

## Why this exists
These exports are designed for genealogical and analytical work that goes beyond reading one census record at a time. They surface cross-decade links, household continuity, place concentration, and which lines clearly reach the first census of the Irish Free State in 1926.

## Headline trends
- Observations by year: 1901=80, 1911=83, 1926=69
- Households by year: 1901=20, 1911=21, 1926=21
- Family lines with multi-census continuity reaching 1926: 7
- Additional 1926 households with no earlier-census match: 14
- Person threads reaching 1926: 69

## Strongest place concentrations
- Limerick | Glenbrohane | Ballyfroota: 27 observed household members
- Limerick | Ballylanders | Killeen: 27 observed household members
- Limerick | Duntryleague | Duntryleague: 27 observed household members
- Limerick | Glenbrohane | Knockaunavlyman: 19 observed household members
- Limerick | Hospital | Ballycahill: 16 observed household members

## Data caveats
- **1926 birthplace field is unreliable.** Many entries are OCR garbage (e.g. "Limfrog", "Cuman"). The `birthplace` column is sanitised to known Irish counties only; original values are preserved in `birthplace_raw`.
- **Household links have varying strength.** Some rest on a single person-link at "possible" confidence. See `quish-household-links.csv` for per-link scores.
- **Age inflation around 1911 is common** (Irish pension-age effects). The household linker uses a lenient age window when both census entries show the same head-of-family name at the same townland.

## Intended analyst workflow
- Start with `quish-observations.csv` to inspect the full canonical record set.
- Use `quish-person-links.csv` and `quish-household-links.csv` to evaluate computed continuity.
- Use `quish-family-lines.csv` to trace multi-decade lineage candidates.
- Use `quish-research-summary.json` and `quish-place-summary.csv` for trend analysis and place concentration.

