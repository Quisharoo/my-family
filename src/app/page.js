import FamilyExplorer from "@/components/family-explorer";
import { getQuishData } from "@/lib/quish-data";

export default function Page() {
  return <FamilyExplorer data={getQuishData()} />;
}
