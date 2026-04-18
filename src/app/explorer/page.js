import FamilyExplorer from "@/components/family-explorer";
import { getQuishData } from "@/lib/quish-data";

export const metadata = {
  title: "Quish household records — 1901 & 1911",
  description:
    "Search the full set of Quish household records from the 1901 and 1911 Irish censuses.",
};

export default function ExplorerPage() {
  return <FamilyExplorer data={getQuishData()} />;
}
