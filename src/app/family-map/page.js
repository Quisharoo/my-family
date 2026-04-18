import Link from "next/link";
import FamilyMapClient from "@/components/family-map/FamilyMapClient";
import mapData from "@/data/quish-map-data.json";
import "./family-map.css";

export const metadata = {
  title: "Quish Family Map — south Limerick, 1901–1926",
  description:
    "Six proven Quish family lines pinned on a historic map of south Limerick across the 1901, 1911, and 1926 censuses.",
};

function formatYears(years) {
  return years.join(" · ");
}

export default function FamilyMapPage() {
  const { lines } = mapData;

  return (
    <main className="map-page">
      <header className="map-page__header">
        <Link href="/" className="map-page__back" aria-label="Back to home">
          ← Back
        </Link>
        <h1 className="map-page__title">The Quishes of south Limerick</h1>
        <p className="map-page__subtitle">
          Six family lines, recorded in the censuses of 1901, 1911 and 1926.
          Each pin is a household that stayed in the same townland across the
          years covered.
        </p>
      </header>

      <FamilyMapClient lines={lines} />

      <section className="map-page__fallback" aria-label="All family lines">
        <h2>The six lines</h2>
        <ul className="map-page__lines">
          {lines.map((line) => (
            <li key={line.id}>
              <strong>{line.label}</strong> — {line.townland},{" "}
              {line.ded ? `${line.ded}, ` : ""}Co. {line.county} ·{" "}
              <span className="muted">{formatYears(line.censusYears)}</span>
            </li>
          ))}
        </ul>
      </section>

      <footer className="map-page__footer">
        <p>
          Based on Irish census records held by the National Archives of
          Ireland. Pins show where census evidence confirms the household
          persisted; this is a record of place and continuity, not a claim of
          family parentage.
        </p>
      </footer>
    </main>
  );
}
