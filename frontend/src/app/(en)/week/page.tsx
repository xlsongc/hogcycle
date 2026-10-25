import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { WeekPage } from "@/components/pages/WeekPage";
import { en } from "@/i18n/en";
import { headline } from "@/lib/weekHeadline";
import { pageMeta } from "@/lib/site";

// The current week's issue; every issue also has its own address
// (week/[id]/), which is the one to share once the week is over.
const data = contract;
const latest = data.weeks?.at(-1);

export const metadata: Metadata = pageMeta({
  locale: "en",
  rest: "week/",
  title: `${en.meta.pages.week} · ${en.meta.title}`,
  description:
    (latest && headline(latest, new Map(data.panels.map((p) => [p.id, p])), "en")) ??
    en.week.metaDescription,
});

export default function Page() {
  return latest ? <WeekPage data={data} week={latest} locale="en" /> : null;
}
