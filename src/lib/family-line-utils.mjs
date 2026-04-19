export function buildCountyOptions(entries) {
  const counties = [...new Set(entries.map((entry) => entry.county))].sort();
  return ["All", ...counties];
}

export function filterEntriesByCounty(entries, county) {
  if (!county || county === "All") return entries;
  return entries.filter((entry) => entry.county === county);
}

export function groupEntriesByCounty(entries) {
  return entries.reduce((counts, entry) => {
    counts[entry.county] = (counts[entry.county] || 0) + 1;
    return counts;
  }, {});
}

function isGenericPlaceLabel(label) {
  return String(label || "").includes(" | ");
}

export function formatLineDisplay(entry) {
  const title = isGenericPlaceLabel(entry.label)
    ? `${entry.townland} line`
    : entry.label;

  return {
    title,
    place: entry.townland,
    meta: `${entry.ded}, Co. ${entry.county}`,
  };
}
