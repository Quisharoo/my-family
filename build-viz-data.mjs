import fs from "fs";
import path from "path";

const baseDir = "/Users/colm/code/my-family";

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

const households = householdsPayload.households.map((household, index) => ({
  id: `h${index + 1}`,
  ...household,
}));

const rawById = new Map(rawPayload.results.map((record) => [record.id, record]));

function recordPageUrl(id) {
  return `https://nationalarchives.ie/collections/search-the-census/census-record/#id=${id}`;
}

function formAPdfUrl(record) {
  const formA = (record.images || []).find((image) => image.form === "Form A");
  return formA ? `https://api-census.nationalarchives.ie${formA.url}` : null;
}

function samePlace(household, place, year, houseNumber, imageGroup) {
  const [county, ded, townland] = place.split(" | ");
  return (
    household.census_year === year &&
    household.county === county &&
    household.ded === ded &&
    household.townland === townland &&
    String(household.house_number) === String(houseNumber) &&
    String(household.image_group) === String(imageGroup)
  );
}

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

  edges.push({
    id: `e${edges.length + 1}`,
    from: fromHousehold.id,
    to: toHousehold.id,
    place: continuity.place,
    overlap: continuity.overlap,
    plausible_age_progressions: continuity.plausible_age_progressions,
    score: continuity.score,
  });
}

const adjacency = new Map();
for (const household of households) {
  adjacency.set(household.id, new Set());
}
for (const edge of edges) {
  adjacency.get(edge.from).add(edge.to);
  adjacency.get(edge.to).add(edge.from);
}

const householdById = new Map(households.map((household) => [household.id, household]));
const edgeIdsByHousehold = new Map(
  households.map((household) => [household.id, []])
);

for (const edge of edges) {
  edgeIdsByHousehold.get(edge.from).push(edge.id);
  edgeIdsByHousehold.get(edge.to).push(edge.id);
}

const visited = new Set();
const clusters = [];

function placeLabel(household) {
  return `${household.townland}, ${household.ded}, ${household.county}`;
}

function memberNames(household) {
  return household.members.map((member) => member.firstname);
}

function scoreBreakdown(edge, fromHousehold, toHousehold) {
  const sharedNamePoints = edge.overlap.length * 2;
  const ageProgressionPoints = edge.plausible_age_progressions.length;
  const hasHead = (household) =>
    household.members.some((member) =>
      String(member.relation || "").toLowerCase().includes("head")
    );
  const headBonus =
    hasHead(fromHousehold) && hasHead(toHousehold) ? 1 : 0;

  return {
    sharedNamePoints,
    ageProgressionPoints,
    headBonus,
  };
}

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
        a.census_year - b.census_year ||
        a.county.localeCompare(b.county) ||
        a.townland.localeCompare(b.townland) ||
        String(a.house_number).localeCompare(String(b.house_number))
      );
    });

  const componentEdges = [...componentEdgeIds]
    .map((edgeId) => edges.find((edge) => edge.id === edgeId))
    .filter(Boolean)
    .map((edge) => {
      const fromHousehold = componentHouseholds.find(
        (household) => household.id === edge.from
      );
      const toHousehold = componentHouseholds.find(
        (household) => household.id === edge.to
      );
      return {
        ...edge,
        score_breakdown: scoreBreakdown(edge, fromHousehold, toHousehold),
      };
    })
    .sort((a, b) => b.score - a.score);

  const strongestEdge = componentEdges[0] || null;
  const counties = [...new Set(componentHouseholds.map((item) => item.county))];
  const isConnectedCluster = componentEdges.length > 0;

  const title = strongestEdge
    ? strongestEdge.place
    : placeLabel(componentHouseholds[0]);

  const summary = strongestEdge
    ? `Shared names: ${strongestEdge.overlap.join(", ")}`
    : `Standalone household in ${componentHouseholds[0].county}`;

  const years = [...new Set(componentHouseholds.map((item) => item.census_year))];
  const householdCount = componentHouseholds.length;
  const memberCount = componentHouseholds.reduce(
    (total, item) => total + item.members.length,
    0
  );

  clusters.push({
    id: `c${clusters.length + 1}`,
    type: isConnectedCluster ? "connected" : "single",
    title,
    summary,
    counties,
    years,
    householdCount,
    memberCount,
    score: componentEdges.reduce((total, edge) => total + edge.score, 0),
    households: componentHouseholds.map((item) => ({
      ...item,
      label: placeLabel(item),
      names: memberNames(item),
      members: item.members.map((member) => {
        const rawRecord = rawById.get(member.id) || {};
        return {
          ...member,
          record_url: recordPageUrl(member.id),
          form_a_pdf_url: formAPdfUrl(rawRecord),
        };
      }),
    })),
    edges: componentEdges,
  });
}

clusters.sort((a, b) => {
  return (
    (b.type === "connected") - (a.type === "connected") ||
    b.score - a.score ||
    a.title.localeCompare(b.title)
  );
});

const variants = variantPayload.results.reduce((groups, record) => {
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
      key,
      census_year: record.census_year,
      county: record.county,
      ded: record.ded,
      townland: record.townland,
      house_number: record.house_number,
      surname: record.surname,
      members: [],
    };
  }

  groups[key].members.push({
    firstname: record.firstname,
    age: record.age,
    sex: record.sex,
    relation: record.relation_to_head_updated || record.relation_to_head || null,
    birthplace: record.birthplace || null,
    occupation: record.occupation_updated || record.occupation || null,
  });

  return groups;
}, {});

const counties = [...new Set(households.map((household) => household.county))].sort();

const payload = {
  meta: {
    exactRecordCount: householdsPayload.record_count,
    householdCount: householdsPayload.household_count,
    clusterCount: clusters.filter((cluster) => cluster.type === "connected").length,
    standaloneCount: clusters.filter((cluster) => cluster.type === "single").length,
    counties,
    scoreFormula:
      "Score = 2 points per shared first name + 1 point per plausible 10-year age progression + 1 point if both households list a head",
  },
  clusters,
  variants: Object.values(variants).sort((a, b) => {
    return (
      a.census_year - b.census_year ||
      a.county.localeCompare(b.county) ||
      a.townland.localeCompare(b.townland)
    );
  }),
};

const output = `window.QUISH_VIZ_DATA = ${JSON.stringify(payload, null, 2)};\n`;
fs.writeFileSync(path.join(baseDir, "viz-data.js"), output);

console.log(`Wrote viz-data.js with ${clusters.length} clusters.`);
