import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { DatasetsPage } from "@/components/pages/DatasetsPage";
import { en } from "@/i18n/en";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = {
  title: `${en.meta.pages.datasets} · ${en.meta.title}`,
  description: en.datasets.sub,
};

export default function Page() {
  return <DatasetsPage data={data} locale="en" />;
}
