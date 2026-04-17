"use client";

import { useDeferredValue, useEffect, useMemo, useState } from "react";

function includesQuery(value, query) {
  return String(value || "").toLowerCase().includes(query);
}

function formatProgressions(progressions) {
  if (!progressions.length) {
    return "The ages do not line up clearly enough to help much here.";
  }

  return progressions
    .map((progression) => {
      return `${progression.name} ${progression.from}\u2192${progression.to}`;
    })
    .join(", ");
}

function groupPills(years, selectedYears, onToggleYear) {
  return years.map((year) => (
    <button
      key={year}
      className={`year-pill ${selectedYears.includes(year) ? "active" : ""}`}
      onClick={() => onToggleYear(year)}
      type="button"
    >
      {year}
    </button>
  ));
}

function plainStatus(cluster) {
  if (cluster.type === "single") {
    return "Found once so far";
  }

  if (cluster.confidenceTone === "strong") {
    return "Same family found again";
  }

  if (cluster.confidenceTone === "likely") {
    return "Probably the same family";
  }

  return "Maybe the same family";
}

function plainSummary(cluster) {
  if (cluster.type === "single") {
    return "I only found this Quish household once in the census so far.";
  }

  if (cluster.confidenceTone === "strong") {
    return "The names, place, and ages line up very well, so this looks like the same family ten years later.";
  }

  if (cluster.confidenceTone === "likely") {
    return "A good few names and ages line up, so this is probably the same family ten years later.";
  }

  return "There are signs this may be the same family ten years later, but it is not certain from the census alone.";
}

function PersonNode({ member }) {
  return (
    <article className="person-node">
      <a href={member.recordUrl} target="_blank" rel="noreferrer">
        {member.firstname}
        {member.age ? `, ${member.age}` : ""}
      </a>
      <p>{member.relation || "Relation not stated"}</p>
      <p>{member.birthplace || "Birthplace not stated"}</p>
      <p>{member.occupation || "Occupation not stated"}</p>
      <div className="person-links">
        <a href={member.recordUrl} target="_blank" rel="noreferrer">
          See census page
        </a>
        {member.formAPdfUrl ? (
          <a href={member.formAPdfUrl} target="_blank" rel="noreferrer">
            Open household form
          </a>
        ) : null}
      </div>
    </article>
  );
}

function Branch({ title, members, tone }) {
  if (!members.length) {
    return null;
  }

  return (
    <section className={`branch branch-${tone}`}>
      <p className="branch-label">{title}</p>
      <div className="branch-members">
        {members.map((member) => (
          <PersonNode key={`${member.id}-${tone}`} member={member} />
        ))}
      </div>
    </section>
  );
}

function HouseholdTree({ household }) {
  return (
    <article className="tree-card">
      <div className="tree-card-head">
        <div>
          <p className="tree-year">{household.censusYear}</p>
          <h3>{household.familyLabel}</h3>
          <p className="tree-place">{household.placeLabel}</p>
        </div>
        <div className="tree-meta-pills">
          <span className="meta-pill">House {household.houseNumber}</span>
          <span className="meta-pill">{household.members.length} people</span>
        </div>
      </div>

      <Branch
        title="Parents / couple"
        members={household.groupedMembers.headAndSpouse}
        tone="head"
      />

      {household.groupedMembers.children.length ? (
        <div className="tree-connector" aria-hidden="true" />
      ) : null}

      <Branch
        title="Children"
        members={household.groupedMembers.children}
        tone="children"
      />

      <Branch
        title="Other family"
        members={household.groupedMembers.otherRelatives}
        tone="relatives"
      />

      <Branch
        title="Other people in the home"
        members={household.groupedMembers.nonFamily}
        tone="nonfamily"
      />
    </article>
  );
}

function YearSnapshot({ yearGroup }) {
  return (
    <section className="year-snapshot">
      <div className="snapshot-head">
        <span className="snapshot-year">{yearGroup.year}</span>
        <p>{yearGroup.households.length} home{yearGroup.households.length === 1 ? "" : "s"} on the census</p>
      </div>
      <div className="snapshot-households">
        {yearGroup.households.map((household) => (
          <HouseholdTree key={household.id} household={household} />
        ))}
      </div>
    </section>
  );
}

function ClusterCard({ cluster, isSelected, onSelect }) {
  return (
    <button
      className={`cluster-card ${isSelected ? "selected" : ""}`}
      onClick={() => onSelect(cluster.slug)}
      type="button"
    >
      <div className="cluster-card-top">
        <div>
          <p className="cluster-card-kicker">{plainStatus(cluster)}</p>
          <h3>{cluster.familyLabel}</h3>
        </div>
        <span className={`status-badge ${cluster.confidenceTone}`}>{cluster.years.join(" · ")}</span>
      </div>
      <p className="cluster-card-place">{cluster.placeLabel}</p>
      <p className="cluster-card-summary">{plainSummary(cluster)}</p>
    </button>
  );
}

export default function FamilyExplorer({ data, initialSlug = null }) {
  const [county, setCounty] = useState("All counties");
  const [query, setQuery] = useState("");
  const [showSingles, setShowSingles] = useState(false);
  const [selectedYears, setSelectedYears] = useState(data.meta.years);
  const deferredQuery = useDeferredValue(query);
  const normalizedQuery = deferredQuery.trim().toLowerCase();

  const visibleClusters = useMemo(() => {
    return data.clusters.filter((cluster) => {
      if (county !== "All counties" && !cluster.counties.includes(county)) {
        return false;
      }

      if (!showSingles && cluster.type === "single") {
        return false;
      }

      if (!cluster.years.some((year) => selectedYears.includes(year))) {
        return false;
      }

      if (!normalizedQuery) {
        return true;
      }

      return [
        cluster.familyLabel,
        cluster.placeLabel,
        cluster.description,
        ...cluster.households.map((household) => household.placeLabel),
        ...cluster.households.flatMap((household) => household.memberNames),
        ...cluster.households.flatMap((household) =>
          household.members.map((member) => member.relation)
        ),
      ].some((value) => includesQuery(value, normalizedQuery));
    });
  }, [county, data.clusters, normalizedQuery, selectedYears, showSingles]);

  const [selectedSlug, setSelectedSlug] = useState(
    initialSlug || visibleClusters[0]?.slug || null
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!visibleClusters.some((cluster) => cluster.slug === selectedSlug)) {
      setSelectedSlug(visibleClusters[0]?.slug || null);
    }
  }, [selectedSlug, visibleClusters]);

  useEffect(() => {
    if (!copied) {
      return undefined;
    }

    const timeout = window.setTimeout(() => setCopied(false), 1600);
    return () => window.clearTimeout(timeout);
  }, [copied]);

  const selectedCluster =
    visibleClusters.find((cluster) => cluster.slug === selectedSlug) ||
    visibleClusters[0] ||
    null;

  const shareUrl = selectedCluster
    ? `/cluster/${selectedCluster.slug}`
    : "/";

  function toggleYear(year) {
    setSelectedYears((currentYears) => {
      if (currentYears.includes(year)) {
        return currentYears.length === 1
          ? currentYears
          : currentYears.filter((item) => item !== year);
      }

      return [...currentYears, year].sort((a, b) => a - b);
    });
  }

  async function copyShareLink() {
    if (!selectedCluster || typeof window === "undefined") {
      return;
    }

    const url = `${window.location.origin}/cluster/${selectedCluster.slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
    } catch {
      window.prompt("Copy this family link", url);
    }
  }

  return (
    <main className="page-shell">
      <section className="hero-panel">
        <div className="hero-copy">
          <p className="eyebrow">Irish family history from the census</p>
          <h1>The Quish family story</h1>
          <p className="hero-lede">
            This brings together Quish homes from the Irish census and lays them
            out like a family tree. Where the same names, place, and ages appear
            again ten years later, I treat that as probably the same family.
          </p>
          <div className="hero-notes">
            <span className="note-pill">Census years: {data.meta.years.join(" · ")}</span>
            <span className="note-pill">Ready for 1926</span>
          </div>
        </div>

        <div className="metric-grid">
          <article className="metric-card">
            <span>People found</span>
            <strong>{data.meta.exactRecordCount}</strong>
          </article>
          <article className="metric-card">
            <span>Homes found</span>
            <strong>{data.meta.householdCount}</strong>
          </article>
          <article className="metric-card">
            <span>Families seen again</span>
            <strong>{data.meta.clusterCount}</strong>
          </article>
          <article className="metric-card">
            <span>Homes seen once</span>
            <strong>{data.meta.standaloneCount}</strong>
          </article>
        </div>
      </section>

      <section className="controls-panel">
        <label className="field">
          <span>County</span>
          <select value={county} onChange={(event) => setCounty(event.target.value)}>
            <option value="All counties">All counties</option>
            {data.meta.counties.map((entry) => (
              <option key={entry} value={entry}>
                {entry}
              </option>
            ))}
          </select>
        </label>

        <label className="field field-wide">
          <span>Search by name or place</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Martin, Rathanny, Limerick..."
          />
        </label>

        <label className="field field-inline">
          <span>Show homes found only once</span>
          <input
            checked={showSingles}
            onChange={(event) => setShowSingles(event.target.checked)}
            type="checkbox"
          />
        </label>

        <div className="field">
          <span>Census years</span>
          <div className="year-pill-row">
            {groupPills(data.meta.years, selectedYears, toggleYear)}
          </div>
        </div>
      </section>

      <section className="main-layout">
        <section className="focus-panel">
          {selectedCluster ? (
            <>
              <div className="focus-header">
                <div>
                  <p className="eyebrow">Chosen family</p>
                  <h2>{selectedCluster.familyLabel}</h2>
                  <p className="focus-place">{selectedCluster.placeLabel}</p>
                </div>

                <div className="focus-actions">
                  <span className={`status-badge ${selectedCluster.confidenceTone}`}>
                    {plainStatus(selectedCluster)}
                  </span>
                  <button className="share-button" onClick={copyShareLink} type="button">
                    {copied ? "Copied" : "Copy family link"}
                  </button>
                </div>
              </div>

              <section className="continuity-panel">
                <div>
                  <p className="continuity-label">What this looks like</p>
                  <h3>{plainStatus(selectedCluster)}</h3>
                </div>
                <p>{plainSummary(selectedCluster)}</p>
              </section>

              <section className="tree-stage">
                {selectedCluster.byYear
                  .filter((yearGroup) => selectedYears.includes(yearGroup.year))
                  .map((yearGroup, index, groups) => (
                    <div className="snapshot-wrap" key={yearGroup.year}>
                      <YearSnapshot yearGroup={yearGroup} />
                      {index < groups.length - 1 ? (
                        <div className="year-bridge" aria-hidden="true">
                          <span className={`status-badge ${selectedCluster.confidenceTone}`}>
                            {plainStatus(selectedCluster)}
                          </span>
                        </div>
                      ) : null}
                    </div>
                  ))}
              </section>

              <details className="notes-panel">
                <summary>How I matched these families</summary>
                <div className="notes-grid">
                  <article className="note-card">
                    <h4>What the census can and cannot tell us</h4>
                    <p>
                      The tree only shows relationships that are written on the
                      census form itself. If two separate homes look related, that
                      still needs other family records to prove it properly.
                    </p>
                    <p>
                      When I say a family was found again, that is based on names,
                      place, and ages lining up ten years later.
                    </p>
                  </article>

                  <article className="note-card">
                    <h4>Why this looks like the same family</h4>
                    {selectedCluster.continuityEdges.length ? (
                      <div className="edge-list">
                        {selectedCluster.continuityEdges.map((edge) => (
                          <article className="edge-card" key={edge.id}>
                            <div className="edge-card-top">
                              <strong>{plainStatus(selectedCluster)}</strong>
                            </div>
                            <p>{edge.placeLabel}</p>
                            <p>Matching names: {edge.overlap.join(", ")}</p>
                            <p>Ages ten years later: {formatProgressions(edge.plausibleAgeProgressions)}</p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <p>I did not find enough in the census alone to match this home to another one.</p>
                    )}
                  </article>

                  <article className="note-card">
                    <h4>Other nearby spellings</h4>
                    <p>{data.meta.futureYearNote}</p>
                    <div className="variant-list">
                      {data.variants.map((variant) => (
                        <div className="variant-item" key={variant.id}>
                          <strong>
                            {variant.surname} · {variant.censusYear}
                          </strong>
                          <p>{variant.placeLabel}</p>
                          <p>House {variant.houseNumber}</p>
                          <p>{variant.members.map((member) => member.firstname).join(", ")}</p>
                        </div>
                      ))}
                    </div>
                  </article>
                </div>
              </details>
            </>
          ) : (
            <section className="empty-panel">
              <h2>No families match that search</h2>
              <p>Try a different county, year, or family name.</p>
            </section>
          )}
        </section>

        <aside className="selector-panel">
          <div className="selector-head">
            <div>
              <p className="eyebrow">Pick a family</p>
              <h2>Families to browse</h2>
            </div>
            <p>{visibleClusters.length} shown</p>
          </div>

          <div className="cluster-card-list">
            {visibleClusters.map((cluster) => (
              <ClusterCard
                key={cluster.slug}
                cluster={cluster}
                isSelected={cluster.slug === selectedCluster?.slug}
                onSelect={setSelectedSlug}
              />
            ))}
          </div>

          {selectedCluster ? (
            <a className="route-link" href={shareUrl}>
              Open this family on its own page
            </a>
          ) : null}
        </aside>
      </section>
    </main>
  );
}
