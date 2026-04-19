import Link from "next/link";
import FamilyMapClient from "@/components/family-map/FamilyMapClient";
import PrintRosters from "@/components/family-map/PrintRosters";
import mapData from "@/data/quish-map-data.json";
import "./home.css";

export const metadata = {
  title: "The Quishes of Ireland — 1901 to 1926",
  description:
    "Linked Quish family lines and other recorded households shown across the island of Ireland in the 1901, 1911 and 1926 censuses.",
};

export default function HomePage() {
  const { lines, sightings, lineCount, sightingCount } = mapData;

  return (
    <main className="map-page">
      <header className="map-page__header">
        <h1 className="map-page__title">The Quishes of Ireland</h1>
        <p className="map-page__subtitle">
          An island-wide view of linked Quish family lines, with lighter marks
          for single recorded households. The evidence is richest in Limerick,
          but the story reaches beyond it.
        </p>
        <div className="map-page__stats" aria-label="Map summary">
          <p className="map-page__stat">
            <strong>{lineCount}</strong> linked family lines
          </p>
          <p className="map-page__stat">
            <strong>{sightingCount}</strong> isolated sightings
          </p>
        </div>
        <p className="map-page__hint">Tap a marker to focus the place and open the roster.</p>
      </header>

      <FamilyMapClient lines={lines} sightings={sightings} />

      <PrintRosters lines={lines} />

      <footer className="map-page__footer">
        <p>
          Based on Irish census records held by the National Archives of
          Ireland. Linked lines show accepted cross-census continuity; lighter
          markers show one-census sightings. This is a record of place and
          continuity, not a claim of family parentage.
        </p>
        <p className="map-page__footer-link">
          <Link href="/lines">Trace each line through the censuses →</Link>
        </p>
        <p className="map-page__footer-link muted">
          <Link href="/explorer">Search every recorded Quish household</Link>
        </p>
      </footer>
    </main>
  );
}
