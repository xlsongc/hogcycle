import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { WallPage } from "@/components/pages/WallPage";
import { en } from "@/i18n/en";

// The contract is the only thing crossing the boundary, loaded and checked
// in one place (lib/contract.ts; docs/adr/0007, 0024).
const data = contract;

export const metadata: Metadata = {
  title: `${en.meta.pages.wall} · ${en.meta.title}`,
  description: en.meta.description,
};

export default function Page() {
  return <WallPage data={data} locale="en" />;
}
