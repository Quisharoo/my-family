import { notFound } from "next/navigation";
import FamilyExplorer from "@/components/family-explorer";
import { getClusterBySlug, getQuishData } from "@/lib/quish-data";

export function generateStaticParams() {
  return getQuishData().clusters.map((cluster) => ({
    slug: cluster.slug,
  }));
}

export async function generateMetadata({ params }) {
  const { slug } = await params;
  const cluster = getClusterBySlug(slug);

  if (!cluster) {
    return {};
  }

  return {
    title: cluster.familyLabel,
    description: `${cluster.description}. Shareable Quish family explorer route for ${cluster.placeLabel}.`,
  };
}

export default async function ClusterPage({ params }) {
  const { slug } = await params;
  const cluster = getClusterBySlug(slug);

  if (!cluster) {
    notFound();
  }

  return <FamilyExplorer data={getQuishData()} initialSlug={cluster.slug} />;
}
