import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { Wall } from "@/components/Wall";

const data = wall as WallContract;

export default function Page() {
  return <Wall data={data} locale="zh" />;
}
