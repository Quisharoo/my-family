"use client";

import { useEffect, useMemo, useState } from "react";

function placeText(household) {
  const raw = household.placeLabel || "";
  const parts = raw.split(",").map((p) => p.trim()).filter(Boolean);
  const deduped = [];
  const seen = new Set();
  for (const part of parts) {
    const normalized = part.toLowerCase();
    if (!seen.has(normalized)) {
      deduped.push(part);
      seen.add(normalized);
    }
  }
  return deduped.join(", ");
}

function headAndSpouseNames(household) {
  const hs = household.groupedMembers?.headAndSpouse || [];
  if (hs.length >= 2) return `${hs[0].firstname} & ${hs[1].firstname} Quish`;
  if (hs.length === 1) return `${hs[0].firstname} Quish`;
  const first = household.members?.[0];
  if (first?.firstname) return `${first.firstname} Quish`;
  return household.familyLabel || "Quish household";
}

function ageBit(age) {
  if (age == null) return "";
  if (age === 0) return ", under 1";
  return `, ${age}`;
}

function prettyRelation(relation) {
  if (!relation) return "";
  const r = relation.trim();
  return r.charAt(0).toUpperCase() + r.slice(1).toLowerCase();
}

function PersonCard({ member, compact = false }) {
  const sourceUrl = member.formAPdfUrl || member.recordUrl || null;
  const sourceLabel = member.formAPdfUrl
    ? "View original census page"
    : "View original record";

  return (
    <article className={`person ${compact ? "person-compact" : ""}`}>
      <div className="person-name">
        {member.firstname}
        {ageBit(member.age)}
      </div>
      {member.relation ? (
        <div className="person-line muted">{prettyRelation(member.relation)}</div>
      ) : null}
      {member.birthplace ? (
        <div className="person-line muted">Born in {member.birthplace}</div>
      ) : null}
      {member.occupation ? (
        <div className="person-line muted">{member.occupation}</div>
      ) : null}
      {sourceUrl ? (
        <a
          className="record-link"
          href={sourceUrl}
          target="_blank"
          rel="noreferrer"
        >
          {sourceLabel}
        </a>
      ) : null}
    </article>
  );
}

function familyTree(household) {
  const parents = household.groupedMembers?.headAndSpouse || [];
  const children = household.groupedMembers?.children || [];
  if (!parents.length && !children.length) return null;

  return (
    <section className="detail-section family-tree-section">
      <h2>Family tree</h2>
      <div className="family-tree">
        {parents.length ? (
          <div className={`tree-parents tree-parents-${Math.min(parents.length, 2)}`}>
            {parents.map((member) => (
              <PersonCard key={member.id} member={member} compact />
            ))}
          </div>
        ) : null}

        {children.length ? (
          <div className="tree-children-wrap">
            <div className="tree-children-label">Children</div>
            <div className="tree-children">
              {children.map((member) => (
                <div className="tree-child" key={member.id}>
                  <PersonCard member={member} compact />
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  );
}

function personBlocks(members, heading) {
  if (!members || !members.length) return null;
  return (
    <section className="detail-section" key={heading}>
      <h2>{heading}</h2>
      <div className="person-list">
        {members.map((m) => (
          <PersonCard key={m.id} member={m} />
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

              {familyTree(selected)}
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
