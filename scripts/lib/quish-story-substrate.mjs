const NAME_EQUIVALENTS = new Map([
  ["mary a", "mary anne"],
  ["mary ann", "mary anne"],
  ["norah", "nora"],
  ["johannah", "hannah"],
]);

export function createCensusEditions() {
  return new Map(
    [
      {
        year: 1901,
        regime: "British administration",
        authority: "United Kingdom government",
        historicalSignificance: "Pre-independence Irish census under British rule",
        narrativePriority: 2,
      },
      {
        year: 1911,
        regime: "British administration",
        authority: "United Kingdom government",
        historicalSignificance: "Final pre-independence Irish census under British rule",
        narrativePriority: 2,
      },
      {
        year: 1926,
        regime: "Irish Free State",
        authority: "Irish Free State government",
        historicalSignificance: "First census of the Irish Free State",
        narrativePriority: 3,
      },
    ].map((edition) => [edition.year, edition])
  );
}

export function normalizeNameForMatch(name) {
  const cleaned = String(name || "")
    .toLowerCase()
    .replace(/^\[|\]$/g, "")
    .replace(/[.'",()]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  return NAME_EQUIVALENTS.get(cleaned) || cleaned;
}

export function scoreAgeProgression(fromAge, toAge, expectedDelta) {
  if (fromAge == null || toAge == null) {
    return {
      ok: false,
      band: "unknown",
      delta: null,
    };
  }

  const delta = Number(toAge) - Number(fromAge);
  const preferredMin = expectedDelta - 1;
  const preferredMax = expectedDelta + 1;
  const allowedMin = expectedDelta - 2;
  const allowedMax = expectedDelta + 2;

  if (delta >= preferredMin && delta <= preferredMax) {
    return {
      ok: true,
      band: "preferred",
      delta,
    };
  }

  if (delta >= allowedMin && delta <= allowedMax) {
    return {
      ok: true,
      band: "allowed",
      delta,
    };
  }

  return {
    ok: false,
    band: "out_of_range",
    delta,
  };
}

function canonicalFirstName(record) {
  return record.first_name || record.firstname || null;
}

function canonicalRelation(record) {
  return (
    record.updated_relationship_to_head ||
    record.relationship_to_head ||
    record.relation_to_head ||
    null
  );
}

function canonicalAge(record) {
  return record.updated_age ?? record.age ?? null;
}

function canonicalSex(record) {
  return record.updated_sex || record.sex || null;
}

function canonicalBirthplace(record) {
  return record.birthplace_county || record.birthplace || null;
}

function canonicalHouseNumber(record) {
  return record.house_number || record.houseNumber || null;
}

function canonicalImageGroup(record) {
  return record.image_group != null ? String(record.image_group) : null;
}

export function buildCanonicalPersonObservations(rawRecords, editions) {
  return rawRecords.map((entry) => {
    const edition = editions.get(entry.censusYear);
    const firstName = canonicalFirstName(entry.raw);
    return {
      id: entry.sourceId,
      sourceDataset: entry.sourceDataset,
      censusYear: entry.censusYear,
      censusEdition: edition,
      sourceRef: {
        sourceId: entry.sourceId,
        sourceDataset: entry.sourceDataset,
      },
      county: entry.raw.county || null,
      ded: entry.raw.ded || null,
      townland: entry.raw.townland || null,
      houseNumber: canonicalHouseNumber(entry.raw),
      imageGroup: canonicalImageGroup(entry.raw),
      surname: entry.raw.surname || null,
      firstName,
      normalizedName: normalizeNameForMatch(firstName),
      relation: canonicalRelation(entry.raw),
      age: canonicalAge(entry.raw),
      sex: canonicalSex(entry.raw),
      birthplace: canonicalBirthplace(entry.raw),
      raw: entry.raw,
    };
  });
}

export function groupHouseholdObservations(observations) {
  const households = new Map();

  for (const observation of observations) {
    const key = [
      observation.censusYear,
      observation.county,
      observation.ded,
      observation.townland,
      observation.houseNumber,
      observation.imageGroup,
    ].join("::");

    if (!households.has(key)) {
      households.set(key, {
        id: key,
        censusYear: observation.censusYear,
        censusEdition: observation.censusEdition,
        county: observation.county,
        ded: observation.ded,
        townland: observation.townland,
        houseNumber: observation.houseNumber,
        imageGroup: observation.imageGroup,
        members: [],
      });
    }

    households.get(key).members.push(observation);
  }

  return [...households.values()];
}

function placeKey(household) {
  return [household.county, household.ded, household.townland]
    .filter(Boolean)
    .join("::");
}

function observationPlaceScope(observation) {
  return [observation.county, observation.ded, observation.townland]
    .filter(Boolean)
    .join("::");
}

function adjacentExpectedDelta(fromYear, toYear) {
  if (fromYear === 1901 && toYear === 1911) return 10;
  if (fromYear === 1911 && toYear === 1926) return 15;
  return null;
}

export function buildPersonLinks(observations) {
  const ordered = observations.slice().sort((a, b) => a.censusYear - b.censusYear);
  const links = [];

  for (const fromObservation of ordered) {
    for (const toObservation of ordered) {
      if (toObservation.censusYear <= fromObservation.censusYear) continue;
      const expectedDelta = adjacentExpectedDelta(
        fromObservation.censusYear,
        toObservation.censusYear
      );
      if (!expectedDelta) continue;
      if (fromObservation.normalizedName !== toObservation.normalizedName) continue;
      if (observationPlaceScope(fromObservation) !== observationPlaceScope(toObservation)) {
        continue;
      }

      const ageProgression = scoreAgeProgression(
        fromObservation.age,
        toObservation.age,
        expectedDelta
      );
      if (!ageProgression.ok) continue;

      links.push({
        id: `person-link::${fromObservation.id}::${toObservation.id}`,
        fromObservationId: fromObservation.id,
        toObservationId: toObservation.id,
        score: ageProgression.band === "preferred" ? 3 : 2,
        confidence: ageProgression.band === "preferred" ? "strong" : "likely",
        reasons: ["same_place", "same_name", "plausible_age_progression"],
        blockingReasons: [],
        reviewStatus: "accepted",
      });
    }
  }

  return links;
}

function bestAdjacentHousehold(household, candidates, expectedDelta) {
  let best = null;

  for (const candidate of candidates) {
    if (placeKey(household) !== placeKey(candidate)) continue;
    for (const member of household.members) {
      const normalized = member.normalizedName;
      const match = candidate.members.find((other) => other.normalizedName === normalized);
      if (!match) continue;

      const ageProgression = scoreAgeProgression(member.age, match.age, expectedDelta);
      if (!ageProgression.ok) continue;

      best = {
        targetHouseholdId: candidate.id,
        matchedMemberIds: [member.id, match.id],
        confidence: ageProgression.band === "preferred" ? "strong" : "likely",
        reasons: ["same_place", "same_name", "plausible_age_progression"],
      };
      return best;
    }
  }

  return best;
}

export function assembleFamilyLines(households) {
  const ordered = households.slice().sort((a, b) => a.censusYear - b.censusYear);
  const lines = [];
  const visited = new Set();

  for (const household of ordered) {
    if (visited.has(household.id)) continue;

    const line = {
      id: `family-line::${household.id}`,
      householdIds: [household.id],
      censusYears: [household.censusYear],
      milestones: {
        firstFreeStateCensus: household.censusYear === 1926,
      },
    };

    visited.add(household.id);

    let current = household;
    for (const [year, expectedDelta] of [
      [1911, 10],
      [1926, 15],
    ]) {
      if (current.censusYear >= year) continue;
      const candidates = ordered.filter((candidate) => candidate.censusYear === year);
      const link = bestAdjacentHousehold(current, candidates, expectedDelta);
      if (!link) continue;
      const next = ordered.find((candidate) => candidate.id === link.targetHouseholdId);
      if (!next || visited.has(next.id)) continue;
      visited.add(next.id);
      line.householdIds.push(next.id);
      line.censusYears.push(next.censusYear);
      if (next.censusYear === 1926) {
        line.milestones.firstFreeStateCensus = true;
      }
      current = next;
    }

    lines.push(line);
  }

  return lines;
}

export function buildNarrativeClaims(familyLines, editions, placeSummary = []) {
  const claims = [];

  for (const line of familyLines) {
    claims.push({
      id: `claim::${line.id}::continuity`,
      claimType: "family-line-continuity",
      subjectIds: [line.id],
      evidenceRefs: line.householdIds,
      confidence: line.censusYears.length >= 3 ? "strong" : "likely",
      eraContext: editions.get(line.censusYears[line.censusYears.length - 1]),
      curationStatus: "computed",
      eligibleForPrimaryStory: line.censusYears.length >= 2,
    });

    if (line.milestones.firstFreeStateCensus) {
      claims.push({
        id: `claim::${line.id}::first-free-state`,
        claimType: "first-free-state-census-milestone",
        subjectIds: [line.id],
        evidenceRefs: line.householdIds,
        confidence: "strong",
        eraContext: editions.get(1926),
        curationStatus: "computed",
        eligibleForPrimaryStory: true,
      });
    }
  }

  if (placeSummary[0]) {
    claims.push({
      id: `claim::place::${placeSummary[0].place}`,
      claimType: "place-concentration",
      subjectIds: [],
      evidenceRefs: [],
      confidence: "strong",
      eraContext: null,
      curationStatus: "computed",
      eligibleForPrimaryStory: false,
      place: placeSummary[0].place,
    });
  }

  return claims;
}

export function buildStory({
  claims,
  familyLines,
  editions,
  households,
  appendixHouseholds,
}) {
  const historicalClaimIds = [];
  const mainClaimIds = [];
  const freeStateClaimIds = [];
  const placeClaimIds = [];

  if (editions.get(1926)) {
    historicalClaimIds.push("context::1926");
  }

  for (const claim of claims) {
    if (claim.eligibleForPrimaryStory) {
      mainClaimIds.push(claim.id);
    }
    if (claim.claimType === "first-free-state-census-milestone") {
      freeStateClaimIds.push(claim.id);
    }
    if (claim.claimType === "place-concentration") {
      placeClaimIds.push(claim.id);
    }
  }

  return {
    meta: {
      familyLineCount: familyLines.length,
      householdCount: households.length,
      appendixHouseholdCount: appendixHouseholds.length,
    },
    sections: [
      {
        id: "historical-context",
        title: "Historical context",
        claimIds: historicalClaimIds,
      },
      {
        id: "main-family-lines",
        title: "Main family lines",
        claimIds: mainClaimIds,
      },
      {
        id: "free-state-transition",
        title: "Free State transition",
        claimIds: freeStateClaimIds,
      },
      {
        id: "place-patterns",
        title: "Place patterns",
        claimIds: placeClaimIds,
      },
      {
        id: "appendix",
        title: "Appendix",
        claimIds: [],
        householdIds: appendixHouseholds.map((household) => household.id),
      },
    ],
  };
}

function buildObservationIndex(observations) {
  return new Map(observations.map((observation) => [observation.id, observation]));
}

function buildHouseholdIndex(households) {
  return new Map(households.map((household) => [household.id, household]));
}

export function buildHouseholdLinks(households, personLinks) {
  const householdById = buildHouseholdIndex(households);
  const householdByMemberId = new Map();

  for (const household of households) {
    for (const member of household.members) {
      householdByMemberId.set(member.id, household.id);
    }
  }

  const grouped = new Map();

  for (const link of personLinks) {
    const fromHouseholdId = householdByMemberId.get(link.fromObservationId);
    const toHouseholdId = householdByMemberId.get(link.toObservationId);
    if (!fromHouseholdId || !toHouseholdId || fromHouseholdId === toHouseholdId) continue;

    const key = `${fromHouseholdId}::${toHouseholdId}`;
    if (!grouped.has(key)) {
      grouped.set(key, {
        id: `household-link::${key}`,
        fromHouseholdId,
        toHouseholdId,
        personLinkIds: [],
        score: 0,
        reasons: new Set(),
        confidence: "possible",
        reviewStatus: "accepted",
      });
    }

    const groupedLink = grouped.get(key);
    groupedLink.personLinkIds.push(link.id);
    groupedLink.score += link.score;
    for (const reason of link.reasons) {
      groupedLink.reasons.add(reason);
    }
  }

  return [...grouped.values()].map((link) => {
    const fromHousehold = householdById.get(link.fromHouseholdId);
    const toHousehold = householdById.get(link.toHouseholdId);
    const confidence =
      link.score >= 6 ? "strong" : link.score >= 4 ? "likely" : "possible";

    return {
      ...link,
      confidence,
      reasons: [...link.reasons],
      placeMatch: placeKey(fromHousehold) === placeKey(toHousehold),
    };
  });
}

export function assemblePersonThreads(observations, personLinks) {
  const observationById = buildObservationIndex(observations);
  const adjacency = new Map(observations.map((observation) => [observation.id, new Set()]));

  for (const link of personLinks) {
    if (link.reviewStatus !== "accepted") continue;
    adjacency.get(link.fromObservationId)?.add(link.toObservationId);
    adjacency.get(link.toObservationId)?.add(link.fromObservationId);
  }

  const visited = new Set();
  const threads = [];

  for (const observation of observations) {
    if (visited.has(observation.id)) continue;
    const queue = [observation.id];
    const memberIds = [];

    while (queue.length) {
      const currentId = queue.shift();
      if (!currentId || visited.has(currentId)) continue;
      visited.add(currentId);
      memberIds.push(currentId);
      for (const neighborId of adjacency.get(currentId) || []) {
        if (!visited.has(neighborId)) queue.push(neighborId);
      }
    }

    const memberObservations = memberIds
      .map((memberId) => observationById.get(memberId))
      .filter(Boolean)
      .sort((a, b) => a.censusYear - b.censusYear);

    threads.push({
      id: `person-thread::${memberObservations[0]?.normalizedName || observation.id}::${memberIds[0]}`,
      observationIds: memberIds,
      censusYears: [...new Set(memberObservations.map((member) => member.censusYear))],
      normalizedName: memberObservations[0]?.normalizedName || null,
      milestones: {
        firstFreeStateCensus: memberObservations.some((member) => member.censusYear === 1926),
      },
    });
  }

  return threads;
}

export function summarizePlaces(households) {
  const counts = new Map();

  for (const household of households) {
    const key = [household.county, household.ded, household.townland]
      .filter(Boolean)
      .join(" | ");
    counts.set(key, (counts.get(key) || 0) + household.members.length);
  }

  return [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([place, memberCount]) => ({ place, memberCount }));
}

export function buildResearchSummary({
  observations,
  households,
  familyLines,
  personThreads,
  placeSummary,
}) {
  const observationsByYear = {};
  const householdsByYear = {};
  const observationsByCounty = {};

  for (const observation of observations) {
    observationsByYear[observation.censusYear] =
      (observationsByYear[observation.censusYear] || 0) + 1;
    if (observation.county) {
      observationsByCounty[observation.county] =
        (observationsByCounty[observation.county] || 0) + 1;
    }
  }

  for (const household of households) {
    householdsByYear[household.censusYear] =
      (householdsByYear[household.censusYear] || 0) + 1;
  }

  return {
    observationsByYear,
    householdsByYear,
    observationsByCounty,
    familyLineCount: familyLines.length,
    familyLinesReaching1926: familyLines.filter(
      (line) => line.milestones?.firstFreeStateCensus
    ).length,
    personThreadCount: personThreads.length,
    personThreadsReaching1926: personThreads.filter(
      (thread) => thread.milestones?.firstFreeStateCensus
    ).length,
    topPlaces: placeSummary.slice(0, 10),
  };
}

export function buildTakeaways({ researchSummary, familyLines }) {
  const established = [];
  const openQuestions = [];

  established.push({
    statement: `The dataset now combines ${researchSummary.observationsByYear["1901"] || 0} observations from 1901, ${researchSummary.observationsByYear["1911"] || 0} from 1911, and ${researchSummary.observationsByYear["1926"] || 0} from 1926 into one analyzable corpus.`,
    evidenceRefs: [],
  });

  if (researchSummary.familyLinesReaching1926) {
    established.push({
      statement: `${researchSummary.familyLinesReaching1926} family lines in the current analysis reach the first Irish Free State census in 1926.`,
      evidenceRefs: familyLines
        .filter((line) => line.milestones?.firstFreeStateCensus)
        .flatMap((line) => line.householdIds)
        .slice(0, 10),
    });
  }

  if (researchSummary.topPlaces?.[0]) {
    established.push({
      statement: `The strongest place concentration in the current corpus is ${researchSummary.topPlaces[0].place}.`,
      evidenceRefs: [],
    });
  }

  for (const line of familyLines.filter((line) => line.milestones?.firstFreeStateCensus).slice(0, 5)) {
    established.push({
      statement: `${line.label || line.id} forms an established multi-census line across ${line.censusYears.join(", ")}.`,
      evidenceRefs: line.householdIds,
    });
  }

  openQuestions.push({
    statement:
      "Single-census appearances and weaker inferred links still need manual genealogical review before they are presented as family continuity.",
    evidenceRefs: [],
  });
  openQuestions.push({
    statement:
      "This analysis establishes census-based continuity evidence, not full kinship proof; church, civil, and land records are still needed for stronger family-tree assertions.",
    evidenceRefs: [],
  });

  return {
    established,
    openQuestions,
  };
}
