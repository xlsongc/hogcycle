"use client";

/**
 * The wall page's interactive part. Owns the time window, which scopes every
 * panel at once — if two panels could disagree about the range, two numbers
 * on one screen would silently be measuring different periods.
 *
 * The window lives in the URL (?w=3y, or ?from=…&to=… after a drag), so a
 * zoomed view can be shared.
 */

import { useCallback, useEffect, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { ChartWall, WALL_GROUP } from "@/charts/ChartWall";
import { TableView } from "@/components/TableView";
import { WallToolbar } from "./WallToolbar";
import { WALL_RANGE, bounds, parseRange, rangeParams, type Range } from "@/lib/range";
import { readParams, writeParams } from "@/lib/urlState";
import type { Locale } from "@/i18n/locale";

type Props = { panels: Panel[]; start: string; end: string; locale: Locale };

export function WallView({ panels, start, end, locale }: Props) {
  const [range, setRange] = useState<Range>(WALL_RANGE);
  // The prerendered page cannot know the query; read it once mounted, and
  // only write back after that, or the first render would erase it.
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setRange(parseRange(readParams(), WALL_RANGE));
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeParams(rangeParams(range, WALL_RANGE));
  }, [range, ready]);

  const [min, max] = bounds(range, start, end);
  const zoom = useCallback(
    (a: string, b: string) => setRange({ kind: "custom", min: a, max: b }),
    []
  );
  const reset = useCallback(() => setRange(WALL_RANGE), []);

  return (
    <>
      <WallToolbar
        range={range}
        min={min}
        max={max}
        group={WALL_GROUP}
        onRange={setRange}
        onReset={reset}
        locale={locale}
      />
      <ChartWall
        panels={panels}
        min={min}
        max={max}
        locale={locale}
        onZoom={zoom}
        onReset={reset}
      />
      <TableView panels={panels} locale={locale} />
    </>
  );
}
