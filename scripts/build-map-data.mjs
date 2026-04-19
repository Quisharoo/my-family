import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { buildMapPayload } from "./lib/build-map-payload.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, "..");
const analysisDir = path.join(repoRoot, "data", "analysis");
const outputPath = path.join(repoRoot, "src", "data", "quish-map-data.json");
const coordsPath = path.join(__dirname, "data", "townland-coordinates.json");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

const familyLinesFile = readJson(path.join(analysisDir, "quish-family-lines.json"));
const householdsFile = readJson(path.join(analysisDir, "quish-households.json"));
const coordsFile = readJson(coordsPath);
const payload = buildMapPayload({
  familyLinesPayload: familyLinesFile,
  householdsPayload: householdsFile,
  coordsPayload: coordsFile,
});

if (payload.missingCoordinates.length) {
  for (const entry of payload.missingCoordinates) {
    console.warn(
      `[build-map-data] missing coordinate for ${entry.placeLabel} (${entry.evidenceTier})`
    );
  }
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, `${JSON.stringify(payload, null, 2)}\n`);

console.log(
  `Wrote ${payload.lineCount} family lines and ${payload.sightingCount} sightings to ${path.relative(repoRoot, outputPath)}` +
    (payload.missingCoordinateCount
      ? ` (${payload.missingCoordinateCount} missing coordinates)`
      : "")
);
