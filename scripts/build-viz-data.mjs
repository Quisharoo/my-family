import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const baseDir = path.resolve(__dirname, "..");

const householdsPayload = JSON.parse(
  fs.readFileSync(path.join(baseDir, "quish-households.json"), "utf8")
);
const rawPayload = JSON.parse(
  fs.readFileSync(path.join(baseDir, "quish-census.json"), "utf8")
);
const continuitiesPayload = JSON.parse(
  fs.readFileSync(path.join(baseDir, "quish-continuities.json"), "utf8")
);
const variantPayload = JSON.parse(
  fs.readFileSync(path.join(baseDir, "quishe-census.json"), "utf8")
);

function slugify(...parts) {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .replace(/-{2,}/g, "-");
}

function titleCase(text) {
  return String(text || "")
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function recordPageUrl(id) {
  return `https://nationalarchives.ie/collections/search-the-census/census-record/#id=${id}`;
}

function formAPdfUrl(record) {
  const formA = (record.images || []).find((image) => image.form === "Form A");
  return formA ? `https://api-census.nationalarchives.ie${formA.url}` : null;
}

function relationText(member) {
  return String(member.relation || "").toLowerCase();
}

function classifyMember(member) {
  const relation = relationText(member);

  if (
    relation.includes("head") ||
    relation.includes("wife") ||
    relation.includes("husband")
  ) {
    return "headAndSpouse";
  }

  if (
    relation.includes("son") ||
    relation.includes("daughter") ||
    relation.includes("grand") ||
    relation.includes("step")
  ) {
    return "children";
  }

  if (
    relation.includes("brother") ||
    relation.includes("sister") ||
    relation.includes("aunt") ||
    relation.includes("uncle") ||
    relation.includes("niece") ||
    relation.includes("nephew") ||
    relation.includes("cousin") ||
    relation.includes("relative") ||
    relation.includes("father") ||
    relation.includes("mother")
  ) {
    return "otherRelatives";
  }

  return "nonFamily";
}

function groupMembers(members) {
  const grouped = {
    headAndSpouse: [],
    children: [],
    otherRelatives: [],
    nonFamily: [],
  };

  for (const member of members) {
    grouped[classifyMember(member)].push(member);
  }

  return grouped;
}

function headMember(household) {
  return (
    household.members.find((member) =>
      relationText(member).includes("head")
    ) || household.members[0]
  );
}

function spouseMember(household) {
  return household.members.find((member) => {
    const relation = relationText(member);
    return relation.includes("wife") || relation.includes("husband");
  });
}

function familyLabelFromHousehold(household) {
  const head = headMember(household);
  const spouse = spouseMember(household);

  if (head && spouse) {
    return `${titleCase(head.firstname)} + ${titleCase(spouse.firstname)} Quish family`;
  }

  if (head?.firstname) {
    return `${titleCase(head.firstname)} Quish household`;
  }

  return "Quish household";
}

function householdPlaceLabel(household) {
  return `${household.townland}, ${household.ded}, ${household.county}`;
}

function continuityPlaceLabel(place) {
  return String(place || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean)
    .join(", ");
}

function confidenceMeta(score, type) {
  if (type === "single") {
    return {
      label: "Standalone household",
      tone: "single",
    };
  }

  if (score >= 14) {
    return {
      label: "Strong continuity",
      tone: "strong",
    };
  }

  if (score >= 10) {
    return {
      label: "Likely same household",
      tone: "likely",
    };
  }

  return {
    label: "Possible continuity",
    tone: "possible",
  };
}

function scoreBreakdown(edge, fromHousehold, toHousehold) {
  const sharedNamePoints = edge.overlap.length * 2;
  const ageProgressionPoints = edge.plausibleAgeProgressions.length;
  const hasHead = (household) =>
    household.members.some((member) =>
      relationText(member).includes("head")
    );
  const headBonus =
    hasHead(fromHousehold) && hasHead(toHousehold) ? 1 : 0;

  return {
    sharedNamePoints,
    ageProgressionPoints,
    headBonus,
  };
}

function makeHouseholdId(household) {
  return slugify(
    household.census_year,
    household.county,
    household.ded,
    household.townland,
    household.house_number,
    household.image_group
  );
}

function samePlace(household, place, year, houseNumber, imageGroup) {
  const [county, ded, townland] = place.split(" | ");
  return (
    household.censusYear === year &&
    household.county === county &&
    household.ded === ded &&
    household.townland === townland &&
    String(household.houseNumber) === String(houseNumber) &&
    String(household.imageGroup) === String(imageGroup)
  );
}

const rawById = new Map(rawPayload.results.map((record) => [record.id, record]));

const households = householdsPayload.households.map((household) => {
  const id = makeHouseholdId(household);
  const members = household.members.map((member) => {
    const rawRecord = rawById.get(member.id) || {};
    return {
      id: member.id,
      firstname: titleCase(member.firstname),
      age: member.age,
      sex: member.sex,
      relation: member.relation || null,
      occupation: member.occupation || null,
      birthplace: member.birthplace || null,
      note: member.note || null,
      recordUrl: recordPageUrl(member.id),
      formAPdfUrl: formAPdfUrl(rawRecord),
    };
  });

  const groupedMembers = groupMembers(members);

  return {
    id,
    key: household.key,
    censusYear: household.census_year,
    county: household.county,
    ded: household.ded,
    townland: household.townland,
    houseNumber: String(household.house_number),
    imageGroup: String(household.image_group),
    placeLabel: householdPlaceLabel(household),
    familyLabel: familyLabelFromHousehold({ ...household, members }),
    members,
    groupedMembers,
    memberNames: members.map((member) => member.firstname),
  };
});

function findHousehold(side, place) {
  return households.find((household) =>
    samePlace(household, place, side.year, side.house_number, side.image_group)
  );
}

const edges = [];

for (const continuity of continuitiesPayload.continuities) {
  const fromHousehold = findHousehold(continuity.from, continuity.place);
  const toHousehold = findHousehold(continuity.to, continuity.place);

  if (!fromHousehold || !toHousehold) {
    continue;
  }

  const confidence = confidenceMeta(continuity.score, "connected");

  edges.push({
    id: slugify(
      fromHousehold.id,
      toHousehold.id,
      continuity.score
    ),
    fromHouseholdId: fromHousehold.id,
    toHouseholdId: toHousehold.id,
    yearPair: [fromHousehold.censusYear, toHousehold.censusYear],
    placeLabel: continuityPlaceLabel(continuity.place),
    overlap: continuity.overlap.map(titleCase),
    plausibleAgeProgressions: continuity.plausible_age_progressions.map(
      (progression) => ({
        name: titleCase(progression.name),
        from: progression.from,
        to: progression.to,
        delta: progression.delta,
      })
    ),
    score: continuity.score,
    confidenceLabel: confidence.label,
    confidenceTone: confidence.tone,
  });
}

const adjacency = new Map(households.map((household) => [household.id, new Set()]));
const edgeIdsByHousehold = new Map(households.map((household) => [household.id, []]));
const householdById = new Map(households.map((household) => [household.id, household]));

for (const edge of edges) {
  adjacency.get(edge.fromHouseholdId).add(edge.toHouseholdId);
  adjacency.get(edge.toHouseholdId).add(edge.fromHouseholdId);
  edgeIdsByHousehold.get(edge.fromHouseholdId).push(edge.id);
  edgeIdsByHousehold.get(edge.toHouseholdId).push(edge.id);
}

const edgeById = new Map(edges.map((edge) => [edge.id, edge]));
const visited = new Set();
const clusters = [];
const usedSlugs = new Set();

for (const household of households) {
  if (visited.has(household.id)) {
    continue;
  }

  const queue = [household.id];
  const componentHouseholdIds = [];
  const componentEdgeIds = new Set();

  while (queue.length > 0) {
    const currentId = queue.shift();
    if (visited.has(currentId)) {
      continue;
    }

    visited.add(currentId);
    componentHouseholdIds.push(currentId);

    for (const edgeId of edgeIdsByHousehold.get(currentId)) {
      componentEdgeIds.add(edgeId);
    }

    for (const neighborId of adjacency.get(currentId)) {
      if (!visited.has(neighborId)) {
        queue.push(neighborId);
      }
    }
  }

  const componentHouseholds = componentHouseholdIds
    .map((id) => householdById.get(id))
    .sort((a, b) => {
      return (
        a.censusYear - b.censusYear ||
        a.county.localeCompare(b.county) ||
        a.townland.localeCompare(b.townland) ||
        a.houseNumber.localeCompare(b.houseNumber)
      );
    });

  const componentEdges = [...componentEdgeIds]
    .map((edgeId) => edgeById.get(edgeId))
    .filter(Boolean)
    .map((edge) => {
      const fromHousehold = householdById.get(edge.fromHouseholdId);
      const toHousehold = householdById.get(edge.toHouseholdId);
      return {
        ...edge,
        scoreBreakdown: scoreBreakdown(edge, fromHousehold, toHousehold),
      };
    })
    .sort((a, b) => b.score - a.score);

  const type = componentEdges.length ? "connected" : "single";
  const strongestEdge = componentEdges[0] || null;
  const representative = componentHouseholds[0];
  const familyLabel = familyLabelFromHousehold(representative);
  const placeLabel = strongestEdge?.placeLabel || representative.placeLabel;
  const confidence = confidenceMeta(strongestEdge?.score || 0, type);
  const counties = [...new Set(componentHouseholds.map((item) => item.county))];
  const years = [...new Set(componentHouseholds.map((item) => item.censusYear))].sort(
    (a, b) => a - b
  );
  const totalScore = componentEdges.reduce((total, edge) => total + edge.score, 0);
  const byYear = years.map((year) => ({
    year,
    households: componentHouseholds.filter((item) => item.censusYear === year),
  }));

  let slug = slugify(familyLabel, placeLabel, years.join("-"));
  let duplicateIndex = 2;
  while (usedSlugs.has(slug)) {
    slug = `${slugify(familyLabel, placeLabel, years.join("-"))}-${duplicateIndex}`;
    duplicateIndex += 1;
  }
  usedSlugs.add(slug);

  clusters.push({
    id: slug,
    slug,
    type,
    familyLabel,
    placeLabel,
    confidenceLabel: confidence.label,
    confidenceTone: confidence.tone,
    counties,
    years,
    householdCount: componentHouseholds.length,
    memberCount: componentHouseholds.reduce(
      (total, item) => total + item.members.length,
      0
    ),
    totalScore,
    description:
      type === "connected"
        ? `${confidence.label} in ${placeLabel}`
        : `Single census household in ${placeLabel}`,
    byYear,
    households: componentHouseholds,
    continuityEdges: componentEdges,
  });
}

clusters.sort((a, b) => {
  return (
    (b.type === "connected") - (a.type === "connected") ||
    b.totalScore - a.totalScore ||
    a.familyLabel.localeCompare(b.familyLabel)
  );
});

const variants = Object.values(
  variantPayload.results.reduce((groups, record) => {
    const key = [
      record.census_year,
      record.county,
      record.ded,
      record.townland,
      record.house_number,
      record.image_group,
    ].join(" | ");

    if (!groups[key]) {
      groups[key] = {
        id: slugify(key),
        key,
        censusYear: record.census_year,
        county: record.county,
        ded: record.ded,
        townland: record.townland,
        houseNumber: String(record.house_number),
        surname: record.surname,
        placeLabel: `${record.townland}, ${record.ded}, ${record.county}`,
        members: [],
      };
    }

    groups[key].members.push({
      firstname: titleCase(record.firstname),
      age: record.age,
      relation: record.relation_to_head_updated || record.relation_to_head || null,
      occupation: record.occupation_updated || record.occupation || null,
    });

    return groups;
  }, {})
).sort((a, b) => {
  return (
    a.censusYear - b.censusYear ||
    a.county.localeCompare(b.county) ||
    a.townland.localeCompare(b.townland)
  );
});

const payload = {
  meta: {
    surname: "Quish",
    exactRecordCount: householdsPayload.record_count,
    householdCount: householdsPayload.household_count,
    clusterCount: clusters.filter((cluster) => cluster.type === "connected").length,
    standaloneCount: clusters.filter((cluster) => cluster.type === "single").length,
    counties: [...new Set(households.map((household) => household.county))].sort(),
    years: [...new Set(households.map((household) => household.censusYear))].sort(
      (a, b) => a - b
    ),
    scoreFormula:
      "Score = 2 points per shared first name + 1 point per plausible 10-year age progression + 1 point if both households list a head",
    futureYearNote:
      "The app is structured for additional census years. When 1926 is public, it can be added as another snapshot year.",
  },
  clusters,
  variants,
};

fs.writeFileSync(
  path.join(baseDir, "src", "data", "quish-viz-data.json"),
  JSON.stringify(payload, null, 2) + "\n"
);

console.log(`Wrote src/data/quish-viz-data.json with ${clusters.length} clusters.`);
