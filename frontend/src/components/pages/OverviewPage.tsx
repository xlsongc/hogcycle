/**
 * The front page: where the cycle stands, in the order a reader needs it.
 *
 *   1. the instrument header — the handful of readings that matter most
 *   2. the thesis — capacity shifted by the biological lag, above price
 *   3. what the numbers say — computed facts, never a phase call
 *   4. every reading — one scannable table, each row a door to the wall
 *
 * A server component: it slices the contract down to what each part draws,
 * so the client components here receive two panels rather than all of them.
 */

import type { WallContract } from "@/types/generated/wall";
import { Hud } from "@/components/hud/Hud";
import { SCALE_OF } from "@/components/hud/ids";
import { ThesisChart } from "@/components/overview/ThesisChart";
import { Highlights } from "@/components/overview/Highlights";
import { ReadingsTable } from "@/components/overview/ReadingsTable";
import type { Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

const CAPACITY = "sow_inventory";
// 行情宝 platform transactions: the deepest hog-price series (2015-), and
// the one the cycle is positioned against (config/sources.yaml).
const PRICE = "hog_price_index";

export function OverviewPage({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale);
  const cycle = data.readings.filter((r) => r.in_wall !== false);
  const capacity = data.panels.find((p) => p.id === CAPACITY);
  const price = data.panels.find((p) => p.id === PRICE);
  const end = data.window.end ?? data.generated_at.slice(0, 10);
  const header = { ...data, panels: data.panels.filter((p) => p.id === SCALE_OF) };

  return (
    <main className="wrap">
      <h1 className="sr-only">{t.meta.title}</h1>
      <Hud data={header} seriesCount={data.panels.length} locale={locale} />

      {capacity && price && (
        <section aria-labelledby="thesis-h">
          <h2 className="section" id="thesis-h">
            {t.overview.thesisHeading}
          </h2>
          <p className="section-note">{t.overview.thesisNote}</p>
          <ThesisChart capacity={capacity} price={price} end={end} locale={locale} />
        </section>
      )}

      <Highlights
        readings={cycle}
        panels={data.panels.filter((p) => p.threshold)}
        generatedAt={data.generated_at}
        locale={locale}
      />
      <ReadingsTable readings={cycle} locale={locale} />
    </main>
  );
}
