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

export default function FamilyMapClient({ lines }) {
  const [selectedLineId, setSelectedLineId] = useState(null);

  return (
    <FamilyMap
      lines={lines}
      selectedLineId={selectedLineId}
      onSelect={setSelectedLineId}
    />
  );
}
