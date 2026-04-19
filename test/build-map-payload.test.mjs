import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import { buildMapPayload } from "../scripts/lib/build-map-payload.mjs";

function readJson(relativePath) {
  const absolutePath = path.join(process.cwd(), relativePath);
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

test("buildMapPayload separates linked family lines from isolated sightings", () => {
  const householdsPayload = {
    households: [
      {
        id: "1901::Tipperary::Emly::Nickeres::2::1718183",
        censusYear: 1901,
        censusEdition: { regime: "British administration" },
        county: "Tipperary",
        ded: "Emly",
        townland: "Nickeres",
        houseNumber: "2",
        members: [{ id: "1", firstName: "Patrick", relation: "Head of Family" }],
      },
      {
        id: "1911::Tipperary::Emly::Nickeres::2::830956",
        censusYear: 1911,
        censusEdition: { regime: "British administration" },
        county: "Tipperary",
        ded: "Emly",
        townland: "Nickeres",
        houseNumber: "2",
        members: [{ id: "2", firstName: "Mary", relation: "Wife" }],
      },
      {
        id: "1926::Cork::Cobh Rural::Donegal::::244945",
        censusYear: 1926,
        censusEdition: { regime: "Irish Free State" },
        county: "Cork",
        ded: "Cobh Rural",
        townland: "Donegal",
        houseNumber: null,
        members: [{ id: "3", firstName: "John", relation: "Head" }],
      },
    ],
  };

  const familyLinesPayload = {
    familyLines: [
      {
        id: "line::tipperary",
        householdIds: [
          "1901::Tipperary::Emly::Nickeres::2::1718183",
          "1911::Tipperary::Emly::Nickeres::2::830956",
        ],
        censusYears: [1901, 1911],
        milestones: { firstFreeStateCensus: false },
        label: "Patrick Quish line",
        placeLabel: "Tipperary | Emly | Nickeres",
      },
      {
        id: "line::cork",
        householdIds: ["1926::Cork::Cobh Rural::Donegal::::244945"],
        censusYears: [1926],
        milestones: { firstFreeStateCensus: true },
        label: "John Quish line",
        placeLabel: "Cork | Cobh Rural | Donegal",
      },
    ],
  };

  const coordsPayload = {
    coordinates: [
      {
        county: "Tipperary",
        ded: "Emly",
        townland: "Nickeres",
        lat: 52.4632,
        lng: -8.3244,
      },
      {
        county: "Cork",
        ded: "Cobh Rural",
        townland: "Donegal",
        lat: 51.8512,
        lng: -8.2944,
      },
    ],
  };

  const payload = buildMapPayload({
    familyLinesPayload,
    householdsPayload,
    coordsPayload,
  });

  assert.equal(payload.lineCount, 1);
  assert.equal(payload.sightingCount, 1);
  assert.equal(payload.lines[0].county, "Tipperary");
  assert.equal(payload.lines[0].evidenceTier, "line");
  assert.deepEqual(payload.lines[0].censusYears, [1901, 1911]);
  assert.equal(payload.sightings[0].county, "Cork");
  assert.equal(payload.sightings[0].evidenceTier, "sighting");
  assert.deepEqual(payload.sightings[0].censusYears, [1926]);
});

test("buildMapPayload produces the nationwide counts from the current analysis data", () => {
  const payload = buildMapPayload({
    familyLinesPayload: readJson("data/analysis/quish-family-lines.json"),
    householdsPayload: readJson("data/analysis/quish-households.json"),
    coordsPayload: readJson("scripts/data/townland-coordinates.json"),
  });

  assert.equal(payload.lineCount, 13);
  assert.equal(payload.sightingCount, 30);
  assert.equal(payload.missingCoordinateCount, 0);
  assert.equal(payload.lines.some((line) => line.county === "Tipperary"), true);
  assert.equal(payload.lines.some((line) => line.county === "Dublin"), true);
  assert.equal(payload.sightings.some((line) => line.county === "Cork"), true);
  assert.equal(payload.sightings.some((line) => line.county === "Wexford"), true);
});
