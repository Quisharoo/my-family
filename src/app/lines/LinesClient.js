"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatRegime, formatRelation } from "@/components/family-map/format";
import {
  buildCountyOptions,
  buildEvidenceOptions,
  formatLineDisplay,
  filterEntriesByEvidence,
  filterEntriesByCounty,
  groupEntriesByCounty,
} from "@/lib/family-line-utils.mjs";

function useIsMobile(breakpoint = 779) {
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${breakpoint}px)`);
    const update = () => setIsMobile(mediaQuery.matches);
    update();
    mediaQuery.addEventListener("change", update);
    return () => mediaQuery.removeEventListener("change", update);
  }, [breakpoint]);

  return isMobile;
}

function MemberRow({ member }) {
  const relation = formatRelation(member.relation);
  const meta = [];
  if (relation) meta.push(relation);
  if (member.age != null) meta.push(`age ${member.age}`);
  const extras = [];
  if (member.occupation) extras.push(member.occupation);
  if (member.birthplace) extras.push(`born in Co. ${member.birthplace}`);

  return (
    <a
      className="line-member"
      href={member.sourceRecordUrl}
      target="_blank"
      rel="noreferrer"
      aria-label={`View ${member.firstName}'s original record at the National Archives of Ireland`}
    >
      <span className="line-member__name">{member.firstName}</span>
      {meta.length ? (
        <span className="line-member__meta">{meta.join(" · ")}</span>
      ) : null}
      {extras.length ? (
        <span className="line-member__note">{extras.join("; ")}</span>
      ) : null}
      <span className="line-member__arrow" aria-hidden="true">
        ↗
      </span>
    </a>
  );
}

function CensusCard({ record }) {
  return (
    <article className="line-census" aria-label={`${record.year} census`}>
      <header className="line-census__header">
        <div>
          <h3>{record.year}</h3>
          <span className="line-census__regime">{formatRegime(record.regime)}</span>
        </div>
        <span className="line-census__count">
          {record.memberCount} {record.memberCount === 1 ? "person" : "people"}
        </span>
      </header>
      <div className="line-census__members">
        {record.members.map((member, index) => (
          <MemberRow
            key={`${record.year}-${member.firstName}-${index}`}
            member={member}
          />
        ))}
      </div>
    </article>
  );
}

function LineSection({ line, setRef }) {
  const display = formatLineDisplay(line);

  return (
    <section
      id={line.id}
      ref={(node) => setRef(line.id, node)}
      className="line-section"
      aria-labelledby={`${line.id}-heading`}
    >
      <header className="line-section__header">
        <h2 id={`${line.id}-heading`} className="line-section__title">
          {display.title}
        </h2>
        <p className="line-section__place">
          {display.place}
          <span className="line-section__years muted"> · {display.meta}</span>
          <span className="line-section__years muted">
            {" "}
            · {line.censusYears.join(" · ")}
          </span>
        </p>
        <p className="line-section__kind">
          {line.evidenceTier === "line" ? "Linked line" : "Single household"}
        </p>
      </header>
      <div className="line-section__timeline">
        {line.yearRecords.map((record) => (
          <CensusCard key={record.year} record={record} />
        ))}
      </div>
    </section>
  );
}

function MobileSheet({ line, onClose }) {
  const closeRef = useRef(null);
  const display = line ? formatLineDisplay(line) : null;

  useEffect(() => {
    if (!line) return;
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKeyDown);
    const timer = setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      clearTimeout(timer);
    };
  }, [line, onClose]);

  if (!line) return null;

  return (
    <>
      <div className="line-sheet__backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="line-sheet"
        role="dialog"
        aria-modal="true"
        aria-labelledby="line-sheet-title"
      >
        <div className="line-sheet__handle" aria-hidden="true" />
        <header className="line-sheet__header">
          <div>
            <p className="line-sheet__eyebrow">
              {line.evidenceTier === "line" ? "Linked household" : "Single recorded household"}
            </p>
            <h2 id="line-sheet-title" className="line-sheet__title">
              {display.title}
            </h2>
            <p className="line-sheet__place">{display.place}</p>
            <p className="line-sheet__meta">{display.meta}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="line-sheet__close"
            onClick={onClose}
            aria-label="Close line details"
          >
            ×
          </button>
        </header>
        <div className="line-sheet__body">
          <div className="line-section__timeline">
            {line.yearRecords.map((record) => (
              <CensusCard key={record.year} record={record} />
            ))}
          </div>
        </div>
      </aside>
    </>
  );
}

export default function LinesClient({ lines }) {
  const isMobile = useIsMobile();
  const evidenceOptions = useMemo(() => buildEvidenceOptions(), []);
  const [selectedEvidence, setSelectedEvidence] = useState("all");
  const [selectedCounty, setSelectedCounty] = useState("All");
  const [selectedLineId, setSelectedLineId] = useState(null);
  const lineRefs = useRef(new Map());

  const evidenceFiltered = useMemo(
    () => filterEntriesByEvidence(lines, selectedEvidence),
    [lines, selectedEvidence]
  );
  const countyCounts = useMemo(
    () => groupEntriesByCounty(evidenceFiltered),
    [evidenceFiltered]
  );
  const countyOptions = useMemo(
    () => buildCountyOptions(evidenceFiltered),
    [evidenceFiltered]
  );
  const filteredLines = useMemo(
    () => filterEntriesByCounty(evidenceFiltered, selectedCounty),
    [evidenceFiltered, selectedCounty]
  );

  const selectedLine = useMemo(
    () => filteredLines.find((line) => line.id === selectedLineId) || null,
    [filteredLines, selectedLineId]
  );

  useEffect(() => {
    if (!selectedLineId) return;
    const stillVisible = filteredLines.some((line) => line.id === selectedLineId);
    if (!stillVisible) setSelectedLineId(null);
  }, [filteredLines, selectedLineId]);

  useEffect(() => {
    if (!countyOptions.includes(selectedCounty)) {
      setSelectedCounty("All");
    }
  }, [countyOptions, selectedCounty]);

  function setLineRef(id, node) {
    if (!node) {
      lineRefs.current.delete(id);
      return;
    }
    lineRefs.current.set(id, node);
  }

  function handleLineSelect(line) {
    setSelectedLineId(line.id);
    if (isMobile) return;
    lineRefs.current.get(line.id)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
  }

  return (
    <>
      <div className="lines-page__filters" aria-label="Filter households by evidence">
        {evidenceOptions.map((option) => (
          <button
            key={option.value}
            type="button"
            className={`lines-page__filter-chip${
              option.value === selectedEvidence ? " lines-page__filter-chip--active" : ""
            }`}
            onClick={() => setSelectedEvidence(option.value)}
            aria-pressed={option.value === selectedEvidence}
          >
            <span>{option.label}</span>
            <span className="lines-page__filter-count">
              {option.value === "all"
                ? lines.length
                : lines.filter((entry) => entry.evidenceTier === option.value).length}
            </span>
          </button>
        ))}
      </div>

      <div className="lines-page__filters" aria-label="Filter lines by county">
        {countyOptions.map((county) => (
          <button
            key={county}
            type="button"
            className={`lines-page__filter-chip${
              county === selectedCounty ? " lines-page__filter-chip--active" : ""
            }`}
            onClick={() => setSelectedCounty(county)}
            aria-pressed={county === selectedCounty}
          >
            <span>{county}</span>
            <span className="lines-page__filter-count">
              {county === "All" ? evidenceFiltered.length : countyCounts[county]}
            </span>
          </button>
        ))}
      </div>

      <nav className="lines-page__toc" aria-label="Choose a household">
        {filteredLines.map((line) => {
          const display = formatLineDisplay(line);
          return (
          <button
            key={line.id}
            type="button"
            className={`lines-page__toc-item${
              line.id === selectedLineId ? " lines-page__toc-item--active" : ""
            }`}
            onClick={() => handleLineSelect(line)}
          >
            <span className="lines-page__toc-copy">
              <span className="lines-page__toc-name">{display.title}</span>
              <span className="lines-page__toc-place">{display.place}</span>
              <span className="lines-page__toc-meta">{display.meta}</span>
              <span className="lines-page__toc-kind">
                {line.evidenceTier === "line" ? "Linked line" : "Single household"}
              </span>
            </span>
            <span className="lines-page__toc-arrow" aria-hidden="true">
              →
            </span>
          </button>
          );
        })}
      </nav>

      <div className="lines-page__body">
        {filteredLines.map((line) => (
          <LineSection key={line.id} line={line} setRef={setLineRef} />
        ))}
      </div>

      <MobileSheet
        line={isMobile ? selectedLine : null}
        onClose={() => setSelectedLineId(null)}
      />
    </>
  );
}
