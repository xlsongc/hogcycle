import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { Wall } from "@/components/Wall";

// The contract is the only thing crossing the boundary. It is imported at
// build time now and will be fetched from an API later; the shape, and so
// this file, does not change. See docs/adr/0007.
const data = wall as WallContract;

export default function Page() {
  return <Wall data={data} locale="en" />;
}
