"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import "leaflet/dist/leaflet.css";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import { HISTORIC_TILES, FALLBACK_TILES } from "./tile-config";
import RosterPanel from "./RosterPanel";

const MAP_CENTRE = [53.4, -8.2];
const MAP_ZOOM = 7;

function jitterCoordinate(coordinate, index) {
  if (index === 0) return coordinate;
  const offsetLat = Math.sin(index * 1.7) * 0.0035;
  const offsetLng = Math.cos(index * 1.7) * 0.0035;
  return { lat: coordinate.lat + offsetLat, lng: coordinate.lng + offsetLng };
}

function shortLabel(fullLabel) {
  if (!fullLabel) return fullLabel;
  return fullLabel.replace(/\s+line$/, "").replace(/\s+Quish$/, "");
}

function attachDisplayCoordinates(entries) {
  const byKey = new Map();
  const withCoords = entries.map((entry) => {
    if (!entry.coordinate) return entry;
    const key = `${entry.coordinate.lat.toFixed(5)}::${entry.coordinate.lng.toFixed(5)}`;
    const count = byKey.get(key) || 0;
    byKey.set(key, count + 1);
    const displayCoordinate = jitterCoordinate(entry.coordinate, count);
    return { ...entry, displayCoordinate };
  });

  const withDisplay = withCoords.filter((entry) => entry.displayCoordinate);
  if (!withDisplay.length) return withCoords;
  const centreLat =
    withDisplay.reduce((sum, entry) => sum + entry.displayCoordinate.lat, 0) /
    withDisplay.length;
  const centreLng =
    withDisplay.reduce((sum, entry) => sum + entry.displayCoordinate.lng, 0) /
    withDisplay.length;

  return withCoords.map((entry) => {
    if (!entry.displayCoordinate) return entry;
    const dLat = entry.displayCoordinate.lat - centreLat;
    const dLng = entry.displayCoordinate.lng - centreLng;
    let direction;
    if (Math.abs(dLat) > Math.abs(dLng)) {
      direction = dLat >= 0 ? "top" : "bottom";
    } else {
      direction = dLng >= 0 ? "right" : "left";
    }
    return { ...entry, labelDirection: direction };
  });
}

const LABEL_OFFSETS = {
  top: [0, -14],
  bottom: [0, 14],
  left: [-16, 0],
  right: [16, 0],
};

function createMarkerIcon({ kind = "line", selected = false } = {}) {
  const className =
    kind === "line"
      ? `family-pin${selected ? " family-pin--selected" : ""}`
      : `family-sighting${selected ? " family-sighting--selected" : ""}`;
  const innerClassName =
    kind === "line" ? "family-pin__inner" : "family-sighting__inner";

  return L.divIcon({
    className,
    html: `<span class="${innerClassName}" aria-hidden="true"></span>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
}

function FitToPins({ entries }) {
  const map = useMap();

  useEffect(() => {
    if (!entries.length) return;
    const bounds = L.latLngBounds(
      entries
        .filter((entry) => entry.displayCoordinate)
        .map((entry) => [entry.displayCoordinate.lat, entry.displayCoordinate.lng])
    );
    if (bounds.isValid()) {
      map.fitBounds(bounds, { padding: [48, 48] });
    }
  }, [entries, map]);

  return null;
}

function FocusOnEntry({ focusEntry }) {
  const map = useMap();

  useEffect(() => {
    if (!focusEntry?.displayCoordinate) return;
    const targetZoom =
      focusEntry.evidenceTier === "line"
        ? Math.max(map.getZoom(), 10)
        : Math.max(map.getZoom(), 11);
    map.flyTo(
      [focusEntry.displayCoordinate.lat, focusEntry.displayCoordinate.lng],
      targetZoom,
      { duration: 0.9 }
    );
  }, [focusEntry, map]);

  return null;
}

function labelClassName(entry) {
  return entry.evidenceTier === "line"
    ? "family-pin__label"
    : "family-sighting__label";
}

function labelText(entry) {
  if (entry.evidenceTier === "line") {
    return {
      title: shortLabel(entry.label),
      place: entry.townland,
    };
  }

  return {
    title: entry.townland,
    place: `${entry.censusYears[0]} sighting`,
  };
}

export default function FamilyMap({
  lines,
  sightings,
  selectedEntryId,
  onSelect,
}) {
  const displayEntries = useMemo(
    () => attachDisplayCoordinates([...lines, ...sightings]),
    [lines, sightings]
  );
  const [tileFailed, setTileFailed] = useState(false);
  const lineIconRef = useRef(null);
  const selectedLineIconRef = useRef(null);
  const sightingIconRef = useRef(null);
  const selectedSightingIconRef = useRef(null);

  if (!lineIconRef.current) {
    lineIconRef.current = createMarkerIcon({ kind: "line" });
  }
  if (!selectedLineIconRef.current) {
    selectedLineIconRef.current = createMarkerIcon({
      kind: "line",
      selected: true,
    });
  }
  if (!sightingIconRef.current) {
    sightingIconRef.current = createMarkerIcon({ kind: "sighting" });
  }
  if (!selectedSightingIconRef.current) {
    selectedSightingIconRef.current = createMarkerIcon({
      kind: "sighting",
      selected: true,
    });
  }

  const selectedEntry = useMemo(
    () => displayEntries.find((entry) => entry.id === selectedEntryId) || null,
    [displayEntries, selectedEntryId]
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
        <FitToPins entries={displayEntries} />
        <FocusOnEntry focusEntry={selectedEntry} />
        {displayEntries.map((entry) =>
          entry.displayCoordinate ? (
            <Marker
              key={entry.id}
              position={[entry.displayCoordinate.lat, entry.displayCoordinate.lng]}
              icon={
                entry.evidenceTier === "line"
                  ? entry.id === selectedEntryId
                    ? selectedLineIconRef.current
                    : lineIconRef.current
                  : entry.id === selectedEntryId
                    ? selectedSightingIconRef.current
                    : sightingIconRef.current
              }
              eventHandlers={{
                click: () => onSelect(entry.id === selectedEntryId ? null : entry.id),
              }}
              zIndexOffset={entry.id === selectedEntryId ? 500 : 0}
              keyboard
              alt={`${entry.label} at ${entry.townland}`}
            >
              <Tooltip
                direction={entry.labelDirection || "top"}
                offset={LABEL_OFFSETS[entry.labelDirection || "top"]}
                permanent={entry.id === selectedEntryId}
                className={labelClassName(entry)}
              >
                <span className="family-pin__label-line">
                  {labelText(entry).title}
                </span>
                <span className="family-pin__label-place">
                  {labelText(entry).place}
                </span>
              </Tooltip>
            </Marker>
          ) : null
        )}
      </MapContainer>
      <RosterPanel entry={selectedEntry} onClose={() => onSelect(null)} />
    </div>
  );
}
