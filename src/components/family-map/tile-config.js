export const HISTORIC_TILES = {
  url: "https://mapseries-tilesets.s3.amazonaws.com/ireland/gsgs4136/{z}/{x}/{-y}.png",
  attribution:
    '<a href="https://maps.nls.uk/os/" target="_blank" rel="noreferrer">Historic map: Courtesy of the National Library of Scotland</a> (GSGS 4136, 1941–43)',
  maxZoom: 15,
  minZoom: 7,
};

export const FALLBACK_TILES = {
  url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> contributors',
  maxZoom: 18,
  minZoom: 0,
};
