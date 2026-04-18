"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import {
  MapContainer,
  TileLayer,
  Marker,
  Tooltip,
  useMap,
} from "react-leaflet";
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

function createPinIcon({ selected = false } = {}) {
  return L.divIcon({
    className: `family-pin${selected ? " family-pin--selected" : ""}`,
    html: '<span class="family-pin__inner" aria-hidden="true"></span>',
    iconSize: [32, 32],
    iconAnchor: [16, 16],
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
      map.fitBounds(bounds, { padding: [72, 96] });
    }
  }, [lines, map]);
  return null;
}

function FocusOnLine({ focusLine }) {
  const map = useMap();
  useEffect(() => {
    if (!focusLine?.displayCoordinate) return;
    map.flyTo(
      [focusLine.displayCoordinate.lat, focusLine.displayCoordinate.lng],
      Math.max(map.getZoom(), 13),
      { duration: 0.9 }
    );
  }, [focusLine, map]);
  return null;
}

export default function FamilyMap({ lines, selectedLineId, onSelect }) {
  const displayLines = useMemo(() => attachDisplayCoordinates(lines), [lines]);
  const [tileFailed, setTileFailed] = useState(false);
  const normalIconRef = useRef(null);
  const selectedIconRef = useRef(null);
  if (!normalIconRef.current) normalIconRef.current = createPinIcon();
  if (!selectedIconRef.current)
    selectedIconRef.current = createPinIcon({ selected: true });

  const selectedLine = useMemo(
    () => displayLines.find((line) => line.id === selectedLineId) || null,
    [displayLines, selectedLineId]
  );

  const tileConfig = tileFailed ? FALLBACK_TILES : HISTORIC_TILES;
  const tileOpacity = tileFailed ? 1 : 0.88;

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
          opacity={tileOpacity}
          eventHandlers={{
            tileerror: () => {
              if (!tileFailed) setTileFailed(true);
            },
          }}
        />
        <FitToPins lines={displayLines} />
        <FocusOnLine focusLine={selectedLine} />
        {displayLines.map((line) =>
          line.displayCoordinate ? (
            <Marker
              key={line.id}
              position={[line.displayCoordinate.lat, line.displayCoordinate.lng]}
              icon={
                line.id === selectedLineId
                  ? selectedIconRef.current
                  : normalIconRef.current
              }
              eventHandlers={{ click: () => onSelect(line.id) }}
              keyboard
              alt={`${line.label} at ${line.townland}`}
            >
              <Tooltip
                direction="top"
                offset={[0, -14]}
                permanent
                className="family-pin__label"
              >
                {line.townland}
              </Tooltip>
            </Marker>
          ) : null
        )}
      </MapContainer>
      <RosterPanel line={selectedLine} onClose={() => onSelect(null)} />
    </div>
  );
}
