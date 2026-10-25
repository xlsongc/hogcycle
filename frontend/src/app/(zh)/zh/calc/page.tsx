import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { CalcPage } from "@/components/pages/CalcPage";
import { zh } from "@/i18n/zh";
import { pageMeta } from "@/lib/site";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = pageMeta({
  locale: "zh",
  rest: "calc/",
  title: `${zh.meta.pages.calc} · ${zh.meta.title}`,
  description: zh.calc.sub,
});

export default function Page() {
  return <CalcPage data={data} locale="zh" />;
}
