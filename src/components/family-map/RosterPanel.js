"use client";

import { useEffect, useRef } from "react";

function formatRelation(relation) {
  if (!relation) return null;
  return relation.replace(/^Head of Family$/i, "Head");
}

function MemberRow({ member }) {
  const relation = formatRelation(member.relation);
  return (
    <li className="roster-panel__member">
      <span className="roster-panel__member-name">{member.firstName}</span>
      <span className="roster-panel__member-meta">
        {relation ? <span>{relation}</span> : null}
        {member.age != null ? <span>age {member.age}</span> : null}
      </span>
    </li>
  );
}

function YearCard({ record }) {
  return (
    <section className="roster-panel__year" aria-label={`${record.year} census`}>
      <header className="roster-panel__year-header">
        <h3>{record.year}</h3>
        <span className="roster-panel__year-regime">{record.regime}</span>
      </header>
      <ul className="roster-panel__members">
        {record.members.map((member, index) => (
          <MemberRow key={`${record.year}-${member.firstName}-${index}`} member={member} />
        ))}
      </ul>
      <p className="roster-panel__sources">
        {record.members.map((member, index) => (
          <a
            key={`src-${record.year}-${index}`}
            href={member.sourceRecordUrl}
            target="_blank"
            rel="noreferrer"
            className="roster-panel__source-link"
          >
            {member.firstName}
          </a>
        ))}
      </p>
    </section>
  );
}

export default function RosterPanel({ line, onClose }) {
  const closeRef = useRef(null);

  useEffect(() => {
    if (!line) return;
    const handleKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", handleKeyDown);
    const timer = setTimeout(() => closeRef.current?.focus(), 50);
    return () => {
      document.removeEventListener("keydown", handleKeyDown);
      clearTimeout(timer);
    };
  }, [line, onClose]);

  if (!line) return null;

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
            <h2 id="roster-panel-title" className="roster-panel__title">
              {line.label}
            </h2>
            <p className="roster-panel__place">
              {line.townland}
              <span className="roster-panel__place-meta">
                {line.ded ? `${line.ded}, ` : ""}Co. {line.county}
              </span>
            </p>
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
          {line.yearRecords.map((record) => (
            <YearCard key={record.year} record={record} />
          ))}
        </div>
        <footer className="roster-panel__footer">
          Links open the original record at the National Archives of Ireland.
        </footer>
      </aside>
    </>
  );
}
