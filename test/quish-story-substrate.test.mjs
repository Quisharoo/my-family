import test from "node:test";
import assert from "node:assert/strict";

import {
  assembleFamilyLines,
  buildStory,
  buildResearchSummary,
  buildTakeaways,
  buildPersonLinks,
  buildNarrativeClaims,
  createCensusEditions,
  groupHouseholdObservations,
  normalizeNameForMatch,
  scoreAgeProgression,
  buildCanonicalPersonObservations,
} from "../scripts/lib/quish-story-substrate.mjs";

test("normalizeNameForMatch collapses punctuation, brackets, and common abbreviations", () => {
  assert.equal(normalizeNameForMatch("Mary Anne"), "mary anne");
  assert.equal(normalizeNameForMatch("Mary A"), "mary anne");
  assert.equal(normalizeNameForMatch("[Fannie]"), "fannie");
  assert.equal(normalizeNameForMatch("Norah"), "nora");
});

test("scoreAgeProgression prefers plausible adjacent-decade age deltas", () => {
  assert.deepEqual(scoreAgeProgression(5, 15, 10), {
    ok: true,
    band: "preferred",
    delta: 10,
  });

  assert.deepEqual(scoreAgeProgression(20, 35, 15), {
    ok: true,
    band: "preferred",
    delta: 15,
  });

  assert.deepEqual(scoreAgeProgression(20, 50, 15), {
    ok: false,
    band: "out_of_range",
    delta: 30,
  });
});

test("three-census family lines generate a first Free State census milestone claim", () => {
  const editions = createCensusEditions();
  const rawRecords = [
    {
      sourceDataset: "1901-quish",
      censusYear: 1901,
      sourceId: "1901-1",
      raw: {
        county: "Limerick",
        ded: "Duntryleague",
        townland: "Duntryleague",
        house_number: "15",
        image_group: "1506166",
        firstname: "Martin",
        surname: "Quish",
        relation_to_head: "Head of Family",
        age: 38,
        sex: "M",
        birthplace: "Co Limerick",
      },
    },
    {
      sourceDataset: "1911-quish",
      censusYear: 1911,
      sourceId: "1911-1",
      raw: {
        county: "Limerick",
        ded: "Duntryleague",
        townland: "Duntryleague",
        house_number: "4",
        image_group: "634851",
        firstname: "Martin",
        surname: "Quish",
        relation_to_head: "Head of Family",
        age: 48,
        sex: "M",
        birthplace: "Co Limerick",
      },
    },
    {
      sourceDataset: "1926-quish",
      censusYear: 1926,
      sourceId: "1926-1",
      raw: {
        county: "Limerick",
        ded: "Duntryleague",
        townland: "Duntryleague",
        image_group: 272767,
        a_id: 1504942,
        first_name: "Martin",
        surname: "Quish",
        updated_relationship_to_head: "Head",
        updated_age: 64,
        updated_sex: "M",
        birthplace_county: "Limerick",
      },
    },
  ];

  const observations = buildCanonicalPersonObservations(rawRecords, editions);
  const households = groupHouseholdObservations(observations);
  const familyLines = assembleFamilyLines(households, observations);
  const claims = buildNarrativeClaims(familyLines, editions);

  assert.equal(familyLines.length, 1);
  assert.equal(familyLines[0].milestones.firstFreeStateCensus, true);
  assert.equal(
    claims.some((claim) => claim.claimType === "first-free-state-census-milestone"),
    true
  );
});

test("buildStory creates historical and main narrative sections from computed claims", () => {
  const editions = createCensusEditions();
  const claims = [
    {
      id: "claim-1",
      claimType: "first-free-state-census-milestone",
      subjectIds: ["family-line-1"],
      evidenceRefs: ["house-1", "house-2", "house-3"],
      confidence: "strong",
      eraContext: editions.get(1926),
      eligibleForPrimaryStory: true,
    },
  ];
  const familyLines = [
    {
      id: "family-line-1",
      householdIds: ["house-1", "house-2", "house-3"],
      censusYears: [1901, 1911, 1926],
      milestones: {
        firstFreeStateCensus: true,
      },
    },
  ];

  const story = buildStory({
    claims,
    familyLines,
    editions,
    households: [],
    appendixHouseholds: [],
  });

  assert.deepEqual(
    story.sections.map((section) => section.id),
    [
      "historical-context",
      "main-family-lines",
      "free-state-transition",
      "place-patterns",
      "appendix",
    ]
  );
  assert.equal(story.sections[1].claimIds.includes("claim-1"), true);
});

test("buildPersonLinks only creates adjacent-decade continuity candidates", () => {
  const editions = createCensusEditions();
  const observations = buildCanonicalPersonObservations(
    [
      {
        sourceDataset: "1901-quish",
        censusYear: 1901,
        sourceId: "1901-1",
        raw: {
          county: "Limerick",
          ded: "Duntryleague",
          townland: "Duntryleague",
          house_number: "15",
          image_group: "1506166",
          firstname: "Martin",
          surname: "Quish",
          relation_to_head: "Head of Family",
          age: 38,
          sex: "M",
        },
      },
      {
        sourceDataset: "1911-quish",
        censusYear: 1911,
        sourceId: "1911-1",
        raw: {
          county: "Limerick",
          ded: "Duntryleague",
          townland: "Duntryleague",
          house_number: "4",
          image_group: "634851",
          firstname: "Martin",
          surname: "Quish",
          relation_to_head: "Head of Family",
          age: 48,
          sex: "M",
        },
      },
      {
        sourceDataset: "1926-quish",
        censusYear: 1926,
        sourceId: "1926-1",
        raw: {
          county: "Limerick",
          ded: "Duntryleague",
          townland: "Duntryleague",
          image_group: 272767,
          a_id: 1504942,
          first_name: "Martin",
          surname: "Quish",
          updated_relationship_to_head: "Head",
          updated_age: 64,
          updated_sex: "M",
        },
      },
    ],
    editions
  );

  const links = buildPersonLinks(observations);

  assert.equal(
    links.some((link) => link.fromObservationId === "1901-1" && link.toObservationId === "1911-1"),
    true
  );
  assert.equal(
    links.some((link) => link.fromObservationId === "1911-1" && link.toObservationId === "1926-1"),
    true
  );
  assert.equal(
    links.some((link) => link.fromObservationId === "1901-1" && link.toObservationId === "1926-1"),
    false
  );
});

test("buildResearchSummary exposes decade trends and Free State reach in analyst-friendly form", () => {
  const summary = buildResearchSummary({
    observations: [
      { censusYear: 1901, county: "Limerick" },
      { censusYear: 1911, county: "Limerick" },
      { censusYear: 1926, county: "Limerick" },
      { censusYear: 1926, county: "Tipperary" },
    ],
    households: [
      { censusYear: 1901 },
      { censusYear: 1911 },
      { censusYear: 1926 },
    ],
    familyLines: [
      { censusYears: [1901, 1911, 1926], milestones: { firstFreeStateCensus: true } },
      { censusYears: [1901], milestones: { firstFreeStateCensus: false } },
    ],
    personThreads: [
      { censusYears: [1901, 1911, 1926], milestones: { firstFreeStateCensus: true } },
      { censusYears: [1911], milestones: { firstFreeStateCensus: false } },
    ],
    placeSummary: [
      { place: "Limerick | Duntryleague | Duntryleague", memberCount: 9 },
    ],
  });

  assert.equal(summary.observationsByYear["1926"], 2);
  assert.equal(summary.familyLinesReaching1926, 1);
  assert.equal(summary.personThreadsReaching1926, 1);
  assert.equal(summary.topPlaces[0].place, "Limerick | Duntryleague | Duntryleague");
});

test("buildTakeaways separates established findings from open questions", () => {
  const takeaways = buildTakeaways({
    researchSummary: {
      observationsByYear: { 1901: 80, 1911: 83, 1926: 69 },
      householdsByYear: { 1901: 20, 1911: 21, 1926: 21 },
      familyLinesReaching1926: 21,
      topPlaces: [{ place: "Limerick | Duntryleague | Duntryleague", memberCount: 27 }],
    },
    familyLines: [
      {
        id: "line-1",
        censusYears: [1901, 1911, 1926],
        milestones: { firstFreeStateCensus: true },
        householdIds: ["h1", "h2", "h3"],
        label: "Martin Quish line",
        placeLabel: "Limerick | Duntryleague | Duntryleague",
      },
    ],
  });

  assert.equal(takeaways.established.length > 0, true);
  assert.equal(takeaways.openQuestions.length > 0, true);
  assert.equal(
    takeaways.established.some((item) => item.evidenceRefs.includes("h1")),
    true
  );
});
