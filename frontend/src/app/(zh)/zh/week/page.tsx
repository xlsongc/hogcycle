import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { WeekPage } from "@/components/pages/WeekPage";
import { zh } from "@/i18n/zh";
import { headline } from "@/lib/weekHeadline";
import { pageMeta } from "@/lib/site";

// The current week's issue; every issue also has its own address
// (week/[id]/), which is the one to share once the week is over.
const data = contract;
const latest = data.weeks?.at(-1);

export const metadata: Metadata = pageMeta({
  locale: "zh",
  rest: "week/",
  title: `${zh.meta.pages.week} · ${zh.meta.title}`,
  description:
    (latest && headline(latest, new Map(data.panels.map((p) => [p.id, p])), "zh")) ??
    zh.week.metaDescription,
});

export default function Page() {
  return latest ? <WeekPage data={data} week={latest} locale="zh" /> : null;
}
