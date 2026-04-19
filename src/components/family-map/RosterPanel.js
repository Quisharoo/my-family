"use client";

import { useEffect, useRef } from "react";
import { formatRegime, formatRelation } from "./format";
import { formatLineDisplay } from "@/lib/family-line-utils.mjs";

function MemberRow({ member }) {
  const relation = formatRelation(member.relation);
  const details = [];
  if (relation) details.push(relation);
  if (member.age != null) details.push(`age ${member.age}`);

  return (
    <li className="roster-panel__member">
      <a
        href={member.sourceRecordUrl}
        target="_blank"
        rel="noreferrer"
        className="roster-panel__member-link"
        aria-label={`View ${member.firstName}'s original record at the National Archives of Ireland`}
      >
        <span className="roster-panel__member-name">{member.firstName}</span>
        {details.length ? (
          <span className="roster-panel__member-meta">{details.join(" · ")}</span>
        ) : null}
        {member.occupation ? (
          <span className="roster-panel__member-note">{member.occupation}</span>
        ) : null}
        {member.birthplace ? (
          <span className="roster-panel__member-note muted">
            Born in Co. {member.birthplace}
          </span>
        ) : null}
        <span className="roster-panel__member-arrow" aria-hidden="true">
          ↗
        </span>
      </a>
    </li>
  );
}

function YearCard({ record }) {
  return (
    <section className="roster-panel__year" aria-label={`${record.year} census`}>
      <header className="roster-panel__year-header">
        <h3>{record.year}</h3>
        <span className="roster-panel__year-regime">
          {formatRegime(record.regime)}
        </span>
      </header>
      <ul className="roster-panel__members">
        {record.members.map((member, index) => (
          <MemberRow key={`${record.year}-${member.firstName}-${index}`} member={member} />
        ))}
      </ul>
    </section>
  );
}

function evidenceLabel(entry) {
  if (entry.evidenceTier === "line") {
    return entry.evidenceStatus === "three-census"
      ? "Linked across three censuses"
      : "Linked across two censuses";
  }
  return "Single recorded household";
}

export default function RosterPanel({ entry, onClose }) {
  const closeRef = useRef(null);
  const display = entry ? formatLineDisplay(entry) : null;

  useEffect(() => {
    if (!entry) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [entry, onClose]);

  if (!entry) return null;

  return (
    <>
      <div className="roster-panel__backdrop" onClick={onClose} aria-hidden="true" />
      <aside
        className="roster-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="roster-panel-title"
      >
        <header className="roster-panel__header">
          <div>
            <p className="roster-panel__eyebrow">{evidenceLabel(entry)}</p>
            <h2 id="roster-panel-title" className="roster-panel__title">
              {display.title}
            </h2>
            <p className="roster-panel__place">{display.place}</p>
            <p className="roster-panel__place-meta">{display.meta}</p>
          </div>
          <button
            ref={closeRef}
            type="button"
            className="roster-panel__close"
            onClick={onClose}
            aria-label="Close household"
          >
            ×
          </button>
        </header>
        <div className="roster-panel__body">
          {entry.yearRecords.map((record) => (
            <YearCard key={record.year} record={record} />
          ))}
        </div>
        <footer className="roster-panel__footer">
          {entry.evidenceTier === "line"
            ? "Each name links to the original record at the National Archives of Ireland."
            : "This household is recorded in one census only; use the explorer for broader comparison across all sightings."}
        </footer>
      </aside>
    </>
  );
}
