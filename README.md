# Quish Family Explorer

Deployable census explorer for the `Quish` surname, built to share with family.

## Data files

- `quish-census.json`: exact `Quish` census hits
- `quishe-census.json`: close `Quishe` variant hits
- `quish-households.json`: grouped households derived from raw rows
- `quish-continuities.json`: strongest household continuities across census years

## App

- `src/app`: Next.js routes, metadata, and icons
- `src/components/family-explorer.js`: tree-first client UI
- `src/data/quish-viz-data.json`: generated app-ready dataset
- `scripts/build-viz-data.mjs`: year-agnostic data builder

## Run locally

```bash
npm install
npm run dev
```

Open the local URL shown by Next.

## Build for deploy

```bash
npm run build
npm run start
```

## Deploy on Vercel

- Import the `my-family` folder as a Vercel project.
- Framework preset: `Next.js`
- No environment variables are required for the current static dataset.

## Census interpretation rules

- Household trees show only relationships written on the census form.
- Cross-year links are continuity evidence, not proof of wider kinship.
- Cross-household cousin, aunt, or first-cousin claims still need outside records.

## 1926

The app and build pipeline are year-agnostic. When the `1926` census is public:

1. Fetch the `1926` surname results.
2. Add them to the same household pipeline.
3. Rebuild `src/data/quish-viz-data.json`.
