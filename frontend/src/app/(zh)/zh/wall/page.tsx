import type { Metadata } from "next";
import wall from "@/data/wall.json";
import type { WallContract } from "@/types/generated/wall";
import { WallPage } from "@/components/pages/WallPage";
import { zh } from "@/i18n/zh";

// The contract is the only thing crossing the boundary. It is imported at
// build time now and will be fetched from an API later; the shape, and so
// this file, does not change. See docs/adr/0007.
const data = wall as WallContract;

export const metadata: Metadata = {
  title: `${zh.meta.pages.wall} · ${zh.meta.title}`,
  description: zh.meta.description,
};

export default function Page() {
  return <WallPage data={data} locale="zh" />;
}
