"use client";

import dynamic from "next/dynamic";

const FamilyMap = dynamic(() => import("./FamilyMap"), {
  ssr: false,
  loading: () => (
    <div className="family-map__placeholder" aria-hidden="true">
      Loading map…
    </div>
  ),
});

export default function FamilyMapClient({ lines }) {
  return <FamilyMap lines={lines} />;
}
