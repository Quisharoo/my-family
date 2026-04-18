import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

import {
  assembleFamilyLines,
  assemblePersonThreads,
  buildCanonicalPersonObservations,
  buildHouseholdLinks,
  buildNarrativeClaims,
  buildPersonLinks,
  buildResearchSummary,
  buildTakeaways,
  buildStory,
  createCensusEditions,
  groupHouseholdObservations,
  summarizePlaces,
} from "./lib/quish-story-substrate.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, "..");
const dataDir = path.join(baseDir, "data");
const rawDir = path.join(dataDir, "raw");
const normalizedDir = path.join(dataDir, "normalized");
const analysisDir = path.join(dataDir, "analysis");
const storyDir = path.join(dataDir, "story");

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, "utf8"));
}

function writeJson(filePath, value) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
}

function csvValue(value) {
  if (value == null) return "";
  const text = Array.isArray(value) ? value.join("|") : String(value);
  if (/[",\n]/.test(text)) {
    return `"${text.replaceAll('"', '""')}"`;
  }
  return text;
}

function writeCsv(filePath, rows) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
  if (!rows.length) {
    fs.writeFileSync(filePath, "");
    return;
  }
  const headers = [...new Set(rows.flatMap((row) => Object.keys(row)))];
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvValue(row[header])).join(",")),
  ];
  fs.writeFileSync(filePath, `${lines.join("\n")}\n`);
}

function sourceRecordUrl(observation) {
  if (observation.censusYear === 1926) {
    return `https://nationalarchives.ie/kiosk-1926-census/census-record/#a_id=${observation.sourceRef.sourceId}`;
  }
  return `https://nationalarchives.ie/collections/search-the-census/census-record/#id=${observation.sourceRef.sourceId}`;
}

function sourceImageUrl(observation) {
  if (observation.censusYear === 1926) {
    return observation.raw.aform_name
      ? `https://c26-api.nationalarchives.ie/api/census/image_c26/${observation.raw.aform_name}`
      : null;
  }
  const formA = (observation.raw.images || []).find((image) => image.form === "Form A");
  return formA ? `https://www.census.nationalarchives.ie/reels/${formA.id}/` : null;
}

function flattenObservations(observations) {
  return observations.map((observation) => ({
    observation_id: observation.id,
    source_dataset: observation.sourceDataset,
    census_year: observation.censusYear,
    regime: observation.censusEdition?.regime || null,
    county: observation.county,
    ded: observation.ded,
    townland: observation.townland,
    house_number: observation.houseNumber,
    image_group: observation.imageGroup,
    surname: observation.surname,
    first_name: observation.firstName,
    normalized_name: observation.normalizedName,
    relation: observation.relation,
    age: observation.age,
    sex: observation.sex,
    birthplace: observation.birthplace,
    source_record_url: sourceRecordUrl(observation),
    source_image_url: sourceImageUrl(observation),
  }));
}

function flattenHouseholds(households) {
  return households.map((household) => ({
    household_id: household.id,
    census_year: household.censusYear,
    regime: household.censusEdition?.regime || null,
    county: household.county,
    ded: household.ded,
    townland: household.townland,
    house_number: household.houseNumber,
    image_group: household.imageGroup,
    member_count: household.members.length,
    member_ids: household.members.map((member) => member.id),
    member_names: household.members.map((member) => member.firstName),
  }));
}

function flattenPersonThreads(personThreads) {
  return personThreads.map((thread) => ({
    person_thread_id: thread.id,
    normalized_name: thread.normalizedName,
    census_years: thread.censusYears,
    observation_ids: thread.observationIds,
    reaches_1926: thread.milestones?.firstFreeStateCensus || false,
  }));
}

function flattenFamilyLines(familyLines) {
  return familyLines.map((line) => ({
    family_line_id: line.id,
    census_years: line.censusYears,
    household_ids: line.householdIds,
    reaches_1926: line.milestones?.firstFreeStateCensus || false,
    household_count: line.householdIds.length,
  }));
}

function buildManifest() {
  return {
    generatedAt: new Date().toISOString(),
    outputs: [
      {
        path: "data/normalized/quish-observations.json",
        purpose: "Canonical per-person observations across all censuses",
      },
      {
        path: "data/analysis/quish-observations.csv",
        purpose: "Flat analyst table of person observations with source links",
      },
      {
        path: "data/analysis/quish-households.csv",
        purpose: "Flat analyst table of households grouped from observations",
      },
      {
        path: "data/analysis/quish-person-links.csv",
        purpose: "Adjacent-decade candidate person continuities",
      },
      {
        path: "data/analysis/quish-household-links.csv",
        purpose: "Household continuity candidates derived from person links",
      },
      {
        path: "data/analysis/quish-family-lines.csv",
        purpose: "Flat family-line table for multi-decade lineage analysis",
      },
      {
        path: "data/analysis/quish-place-summary.csv",
        purpose: "Place concentration summary for trend analysis",
      },
      {
        path: "data/analysis/quish-research-summary.json",
        purpose: "High-level computed trends for analysts and genealogists",
      },
      {
        path: "data/analysis/quish-research-brief.md",
        purpose: "Human-readable synthesis of the computed trends and key connections",
      },
      {
        path: "data/analysis/quish-takeaways.md",
        purpose: "Researcher-facing statement of what is established, what is suggestive, and what still needs outside confirmation",
      },
    ],
  };
}

function buildResearchBrief(summary) {
  const topPlaces = summary.topPlaces
    .slice(0, 5)
    .map((place) => `- ${place.place}: ${place.memberCount} observed household members`)
    .join("\n");

  return `# Quish Research Brief

## Why this exists
These exports are designed for genealogical and analytical work that goes beyond reading one census record at a time. They surface cross-decade links, household continuity, place concentration, and which lines clearly reach the first census of the Irish Free State in 1926.

## Headline trends
- Observations by year: ${Object.entries(summary.observationsByYear)
    .map(([year, count]) => `${year}=${count}`)
    .join(", ")}
- Households by year: ${Object.entries(summary.householdsByYear)
    .map(([year, count]) => `${year}=${count}`)
    .join(", ")}
- Family lines reaching 1926: ${summary.familyLinesReaching1926}
- Person threads reaching 1926: ${summary.personThreadsReaching1926}

## Strongest place concentrations
${topPlaces}

## Intended analyst workflow
- Start with \`quish-observations.csv\` to inspect the full canonical record set.
- Use \`quish-person-links.csv\` and \`quish-household-links.csv\` to evaluate computed continuity.
- Use \`quish-family-lines.csv\` to trace multi-decade lineage candidates.
- Use \`quish-research-summary.json\` and \`quish-place-summary.csv\` for trend analysis and place concentration.
`;
}

function sourceEntries(payload, sourceDataset, censusYear, idField = "id") {
  return (payload.results || []).map((rawRecord) => ({
    sourceDataset,
    censusYear,
    sourceId: String(rawRecord[idField]),
    raw: rawRecord,
  }));
}

function sortFamilyLines(familyLines, households) {
  const householdById = new Map(households.map((household) => [household.id, household]));
  return familyLines.slice().sort((a, b) => {
    const a1926 = a.milestones.firstFreeStateCensus ? 1 : 0;
    const b1926 = b.milestones.firstFreeStateCensus ? 1 : 0;
    if (a1926 !== b1926) return b1926 - a1926;
    if (a.censusYears.length !== b.censusYears.length) {
      return b.censusYears.length - a.censusYears.length;
    }
    const aMembers = a.householdIds.reduce(
      (sum, id) => sum + (householdById.get(id)?.members.length || 0),
      0
    );
    const bMembers = b.householdIds.reduce(
      (sum, id) => sum + (householdById.get(id)?.members.length || 0),
      0
    );
    return bMembers - aMembers;
  });
}

function ensureCurationScaffold() {
  const curationPath = path.join(storyDir, "quish-curation.json");
  if (fs.existsSync(curationPath)) return;
  writeJson(curationPath, {
    notes: [],
    overrides: [],
  });
}

function householdPlaceLabel(household) {
  return [household?.county, household?.ded, household?.townland]
    .filter(Boolean)
    .join(" | ");
}

function householdPrimaryLabel(household) {
  const head = household?.members.find((member) =>
    String(member.relation || "").toLowerCase().includes("head")
  );
  if (head?.firstName) return `${head.firstName} Quish line`;
  return `${householdPlaceLabel(household)} line`;
}

function buildTakeawaysMarkdown(takeaways) {
  const established = takeaways.established.map((item) => `- ${item.statement}`).join("\n");
  const openQuestions = takeaways.openQuestions
    .map((item) => `- ${item.statement}`)
    .join("\n");

  return `# Quish Takeaways

## What is established from the current census analysis
${established}

## What remains open or needs outside confirmation
${openQuestions}

## Why this matters for the later family tree
These takeaways separate what the census evidence justifies now from what still needs outside genealogical confirmation before it should appear in a larger family tree.
`;
}

const editions = createCensusEditions();
const quish = readJson(path.join(baseDir, "quish-census.json"));
const quishe = readJson(path.join(baseDir, "quishe-census.json"));
const raw1926Path = path.join(rawDir, "1926-quish.json");

if (!fs.existsSync(raw1926Path)) {
  throw new Error(
    "Missing data/raw/1926-quish.json. Fetch the live 1926 Quish raw data before building."
  );
}

const quish1926 = readJson(raw1926Path);

const quish1901 = {
  meta: { source: "quish-census.json", censusYear: 1901 },
  results: quish.results.filter((record) => record.census_year === 1901),
};
const quish1911 = {
  meta: { source: "quish-census.json", censusYear: 1911 },
  results: quish.results.filter((record) => record.census_year === 1911),
};
const quishe1911 = {
  meta: { source: "quishe-census.json", censusYear: 1911, variant: true },
  results: quishe.results.filter((record) => record.census_year === 1911),
};

writeJson(path.join(rawDir, "1901-quish.json"), quish1901);
writeJson(path.join(rawDir, "1911-quish.json"), quish1911);
writeJson(path.join(rawDir, "1911-quishe.json"), quishe1911);

const rawEntries = [
  ...sourceEntries(quish1901, "1901-quish", 1901),
  ...sourceEntries(quish1911, "1911-quish", 1911),
  ...sourceEntries(quish1926, "1926-quish", 1926, "a_id"),
];

const observations = buildCanonicalPersonObservations(rawEntries, editions);
const households = groupHouseholdObservations(observations);
const householdById = new Map(households.map((household) => [household.id, household]));
const personLinks = buildPersonLinks(observations);
const personThreads = assemblePersonThreads(observations, personLinks);
const householdLinks = buildHouseholdLinks(households, personLinks);
const familyLines = sortFamilyLines(assembleFamilyLines(households), households).map((line) => {
  const firstHousehold = householdById.get(line.householdIds[0]);
  return {
    ...line,
    label: householdPrimaryLabel(firstHousehold),
    placeLabel: householdPlaceLabel(firstHousehold),
  };
});
const appendixHouseholds = households.filter(
  (household) =>
    familyLines.some(
      (familyLine) =>
        familyLine.householdIds.includes(household.id) && familyLine.censusYears.length === 1
    )
);
const placeSummary = summarizePlaces(households);
const claims = buildNarrativeClaims(familyLines, editions, placeSummary);
const researchSummary = buildResearchSummary({
  observations,
  households,
  familyLines,
  personThreads,
  placeSummary,
});
const takeaways = buildTakeaways({
  researchSummary,
  familyLines,
});
const story = buildStory({
  claims,
  familyLines,
  editions,
  households,
  appendixHouseholds,
});

writeJson(path.join(normalizedDir, "quish-observations.json"), {
  editions: [...editions.values()],
  count: observations.length,
  observations,
});
writeJson(path.join(analysisDir, "quish-households.json"), {
  count: households.length,
  households,
});
writeJson(path.join(analysisDir, "quish-links.json"), {
  personLinkCount: personLinks.length,
  householdLinkCount: householdLinks.length,
  personLinks,
  householdLinks,
});
writeJson(path.join(analysisDir, "quish-person-threads.json"), {
  count: personThreads.length,
  personThreads,
});
writeJson(path.join(analysisDir, "quish-family-lines.json"), {
  count: familyLines.length,
  familyLines,
  placeSummary,
});
writeCsv(path.join(analysisDir, "quish-observations.csv"), flattenObservations(observations));
writeCsv(path.join(analysisDir, "quish-households.csv"), flattenHouseholds(households));
writeCsv(path.join(analysisDir, "quish-person-links.csv"), personLinks);
writeCsv(path.join(analysisDir, "quish-household-links.csv"), householdLinks);
writeCsv(path.join(analysisDir, "quish-person-threads.csv"), flattenPersonThreads(personThreads));
writeCsv(path.join(analysisDir, "quish-family-lines.csv"), flattenFamilyLines(familyLines));
writeCsv(path.join(analysisDir, "quish-place-summary.csv"), placeSummary);
writeJson(path.join(analysisDir, "quish-research-summary.json"), researchSummary);
fs.writeFileSync(
  path.join(analysisDir, "quish-research-brief.md"),
  `${buildResearchBrief(researchSummary)}\n`
);
writeJson(path.join(analysisDir, "quish-takeaways.json"), takeaways);
fs.writeFileSync(
  path.join(analysisDir, "quish-takeaways.md"),
  `${buildTakeawaysMarkdown(takeaways)}\n`
);
writeJson(path.join(analysisDir, "manifest.json"), buildManifest());
writeJson(path.join(storyDir, "quish-claims.json"), {
  count: claims.length,
  claims,
});
writeJson(path.join(storyDir, "quish-story.json"), story);
ensureCurationScaffold();

console.log(
  `Wrote story substrate: ${observations.length} observations, ${households.length} households, ${familyLines.length} family lines.`
);
