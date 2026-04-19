import Link from "next/link";
import mapData from "@/data/quish-map-data.json";
import LinesClient from "./LinesClient";
import "./lines.css";

export const metadata = {
  title: "Our linked family lines — traced through the Irish censuses",
  description:
    "Each linked Quish family line shown as it appears across the Irish censuses where continuity is accepted.",
};

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
      </header>

      <LinesClient lines={lines} />

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
