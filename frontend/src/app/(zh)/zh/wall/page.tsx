import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { WallPage } from "@/components/pages/WallPage";
import { zh } from "@/i18n/zh";
import { pageMeta } from "@/lib/site";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = pageMeta({
  locale: "zh",
  rest: "wall/",
  title: `${zh.meta.pages.wall} · ${zh.meta.title}`,
  description: zh.meta.description,
});

export default function Page() {
  return <WallPage data={data} locale="zh" />;
}
