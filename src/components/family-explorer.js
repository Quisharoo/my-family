"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";

function placeText(household) {
  return household.placeLabel || "";
}

function headAndSpouseNames(household) {
  const hs = household.groupedMembers?.headAndSpouse || [];
  if (hs.length >= 2) return `${hs[0].firstname} & ${hs[1].firstname} Quish`;
  if (hs.length === 1) return `${hs[0].firstname} Quish`;
  return household.familyLabel || "Quish household";
}

function prettyRelation(relation) {
  if (!relation) return "";
  const r = relation.trim();
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function personBlocks(members, heading) {
  if (!members || !members.length) return null;
  return (
    <section className="detail-section" key={heading}>
      <h2>{heading}</h2>
      <div className="person-list">
        {members.map((m) => (
          <article className="person" key={m.id}>
            <div className="person-name">
              {m.firstname}
              {m.age != null ? `, ${m.age}` : ""}
            </div>
            {m.relation ? (
              <div className="person-line muted">{prettyRelation(m.relation)}</div>
            ) : null}
            {m.birthplace ? (
              <div className="person-line muted">Born in {m.birthplace}</div>
            ) : null}
            {m.occupation ? (
              <div className="person-line muted">{m.occupation}</div>
            ) : null}
            {m.recordUrl ? (
              <a
                className="record-link"
                href={m.recordUrl}
                target="_blank"
                rel="noreferrer"
              >
                View original record
              </a>
            ) : null}
          </article>
        ))}
      </div>
    </section>
  );
}

export default function FamilyExplorer({ data, initialSlug = null }) {
  // Flatten all households once.
  const { households, householdById, householdByClusterAndYear } = useMemo(() => {
    const list = [];
    const byId = new Map();
    const byClusterYear = new Map();
    data.clusters.forEach((cluster) => {
      cluster.households.forEach((h) => {
        const entry = { ...h, clusterId: cluster.id, clusterSlug: cluster.slug };
        list.push(entry);
        byId.set(h.id, entry);
        const key = `${cluster.id}::${h.censusYear}`;
        byClusterYear.set(key, entry);
      });
    });
    return {
      households: list,
      householdById: byId,
      householdByClusterAndYear: byClusterYear,
    };
  }, [data]);

  // Default selection: if a cluster slug is passed in, pick its earliest household.
  const initialHouseholdId = useMemo(() => {
    if (!initialSlug) return null;
    const cluster = data.clusters.find((c) => c.slug === initialSlug);
    if (!cluster) return null;
    const sorted = [...cluster.households].sort(
      (a, b) => a.censusYear - b.censusYear
    );
    return sorted[0]?.id || null;
  }, [data, initialSlug]);

  const [query, setQuery] = useState("");
  const [selectedId, setSelectedId] = useState(initialHouseholdId);
  const [direction, setDirection] = useState("forward"); // forward | back

  // Keep URL tidy when navigating between siblings without a full route change.
  useEffect(() => {
    if (!selectedId) return;
    const h = householdById.get(selectedId);
    if (!h) return;
    const url = `/cluster/${h.clusterSlug}`;
    if (
      typeof window !== "undefined" &&
      window.location.pathname !== url
    ) {
      window.history.replaceState({ id: selectedId }, "", url);
    }
  }, [selectedId, householdById]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = !q
      ? households
      : households.filter((h) => {
          const hay = [
            headAndSpouseNames(h),
            placeText(h),
            String(h.censusYear),
            ...(h.memberNames || []),
            ...(h.members || []).map((m) => m.relation || ""),
          ]
            .join(" ")
            .toLowerCase();
          return hay.includes(q);
        });
    return filtered.slice().sort((a, b) => {
      const pa = placeText(a).toLowerCase();
      const pb = placeText(b).toLowerCase();
      if (pa !== pb) return pa.localeCompare(pb);
      return a.censusYear - b.censusYear;
    });
  }, [households, query]);

  const selected = selectedId ? householdById.get(selectedId) : null;

  function openDetail(id) {
    setDirection("forward");
    setSelectedId(id);
    if (typeof window !== "undefined")
      window.scrollTo({ top: 0, behavior: "auto" });
  }

  function closeDetail() {
    setDirection("back");
    setSelectedId(null);
    if (typeof window !== "undefined") {
      window.history.replaceState({}, "", "/");
      window.scrollTo({ top: 0, behavior: "auto" });
    }
  }

  function siblingOf(h) {
    if (!h) return null;
    const cluster = data.clusters.find((c) => c.id === h.clusterId);
    if (!cluster || cluster.households.length < 2) return null;
    return (
      cluster.households.find(
        (other) => other.id !== h.id && other.censusYear !== h.censusYear
      ) || null
    );
  }

  const sibling = siblingOf(selected);

  return (
    <div id="app" data-view={selected ? "detail" : "list"}>
      {/* List view */}
      <section
        className={`view ${!selected ? "view-visible" : ""} ${
          selected && direction === "forward" ? "view-exit-left" : ""
        }`}
        aria-hidden={selected ? "true" : "false"}
      >
        <header className="list-header">
          <h1>The Quish Family</h1>
          <p className="subtitle">
            Our family in the 1901 and 1911 Irish census.
          </p>
          <Link href="/family-map" className="home-map-link">
            See the family map →
          </Link>
          <div className="search-wrap">
            <input
              type="search"
              autoComplete="off"
              placeholder="Search a name or place"
              aria-label="Search a name or place"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </header>

        <main className="household-list">
          {visible.length === 0 ? (
            <div className="list-empty">
              No households found. Try a different name or place.
            </div>
          ) : (
            visible.map((h) => (
              <button
                className="household-card"
                type="button"
                key={h.id}
                onClick={() => openDetail(h.id)}
              >
                <div className="family-name">{headAndSpouseNames(h)}</div>
                <div className="place">{placeText(h)}</div>
                <div className="meta">
                  {h.censusYear} · {h.members.length}{" "}
                  {h.members.length === 1 ? "person" : "people"}
                </div>
              </button>
            ))
          )}
        </main>
      </section>

      {/* Detail view */}
      <section
        className={`view ${selected ? "view-visible" : ""} ${
          !selected && direction === "back" ? "view-exit-right" : ""
        } ${selected && direction === "back" ? "view-enter-from-left" : ""}`}
        aria-hidden={selected ? "false" : "true"}
      >
        <header className="detail-header">
          <button
            className="back-button"
            type="button"
            onClick={closeDetail}
            aria-label="Back"
          >
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <path
                d="M15 5l-7 7 7 7"
                fill="none"
                stroke="currentColor"
                strokeWidth="2.25"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
            <span>Back</span>
          </button>
        </header>

        <main className="detail-body">
          {selected ? (
            <>
              <h1 className="detail-title">{headAndSpouseNames(selected)}</h1>
              <p className="detail-subtitle">
                {placeText(selected)} · {selected.censusYear}
              </p>

              {personBlocks(
                selected.groupedMembers?.headAndSpouse || [],
                "Parents"
              )}
              {personBlocks(
                selected.groupedMembers?.children || [],
                "Children"
              )}
              {personBlocks(
                selected.groupedMembers?.otherRelatives || [],
                "Other relatives"
              )}
              {personBlocks(
                selected.groupedMembers?.nonFamily || [],
                "Others in the home"
              )}

              {sibling ? (
                <section className="detail-section">
                  <button
                    className="sibling-card"
                    type="button"
                    onClick={() => openDetail(sibling.id)}
                  >
                    <div className="sibling-label">
                      Likely the same family in {sibling.censusYear}
                    </div>
                    <div className="sibling-name">
                      {headAndSpouseNames(sibling)}
                    </div>
                    <div className="sibling-meta">{placeText(sibling)}</div>
                  </button>
                </section>
              ) : null}
            </>
          ) : null}
        </main>
      </section>
    </div>
  );
}
