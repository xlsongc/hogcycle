import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { DatasetsPage } from "@/components/pages/DatasetsPage";
import { zh } from "@/i18n/zh";
import { pageMeta } from "@/lib/site";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = pageMeta({
  locale: "zh",
  rest: "datasets/",
  title: `${zh.meta.pages.datasets} · ${zh.meta.title}`,
  description: zh.datasets.sub,
});

export default function Page() {
  return <DatasetsPage data={data} locale="zh" />;
}
