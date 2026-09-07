"use client";

/**
 * The instrument header.
 *
 * It borrows the layout language of a spacecraft panel — bracketed groups,
 * segmented gauges, a vertical scale with a marker, a plate of metadata along
 * the bottom — because that language is honest about what this page is: a set
 * of readings taken from instruments of differing reliability, presented for
 * a human to interpret. It is not a summary and it does not conclude
 * anything; the one number it puts in the middle is the series the whole
 * project exists to watch, with its own year-on-year beside it.
 *
 * Everything except the pig is read from the contract. See Gauge.tsx.
 */

import type { Reading, WallContract } from "@/types/generated/wall";
import { Bar, Group, Scale } from "./Gauge";
import { Clock } from "./Clock";
import { PixelPig } from "./PixelPig";
import { fmt } from "@/charts/base/theme";
import { labelOf, nameOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

/** The series each bracketed group shows, in causal order. Ids rather than a
 *  tier filter: the header is a hand-picked instrument panel, not an
 *  exhaustive listing, and the wall below already shows everything. */
const LEFT = ["sow_inventory", "hog_inventory", "slaughter"];
const RIGHT = ["hog_price_index", "piglet_price", "corn_price"];
const HERO = "sow_inventory";
const SCALE_OF = "hog_corn_ratio";

function pick(readings: Reading[], ids: string[]): Reading[] {
  return ids
    .map((id) => readings.find((r) => r.id === id))
    .filter((r): r is Reading => !!r);
}

export function Hud({ data, locale }: { data: WallContract; locale: Locale }) {
  const t = dict(locale).hud;
  const left = pick(data.readings, LEFT);
  const right = pick(data.readings, RIGHT);
  const hero = data.readings.find((r) => r.id === HERO);
  const ratio = data.readings.find((r) => r.id === SCALE_OF);

  const ratioPanel = data.panels.find((p) => p.id === SCALE_OF);
  const ratioValues =
    ratioPanel?.points.map((p) => p.v).filter((v): v is number => v != null) ?? [];
  const ratioMin = ratioValues.length ? Math.min(...ratioValues) : 4;
  const ratioMax = ratioValues.length ? Math.max(...ratioValues) : 10;
  // Both the scale's title and its reference line come from the contract, so
  // the panel cannot drift from the series it claims to be showing.
  const ratioThreshold = ratioPanel?.threshold
    ? { value: ratioPanel.threshold.value, label: labelOf(ratioPanel.threshold, locale) }
    : null;

  return (
    <section className="hud" aria-label={t.panel}>
      <div className="hud-top">
        <div className="hud-stamp">
          <span>{t.knownAt}</span>
          <b className="num">{data.generated_at.slice(0, 10)}</b>
        </div>
        <div className="hud-title" aria-hidden="true">
          <i className="ticks" />
          <span>{t.title}</span>
          <i className="ticks" />
        </div>
        <div className="hud-stamp right">
          <span>{t.local}</span>
          <Clock />
        </div>
      </div>

      <div className="hud-body">
        <div className="hud-col">
          <Group label={t.capacity}>
            {left.map((r) => (
              <Bar key={r.id} reading={r} locale={locale} />
            ))}
          </Group>
          <Group label={t.coverage}>
            <div className="hud-kv">
              <span>{t.from}</span>
              <b className="num">{data.window.start ?? "—"}</b>
            </div>
            <div className="hud-kv">
              <span>{t.to}</span>
              <b className="num">{data.window.end ?? "—"}</b>
            </div>
            <div className="hud-kv">
              <span>{t.series}</span>
              <b className="num">{String(data.panels.length).padStart(3, "0")}</b>
            </div>
          </Group>
        </div>

        <div className="hud-center">
          <div className="hud-frame">
            <PixelPig />
            {hero && (
              <div className="hud-readout" aria-hidden="true">
                <div>
                  <span>{t.level}</span>
                  <b className="num">{fmt(hero.value, hero.unit, locale)}</b>
                </div>
                <div>
                  <span>{t.yoy}</span>
                  <b className="num">{hero.yoy == null ? "—" : `${hero.yoy > 0 ? "+" : ""}${hero.yoy}%`}</b>
                </div>
                <div>
                  <span>{t.pctl}</span>
                  <b className="num">
                    {hero.percentile == null
                      ? "—"
                      : String(hero.percentile).padStart(3, "0")}
                  </b>
                </div>
              </div>
            )}
          </div>
          {hero && (
            <div className="hud-tag">
              {nameOf(hero, locale)} · {hero.obs_date}
            </div>
          )}
        </div>

        {ratio && (
          <Scale
            min={ratioMin}
            max={ratioMax}
            value={ratio.value}
            label={nameOf(ratio, locale)}
            unit="RATIO"
            threshold={ratioThreshold}
            locale={locale}
          />
        )}

        <div className="hud-col">
          <Group label={t.price}>
            {right.map((r) => (
              <Bar key={r.id} reading={r} locale={locale} />
            ))}
          </Group>
          <Group label={t.howToRead}>
            <p className="hud-hint">{t.hint}</p>
          </Group>
        </div>
      </div>

      <div className="hud-foot">
        <span>
          <i>{t.footSource}</i>
          {t.footSourceValue}
        </span>
        <span>
          <i>{t.footCaliber}</i>
          {t.footCaliberValue}
        </span>
        <span>
          <i>{t.footCollected}</i>
          {t.footCollectedValue}
        </span>
        <span>
          <i>{t.footVerdict}</i>
          {t.footVerdictValue}
        </span>
      </div>
    </section>
  );
}
