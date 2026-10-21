import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { CalcPage } from "@/components/pages/CalcPage";
import { en } from "@/i18n/en";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = {
  title: `${en.meta.pages.calc} · ${en.meta.title}`,
  description: en.calc.sub,
};

export default function Page() {
  return <CalcPage data={data} locale="en" />;
}
