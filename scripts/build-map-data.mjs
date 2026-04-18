import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const analysisDir = path.join(repoRoot, "data", "analysis");
const outputPath = path.join(repoRoot, "src", "data", "quish-map-data.json");
const coordsPath = path.join(__dirname, "data", "townland-coordinates.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function sourceRecordUrl(member) {
  const id = member.sourceRef?.sourceId || member.id;
  if (member.censusYear === 1926) {
    return `https://nationalarchives.ie/kiosk-1926-census/census-record/#a_id=${id}`;
  }
  return `https://nationalarchives.ie/collections/search-the-census/census-record/#id=${id}`;
}

function coordinateKey(county, ded, townland) {
  return [county, ded, townland].join("::");
}

const familyLinesFile = readJson(path.join(analysisDir, "quish-family-lines.json"));
const householdsFile = readJson(path.join(analysisDir, "quish-households.json"));
const coordsFile = readJson(coordsPath);

const householdById = new Map(
  householdsFile.households.map((household) => [household.id, household])
);

const coordinateIndex = new Map(
  coordsFile.coordinates.map((entry) => [
    coordinateKey(entry.county, entry.ded, entry.townland),
    { lat: entry.lat, lng: entry.lng },
  ])
);

const headRoleMatcher = /head/i;

function orderMembers(members) {
  return [...members].sort((a, b) => {
    const aHead = headRoleMatcher.test(a.relation || "") ? 0 : 1;
    const bHead = headRoleMatcher.test(b.relation || "") ? 0 : 1;
    if (aHead !== bHead) return aHead - bHead;
    return (b.age ?? 0) - (a.age ?? 0);
  });
}

function buildLineEntry(line) {
  const households = line.householdIds
    .map((id) => householdById.get(id))
    .filter(Boolean);
  if (!households.length) return null;

  const primary = households[0];
  const coordinate = coordinateIndex.get(
    coordinateKey(primary.county, primary.ded, primary.townland)
  );

  const yearRecords = households.map((household) => ({
    year: household.censusYear,
    regime: household.censusEdition?.regime || null,
    houseNumber: household.houseNumber || null,
    memberCount: household.members.length,
    members: orderMembers(household.members).map((member) => ({
      firstName: member.firstName,
      age: member.age,
      relation: member.relation,
      sex: member.sex,
      birthplace: member.birthplace || null,
      occupation: member.occupation || null,
      sourceRecordUrl: sourceRecordUrl(member),
    })),
  }));

  return {
    id: line.id,
    label: line.label || "Quish line",
    placeLabel: line.placeLabel,
    county: primary.county,
    ded: primary.ded,
    townland: primary.townland,
    coordinate: coordinate || null,
    censusYears: line.censusYears,
    yearRecords,
  };
}

const multiCensusLines = familyLinesFile.familyLines.filter(
  (line) => line.censusYears.length >= 2 && line.milestones?.firstFreeStateCensus
);

const entries = multiCensusLines.map(buildLineEntry).filter(Boolean);
const mappable = entries.filter((entry) => entry.coordinate);
const missingCoordinates = entries.filter((entry) => !entry.coordinate);

if (missingCoordinates.length) {
  for (const entry of missingCoordinates) {
    console.warn(
      `[build-map-data] missing coordinate for ${entry.placeLabel} (${entry.id})`
    );
  }
}

const payload = {
  generatedAt: new Date().toISOString(),
  lineCount: mappable.length,
  missingCoordinateCount: missingCoordinates.length,
  lines: mappable,
  missingCoordinates: missingCoordinates.map((entry) => ({
    id: entry.id,
    label: entry.label,
    placeLabel: entry.placeLabel,
  })),
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Wrote ${mappable.length} mappable family lines to ${path.relative(repoRoot, outputPath)}` +
    (missingCoordinates.length ? ` (${missingCoordinates.length} missing coordinates)` : "")
);
