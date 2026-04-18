"use client";

import dynamic from "next/dynamic";
import { useState } from "react";

const FamilyMap = dynamic(() => import("./FamilyMap"), {
  ssr: false,
  loading: () => (
    <div className="family-map__placeholder" aria-hidden="true">
      Loading map…
    </div>
  ),
});

function formatYears(years) {
  return years.join(" · ");
}

export default function FamilyMapClient({ lines }) {
  const [selectedLineId, setSelectedLineId] = useState(null);

  return (
    <>
      <FamilyMap
        lines={lines}
        selectedLineId={selectedLineId}
        onSelect={setSelectedLineId}
      />

      <section className="map-page__fallback" aria-label="Our family lines">
        <h2>Our family lines</h2>
        <p className="map-page__fallback-hint">
          Tap a name to find them on the map.
        </p>
        <ul className="map-page__lines">
          {lines.map((line) => {
            const isSelected = line.id === selectedLineId;
            return (
              <li key={line.id}>
                <button
                  type="button"
                  className={`map-page__line${
                    isSelected ? " map-page__line--selected" : ""
                  }`}
                  onClick={() => setSelectedLineId(line.id)}
                >
                  <span className="map-page__line-title">{line.label}</span>
                  <span className="map-page__line-place">
                    {line.townland}
                    {line.ded ? `, ${line.ded}` : ""}, Co. {line.county}
                  </span>
                  <span className="map-page__line-years muted">
                    {formatYears(line.censusYears)}
                  </span>
                </button>
              </li>
            );
          })}
        </ul>
      </section>
    </>
  );
}
