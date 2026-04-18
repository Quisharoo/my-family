"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import { HISTORIC_TILES, FALLBACK_TILES } from "./tile-config";
import RosterPanel from "./RosterPanel";

const MAP_CENTRE = [52.42, -8.39];
const MAP_ZOOM = 11;

function jitterCoordinate(coordinate, index) {
  if (index === 0) return coordinate;
  const offsetLat = Math.sin(index * 1.7) * 0.001;
  const offsetLng = Math.cos(index * 1.7) * 0.001;
  return { lat: coordinate.lat + offsetLat, lng: coordinate.lng + offsetLng };
}

function attachDisplayCoordinates(lines) {
  const byKey = new Map();
  return lines.map((line) => {
    if (!line.coordinate) return line;
    const key = `${line.coordinate.lat.toFixed(5)}::${line.coordinate.lng.toFixed(5)}`;
    const count = byKey.get(key) || 0;
    byKey.set(key, count + 1);
    const displayCoordinate = jitterCoordinate(line.coordinate, count);
    return { ...line, displayCoordinate };
  });
}

function createPinIcon() {
  return L.divIcon({
    className: "family-pin",
    html: '<span class="family-pin__inner" aria-hidden="true"></span>',
    iconSize: [28, 28],
    iconAnchor: [14, 14],
  });
}

function FitToPins({ lines }) {
  const map = useMap();
  useEffect(() => {
    if (!lines.length) return;
    const bounds = L.latLngBounds(
      lines
        .filter((line) => line.displayCoordinate)
        .map((line) => [line.displayCoordinate.lat, line.displayCoordinate.lng])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [lines, map]);
  return null;
}

export default function FamilyMap({ lines }) {
  const displayLines = useMemo(() => attachDisplayCoordinates(lines), [lines]);
  const [selectedLineId, setSelectedLineId] = useState(null);
  const [tileFailed, setTileFailed] = useState(false);
  const iconRef = useRef(null);
  if (!iconRef.current) {
    iconRef.current = createPinIcon();
  }

  const selectedLine = useMemo(
    () => displayLines.find((line) => line.id === selectedLineId) || null,
    [displayLines, selectedLineId]
  );

  const tileConfig = tileFailed ? FALLBACK_TILES : HISTORIC_TILES;

  return (
    <div className="family-map">
      <MapContainer
        center={MAP_CENTRE}
        zoom={MAP_ZOOM}
        minZoom={tileConfig.minZoom}
        maxZoom={tileConfig.maxZoom}
        scrollWheelZoom
        className="family-map__canvas"
        attributionControl
      >
        <TileLayer
          url={tileConfig.url}
          attribution={tileConfig.attribution}
          maxZoom={tileConfig.maxZoom}
          minZoom={tileConfig.minZoom}
          eventHandlers={{
            tileerror: () => {
              if (!tileFailed) setTileFailed(true);
            },
          }}
        />
        <FitToPins lines={displayLines} />
        {displayLines.map((line) =>
          line.displayCoordinate ? (
            <Marker
              key={line.id}
              position={[line.displayCoordinate.lat, line.displayCoordinate.lng]}
              icon={iconRef.current}
              eventHandlers={{ click: () => setSelectedLineId(line.id) }}
              keyboard
              alt={`${line.label} at ${line.townland}`}
            />
          ) : null
        )}
      </MapContainer>
      <RosterPanel line={selectedLine} onClose={() => setSelectedLineId(null)} />
    </div>
  );
}
