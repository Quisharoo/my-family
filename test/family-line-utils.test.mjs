import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

import {
  buildCountyOptions,
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

test("groupEntriesByCounty reflects the current linked-line spread", () => {
  const mapData = readMapData();
  const grouped = groupEntriesByCounty(mapData.lines);

  assert.deepEqual(grouped, {
    Dublin: 1,
    Limerick: 10,
    Tipperary: 2,
  });
});
