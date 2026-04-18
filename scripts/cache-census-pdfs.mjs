import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, "..");
const outputDir = path.join(baseDir, "public", "census");

const rawPayload = JSON.parse(
  fs.readFileSync(path.join(baseDir, "quish-census.json"), "utf8")
);

function formAEntries(records) {
  const entries = new Map();

  for (const record of records) {
    const formA = (record.images || []).find((image) => image.form === "Form A");
    if (!formA) continue;
    entries.set(formA.id, `https://www.census.nationalarchives.ie/reels/${formA.id}/`);
  }

  return [...entries.entries()].map(([id, url]) => ({ id, url }));
}

function downloadWithCurl(url, destination) {
  const result = spawnSync(
    "curl",
    [
      "-fL",
      "--retry",
      "3",
      "--retry-all-errors",
      "--retry-delay",
      "1",
      "--connect-timeout",
      "10",
      "--max-time",
      "45",
      "-o",
      destination,
      url,
    ],
    {
      encoding: "utf8",
    }
  );

  if (result.status !== 0) {
    throw new Error(result.stderr.trim() || `curl exited with status ${result.status}`);
  }
}

fs.mkdirSync(outputDir, { recursive: true });

const entries = formAEntries(rawPayload.results);
let downloaded = 0;
let reused = 0;

for (const entry of entries) {
  const destination = path.join(outputDir, `${entry.id}.pdf`);
  if (fs.existsSync(destination)) {
    reused += 1;
    continue;
  }

  downloadWithCurl(entry.url, destination);
  downloaded += 1;
  console.log(`Cached ${entry.id}.pdf`);
}

console.log(
  `Census PDF cache ready: ${entries.length} total, ${downloaded} downloaded, ${reused} reused.`
);
