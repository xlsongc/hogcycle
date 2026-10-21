/**
 * The front page: where the cycle stands, in the order a reader needs it.
 *
 *   1. three readings in causal order — capacity, price, margin — each with
 *      its direction, how unusual it is, and how old it is
 *   2. the thesis — capacity shifted by the biological lag, above price,
 *      placed either at the period it describes or the day it was published
 *   3. what was published lately, beside the computed facts worth noting
 *   4. every reading — one scannable table, each row a door to the wall
 *
 * A server component: it slices the contract down to what each part draws,
 * so the client components here receive two panels rather than all of them.
 */

import type { Panel, Reading, WallContract } from "@/types/generated/wall";
import { Signals, type Role, type Signal } from "@/components/overview/Signals";
import { ThesisChart } from "@/components/overview/ThesisChart";
import { ReleaseFeed } from "@/components/overview/ReleaseFeed";
import { Highlights } from "@/components/overview/Highlights";
import { ReadingsTable } from "@/components/overview/ReadingsTable";
import Link from "next/link";
import { pathOf, staticPath, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { HealthStamp } from "@/components/shell/HealthStamp";
import { Glossary } from "@/components/Glossary";
import { FuturesCurve } from "@/components/overview/FuturesCurve";

// The reading each card shows, first available wins. 行情宝 platform
// transactions are the deepest hog-price series (2015-) and the one the
// cycle is positioned against. The margin card shows what a farm earns per
// hog, estimated since the official figure stopped (docs/adr/0034), because
// losses are what make farms cull; its name says it is an estimate. The
// 500-county ratio follows, for a wall rebuilt before the estimate could be
// fitted, and 发改委's own ratio before the county series existed.
const CARDS: [Role, string[]][] = [
  ["capacity", ["sow_inventory"]],
  ["price", ["hog_price_index"]],
  ["margin", ["profit_per_head_est", "hog_corn_ratio_county", "hog_corn_ratio"]],
];
const OUTLOOK: Partial<Record<Role, string>> = { capacity: "usda_sow_stocks" };
const CAPACITY = "sow_inventory";
const PRICE = "hog_price_index";
const FUTURES = "lh_futures_curve";

export function OverviewPage({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale);
  const o = t.overview;
  const cycle = data.readings.filter((r) => r.in_wall !== false);
  const panelOf = (id: string) => data.panels.find((p) => p.id === id);
  const readingOf = (id: string) => data.readings.find((r) => r.id === id);
  const capacity = panelOf(CAPACITY);
  const price = panelOf(PRICE);
  const futures = panelOf(FUTURES);
  const end = data.window.end ?? data.generated_at.slice(0, 10);
  const asOf = data.generated_at.slice(0, 10);

  const signals = CARDS.flatMap(([role, ids]): Signal[] => {
    const id = ids.find((i) => readingOf(i) && panelOf(i));
    if (!id) return [];
    const reading = readingOf(id) as Reading;
    // Another source's forecast of the same quantity, when it reaches past
    // the latest measurement. Only USDA publishes one.
    const ahead = OUTLOOK[role] ? readingOf(OUTLOOK[role]) : undefined;
    const outlook = ahead && ahead.obs_date > reading.obs_date ? ahead : undefined;
    return [{ role, reading, panel: panelOf(id) as Panel, outlook }];
  });
  const lastRelease = cycle
    .map((r) => r.published_on)
    .filter((p): p is string => p != null)
    .sort()
    .pop();

  return (
    <main className="wrap overview">
      <header className="ov-head">
        <h1>{o.heading}</h1>
        <p className="ov-stamp">
          {o.stamp(asOf)}
          {lastRelease && <> · {o.lastRelease(lastRelease)}</>}
          {data.health && " · "}
          <HealthStamp health={data.health} locale={locale} />
          {" · "}
          {/* The overview stays on today; standing on a past day is the
              wall's job (docs/adr/0025). */}
          <Link href={pathOf(locale, "wall")}>{t.asOf.overviewLink}</Link>
          {" · "}
          <a href={staticPath(locale === "zh" ? "/zh/feed.xml" : "/feed.xml")}>{o.feed}</a>
          {" · "}
          <a href={staticPath("/data/index.json")}>{o.api}</a>
        </p>
        <p className="ov-lede">{o.lede}</p>
        <Glossary ids={["sowHerd", "normalHolding", "releaseVsPeriod", "caliber"]} locale={locale} />
      </header>

      <Signals signals={signals} end={end} locale={locale} />

      {capacity && price && (
        <section aria-labelledby="thesis-h">
          <h2 className="section" id="thesis-h">
            {o.thesisHeading}
          </h2>
          <p className="section-note">{o.thesisNote}</p>
          <ThesisChart capacity={capacity} price={price} end={end} locale={locale} />
        </section>
      )}

      {futures && (
        <FuturesCurve
          curve={futures}
          track={data.market?.track_record}
          today={end}
          locale={locale}
        />
      )}

      <div className="ov-two">
        <ReleaseFeed readings={cycle} locale={locale} />
        <Highlights
          readings={cycle}
          panels={data.panels.filter((p) => p.threshold)}
          locale={locale}
        />
      </div>
      <ReadingsTable readings={cycle} locale={locale} />
    </main>
  );
}
