import Link from "next/link";
import mapData from "@/data/quish-map-data.json";
import { formatRegime, formatRelation } from "@/components/family-map/format";
import "./lines.css";

export const metadata = {
  title: "Our linked family lines — traced through the Irish censuses",
  description:
    "Each linked Quish family line shown as it appears across the Irish censuses where continuity is accepted.",
};

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

function LineSection({ line }) {
  return (
    <section
      id={line.id}
      className="line-section"
      aria-labelledby={`${line.id}-heading`}
    >
      <header className="line-section__header">
        <h2 id={`${line.id}-heading`} className="line-section__title">
          {line.label}
        </h2>
        <p className="line-section__place">
          {line.townland}
          {line.ded ? `, ${line.ded}` : ""}, Co. {line.county}
          <span className="line-section__years muted">
            {" "}
            · {line.censusYears.join(" · ")}
          </span>
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

export default function LinesPage() {
  const { lines } = mapData;

  return (
    <main className="lines-page">
      <header className="lines-page__header">
        <Link href="/" className="lines-page__back" aria-label="Back to map">
          ← Back to the map
        </Link>
        <h1 className="lines-page__title">Our family lines</h1>
        <p className="lines-page__subtitle">
          Each linked household traced through the censuses where continuity is
          accepted. Every name links to the original record at the National
          Archives of Ireland.
        </p>
        <nav className="lines-page__toc" aria-label="Jump to a line">
          {lines.map((line) => (
            <a key={line.id} href={`#${line.id}`}>
              {line.label}{" "}
              <span className="muted">· {line.townland}</span>
            </a>
          ))}
        </nav>
      </header>

      <div className="lines-page__body">
        {lines.map((line) => (
          <LineSection key={line.id} line={line} />
        ))}
      </div>

      <footer className="lines-page__footer">
        <p>
          Based on Irish census records held by the National Archives of
          Ireland. Households are grouped by place and name continuity across
          censuses; this is not a claim of family parentage.
        </p>
        <p>
          <Link href="/explorer">Search all recorded Quish households →</Link>
        </p>
      </footer>
    </main>
  );
}
