import type { Metadata } from "next";
import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { zh } from "@/i18n/zh";

// The contract is the only thing crossing the boundary. It is imported at
// build time now and will be fetched from an API later; the shape, and so
// this file, does not change. See docs/adr/0007.
const data = wall as WallContract;

export const metadata: Metadata = {
  title: zh.meta.title,
  description: zh.meta.description,
};

export default function Page() {
  return <OverviewPage data={data} locale="zh" />;
}
