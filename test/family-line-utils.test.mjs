import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildCountyOptions,
  buildEvidenceOptions,
  formatLineDisplay,
  filterEntriesByEvidence,
  filterEntriesByCounty,
  groupEntriesByCounty,
} from "../src/lib/family-line-utils.mjs";

function readMapData() {
  const absolutePath = path.join(process.cwd(), "src/data/quish-map-data.json");
  return JSON.parse(fs.readFileSync(absolutePath, "utf8"));
}

test("buildCountyOptions returns All first then sorted county options", () => {
  const options = buildCountyOptions([
    { county: "Limerick" },
    { county: "Dublin" },
    { county: "Tipperary" },
    { county: "Limerick" },
  ]);

  assert.deepEqual(options, ["All", "Dublin", "Limerick", "Tipperary"]);
});

test("filterEntriesByCounty returns all entries for All and narrows for a county", () => {
  const entries = [
    { id: "1", county: "Limerick" },
    { id: "2", county: "Tipperary" },
    { id: "3", county: "Limerick" },
  ];

  assert.equal(filterEntriesByCounty(entries, "All").length, 3);
  assert.deepEqual(
    filterEntriesByCounty(entries, "Limerick").map((entry) => entry.id),
    ["1", "3"]
  );
});

test("buildEvidenceOptions returns mobile-friendly evidence labels", () => {
  assert.deepEqual(buildEvidenceOptions(), [
    { value: "all", label: "All" },
    { value: "line", label: "Linked lines" },
    { value: "sighting", label: "Single households" },
  ]);
});

test("filterEntriesByEvidence narrows by evidence tier", () => {
  const entries = [
    { id: "1", evidenceTier: "line" },
    { id: "2", evidenceTier: "sighting" },
    { id: "3", evidenceTier: "line" },
  ];

  assert.equal(filterEntriesByEvidence(entries, "all").length, 3);
  assert.deepEqual(
    filterEntriesByEvidence(entries, "line").map((entry) => entry.id),
    ["1", "3"]
  );
  assert.deepEqual(
    filterEntriesByEvidence(entries, "sighting").map((entry) => entry.id),
    ["2"]
  );
});

test("groupEntriesByCounty reflects the current linked-line spread", () => {
  const mapData = readMapData();
  const grouped = groupEntriesByCounty(mapData.lines);

  assert.deepEqual(grouped, {
    Dublin: 1,
    Limerick: 10,
    Tipperary: 2,
  });
});

test("formatLineDisplay keeps named family lines and cleans generic place labels", () => {
  assert.deepEqual(
    formatLineDisplay({
      label: "Pat Quish line",
      townland: "Ballycahill",
      ded: "Hospital",
      county: "Limerick",
    }),
    {
      title: "Pat Quish line",
      place: "Ballycahill",
      meta: "Hospital, Co. Limerick",
    }
  );

  assert.deepEqual(
    formatLineDisplay({
      label: "Dublin | Arran Quay | Aberdeen Street line",
      townland: "Aberdeen Street",
      ded: "Arran Quay",
      county: "Dublin",
    }),
    {
      title: "Aberdeen Street line",
      place: "Aberdeen Street",
      meta: "Arran Quay, Co. Dublin",
    }
  );

  assert.deepEqual(
    formatLineDisplay({
      label: "Thomas Quish line",
      townland: "Ballyhone",
      ded: "Rodus",
      county: "Tipperary",
      evidenceTier: "sighting",
    }),
    {
      title: "Thomas Quish household",
      place: "Ballyhone",
      meta: "Rodus, Co. Tipperary",
    }
  );
});
