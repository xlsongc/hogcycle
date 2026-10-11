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

import type { Panel } from "@/types/generated/wall";
import type { Locale } from "@/i18n/locale";
import { PanelChart } from "./PanelChart";

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
  return (
    <div className="wall">
      {panels.map((panel, i) => {
        const last = i === panels.length - 1;
        return (
          <PanelChart
            key={panel.id}
            panel={panel}
            group={WALL_GROUP}
            min={min}
            max={max}
            locale={locale}
            showAxisLabels={last}
            size={last ? "tall" : "short"}
            anchor
            onZoom={onZoom}
            onReset={onReset}
          />
        );
      })}
    </div>
  );
}
