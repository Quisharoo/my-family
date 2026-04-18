import Link from "next/link";
import FamilyMapClient from "@/components/family-map/FamilyMapClient";
import PrintRosters from "@/components/family-map/PrintRosters";
import mapData from "@/data/quish-map-data.json";
import "./family-map.css";

export const metadata = {
  title: "Quish Family Map — south Limerick, 1901–1926",
  description:
    "Our family lines pinned on a historic map of south Limerick across the 1901, 1911 and 1926 censuses.",
};

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
          Our family lines, recorded in the censuses of 1901, 1911 and 1926.
          Each pin marks a household that stayed in the same townland across
          the years covered.
        </p>
        <p className="map-page__hint">Tap a pin to see the household.</p>
      </header>

      <FamilyMapClient lines={lines} />

      <PrintRosters lines={lines} />

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
