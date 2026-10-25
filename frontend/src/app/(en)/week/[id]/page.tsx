import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { WeekPage } from "@/components/pages/WeekPage";
import { en } from "@/i18n/en";
import { pageMeta } from "@/lib/site";
import { weekNumber } from "@/lib/week";
import { headline } from "@/lib/weekHeadline";

// One page per week, prerendered: the static export cannot render a path it
// did not generate, so a week outside the contract is a 404. The id is
// lower-case in the address (2026-w43) and upper-case in the contract.
const data = contract;
const weeks = data.weeks ?? [];

export const dynamicParams = false;

export function generateStaticParams() {
  return weeks.map((w) => ({ id: w.id.toLowerCase() }));
}

type Params = { params: Promise<{ id: string }> };

const find = (id: string) => weeks.find((w) => w.id.toLowerCase() === id);

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const week = find((await params).id);
  if (!week) return {};
  const { year, n } = weekNumber(week.id);
  return pageMeta({
    locale: "en",
    rest: `week/${week.id.toLowerCase()}/`,
    title: `${en.week.metaTitle(year, n)} · ${en.meta.title}`,
    description:
      headline(week, new Map(data.panels.map((p) => [p.id, p])), "en") ?? en.week.metaDescription,
  });
}

export default async function Page({ params }: Params) {
  const week = find((await params).id);
  return week ? <WeekPage data={data} week={week} locale="en" /> : null;
}
