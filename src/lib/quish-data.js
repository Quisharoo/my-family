import quishData from "@/data/quish-viz-data.json";

export function getQuishData() {
  return quishData;
}

export function getClusterBySlug(slug) {
  return quishData.clusters.find((cluster) => cluster.slug === slug) || null;
}
