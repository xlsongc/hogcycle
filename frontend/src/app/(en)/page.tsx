import type { Metadata } from "next";
import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { en } from "@/i18n/en";

// The contract is the only thing crossing the boundary. It is imported at
// build time now and will be fetched from an API later; the shape, and so
// this file, does not change. See docs/adr/0007.
const data = wall as WallContract;

export const metadata: Metadata = {
  title: en.meta.title,
  description: en.meta.description,
};

export default function Page() {
  return <OverviewPage data={data} locale="en" />;
}
