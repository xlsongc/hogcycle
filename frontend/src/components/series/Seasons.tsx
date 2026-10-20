"use client";

/**
 * Season by season: this year against the years before it, over one
 * calendar (lib/seasons.ts). Levels only, from the readings themselves.
 */

import { useMemo } from "react";
import type { Panel } from "@/types/generated/wall";
import { SeasonChart } from "@/charts/SeasonChart";
import { seasonal, seasons as seasonsOf } from "@/lib/seasons";
import { unitOf, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";

export function Seasons({ panel, locale }: { panel: Panel; locale: Locale }) {
  const t = dict(locale).seasons;
  const shown = useMemo(() => seasonsOf(panel.points), [panel.points]);
  if (panel.forecast || !seasonal(panel.points)) return null;
  return (
    <section aria-labelledby="seasons-h">
      <h2 className="section" id="seasons-h">
        {t.heading}
      </h2>
      <p className="section-note">{t.note}</p>
      <div className="overlay-card">
        <div className="overlay-head">
          <span className="panel-unit">{unitOf(panel.unit, locale)}</span>
        </div>
        <SeasonChart seasons={shown} unit={panel.unit} locale={locale} />
      </div>
    </section>
  );
}
