import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { OverviewPage } from "@/components/pages/OverviewPage";
import { en } from "@/i18n/en";
import { pageMeta } from "@/lib/site";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = pageMeta({
  locale: "en",
  rest: "",
  title: en.meta.title,
  description: en.meta.description,
});

export default function Page() {
  return <OverviewPage data={data} locale="en" />;
}
