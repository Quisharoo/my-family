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

const headRoleMatcher = /head/i;

function orderMembers(members) {
  return [...members].sort((a, b) => {
    const aHead = headRoleMatcher.test(a.relation || "") ? 0 : 1;
    const bHead = headRoleMatcher.test(b.relation || "") ? 0 : 1;
    if (aHead !== bHead) return aHead - bHead;
    return (b.age ?? 0) - (a.age ?? 0);
  });
}

function compareEntries(a, b) {
  return (
    a.county.localeCompare(b.county) ||
    a.townland.localeCompare(b.townland) ||
    a.label.localeCompare(b.label)
  );
}

function buildYearRecords(households) {
  return households.map((household) => ({
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
}

function evidenceStatus(censusYears) {
  if (censusYears.length >= 3) return "three-census";
  if (censusYears.length >= 2) return "two-census";
  return "single-census";
}

function buildEntry(line, householdById, coordinateIndex) {
  const households = line.householdIds
    .map((id) => householdById.get(id))
    .filter(Boolean)
    .sort((a, b) => a.censusYear - b.censusYear);

  if (!households.length) return null;

  const primary = households[0];
  const coordinate = coordinateIndex.get(
    coordinateKey(primary.county, primary.ded, primary.townland)
  );

  return {
    id: line.id,
    label: line.label || "Quish line",
    placeLabel: line.placeLabel,
    county: primary.county,
    ded: primary.ded,
    townland: primary.townland,
    coordinate: coordinate || null,
    censusYears: line.censusYears,
    evidenceStatus: evidenceStatus(line.censusYears),
    hasFreeStateCensus: Boolean(line.milestones?.firstFreeStateCensus),
    yearRecords: buildYearRecords(households),
  };
}

export function buildMapPayload({
  familyLinesPayload,
  householdsPayload,
  coordsPayload,
}) {
  const householdById = new Map(
    householdsPayload.households.map((household) => [household.id, household])
  );

  const coordinateIndex = new Map(
    coordsPayload.coordinates.map((entry) => [
      coordinateKey(entry.county, entry.ded, entry.townland),
      { lat: entry.lat, lng: entry.lng },
    ])
  );

  const entries = familyLinesPayload.familyLines
    .map((line) => buildEntry(line, householdById, coordinateIndex))
    .filter(Boolean);

  const lines = entries
    .filter((entry) => entry.censusYears.length >= 2)
    .map((entry) => ({ ...entry, evidenceTier: "line" }))
    .sort(compareEntries);

  const sightings = entries
    .filter((entry) => entry.censusYears.length === 1)
    .map((entry) => ({ ...entry, evidenceTier: "sighting" }))
    .sort(compareEntries);

  const missingCoordinates = [...lines, ...sightings]
    .filter((entry) => !entry.coordinate)
    .map((entry) => ({
      id: entry.id,
      label: entry.label,
      placeLabel: entry.placeLabel,
      evidenceTier: entry.evidenceTier,
    }));

  return {
    generatedAt: new Date().toISOString(),
    lineCount: lines.filter((entry) => entry.coordinate).length,
    sightingCount: sightings.filter((entry) => entry.coordinate).length,
    missingCoordinateCount: missingCoordinates.length,
    lines: lines.filter((entry) => entry.coordinate),
    sightings: sightings.filter((entry) => entry.coordinate),
    missingCoordinates,
  };
}
