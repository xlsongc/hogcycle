import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { CalcPage } from "@/components/pages/CalcPage";
import { zh } from "@/i18n/zh";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = {
  title: `${zh.meta.pages.calc} · ${zh.meta.title}`,
  description: zh.calc.sub,
};

export default function Page() {
  return <CalcPage data={data} locale="zh" />;
}
