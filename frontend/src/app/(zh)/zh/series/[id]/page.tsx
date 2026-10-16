import type { Metadata } from "next";
import { contract } from "@/lib/contract";
import { SeriesPage } from "@/components/pages/SeriesPage";
import { nameOf } from "@/i18n/locale";
import { zh } from "@/i18n/zh";

// One page per series, prerendered at build time: the static export cannot
// render a path it did not generate, so an id outside the contract is a 404.
const data = contract;

export const dynamicParams = false;

export function generateStaticParams() {
  return data.panels.map((p) => ({ id: p.id }));
}

type Params = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { id } = await params;
  const panel = data.panels.find((p) => p.id === id);
  if (!panel) return {};
  return {
    title: `${nameOf(panel, "zh")} · ${zh.meta.title}`,
    description: panel.about?.about_zh ?? zh.meta.description,
  };
}

export default async function Page({ params }: Params) {
  const { id } = await params;
  const panel = data.panels.find((p) => p.id === id);
  if (!panel) return null;
  const byId = (other: string | null | undefined) => data.panels.find((p) => p.id === other);
  return (
    <SeriesPage
      panel={panel}
      earlier={byId(panel.caliber?.earlier)}
      later={byId(panel.caliber?.later)}
      reading={data.readings.find((r) => r.id === id)}
      start={data.window.start ?? "2015-01-01"}
      end={data.window.end ?? data.generated_at.slice(0, 10)}
      today={data.generated_at.slice(0, 10)}
      locale="zh"
    />
  );
}
