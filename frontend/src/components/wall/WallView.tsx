"use client";

/**
 * The wall page's interactive part. Owns the time window, which scopes every
 * panel at once — if two panels could disagree about the range, two numbers
 * on one screen would silently be measuring different periods.
 *
 * The window lives in the URL (?w=3y, or ?from=…&to=… after a drag), so a
 * zoomed view can be shared.
 */

import { useCallback, useEffect, useMemo, useState } from "react";
import type { Panel } from "@/types/generated/wall";
import { ChartWall, WALL_GROUP } from "@/charts/ChartWall";
import { TableView } from "@/components/TableView";
import { AsOfControl } from "@/components/AsOfControl";
import { WallToolbar } from "./WallToolbar";
import { WALL_RANGE, bounds, parseRange, rangeParams, type Range } from "@/lib/range";
import { readParams, writeParams } from "@/lib/urlState";
import { firstKnowable, panelOn } from "@/lib/asOf";
import { useAsOf } from "@/lib/useAsOf";
import { useAlign } from "@/lib/useAlign";
import type { Locale } from "@/i18n/locale";

type Props = {
  panels: Panel[];
  start: string;
  end: string;
  /** The day the contract was generated: the latest a reader can stand on. */
  today: string;
  locale: Locale;
};

export function WallView({ panels, start, end, today, locale }: Props) {
  // Standing on a past day cuts every panel to what was knowable then, and
  // the window ends on that day (docs/adr/0025).
  const [day, setDay] = useAsOf();
  const [align, setAlign] = useAlign();
  const shown = useMemo(() => panels.map((p) => panelOn(p, day)), [panels, day]);
  const earliest = useMemo(
    () =>
      panels
        .map((p) => firstKnowable(p)?.date)
        .filter((d): d is string => d != null)
        .sort()[0] ?? start,
    [panels, start]
  );
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

  const [min, max] = bounds(range, start, day ?? end);
  const zoom = useCallback(
    (a: string, b: string) => setRange({ kind: "custom", min: a, max: b }),
    []
  );
  const reset = useCallback(() => setRange(WALL_RANGE), []);

  return (
    <>
      <AsOfControl day={day} onDay={setDay} min={earliest} max={today} locale={locale} />
      <WallToolbar
        range={range}
        min={min}
        max={max}
        group={WALL_GROUP}
        onRange={setRange}
        onReset={reset}
        align={align}
        onAlign={setAlign}
        locale={locale}
      />
      <ChartWall
        panels={shown}
        asOf={day}
        align={align}
        first={firstBy(panels)}
        min={min}
        max={max}
        locale={locale}
        onZoom={zoom}
        onReset={reset}
      />
      <TableView panels={shown} min={min} max={max} locale={locale} />
    </>
  );
}

/** When each panel first became knowable, for the note on one that was not
 *  yet knowable on the day asked about. */
function firstBy(panels: Panel[]): Record<string, ReturnType<typeof firstKnowable>> {
  return Object.fromEntries(panels.map((p) => [p.id, firstKnowable(p)]));
}
