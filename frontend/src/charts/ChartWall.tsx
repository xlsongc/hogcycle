"use client";

/**
 * The wall: one panel per indicator, all sharing a single time axis.
 *
 * The point of the layout is the shared crosshair. Hovering any date reads
 * every indicator at that moment, so the causal chain — capacity, then margin,
 * then price — can be read down a single vertical line. The sync is by time,
 * not by ECharts' own connect(), which links by data index and so put panels
 * of different frequencies on different dates (see base/pointerSync.ts).
 */

import { Fragment } from "react";
import type { Panel } from "@/types/generated/wall";
import { seriesPath, type Locale } from "@/i18n/locale";
import { dict } from "@/i18n/dict";
import { PanelChart } from "./PanelChart";
import { tierVars } from "@/lib/tier";

export const WALL_GROUP = "hogcycle-wall";

type Props = {
  panels: Panel[];
  min: string;
  max: string;
  locale: Locale;
  onZoom: (min: string, max: string) => void;
  onReset: () => void;
};

export function ChartWall({ panels, min, max, locale, onZoom, onReset }: Props) {
  const t = dict(locale);
  return (
    <div className="wall">
      {panels.map((panel, i) => {
        const last = i === panels.length - 1;
        // A heading where the tier changes: seventeen identical panels read
        // as a list, while four labelled groups read as the chain they are.
        const opens = i === 0 || panels[i - 1]?.tier !== panel.tier;
        return (
          <Fragment key={panel.id}>
            {opens && (
              <h2 className="wall-tier" style={tierVars(panel.tier)}>
                {t.chart.tierNote[panel.tier]}
              </h2>
            )}
            <PanelChart
              panel={panel}
              group={WALL_GROUP}
              min={min}
              max={max}
              locale={locale}
              showAxisLabels={last}
              size={last ? "tall" : "short"}
              anchor
              href={seriesPath(locale, panel.id)}
              onZoom={onZoom}
              onReset={onReset}
            />
          </Fragment>
        );
      })}
    </div>
  );
}
