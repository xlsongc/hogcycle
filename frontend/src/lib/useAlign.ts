"use client";

/**
 * Where a reading goes on the time axis: at the period it describes, or at
 * the day it was published (docs/adr/0017). Kept in the URL as `?at=release`
 * so the second view is a link like any other.
 *
 * The page prerenders the period view; the query is read once mounted and
 * written back only after that, or the first render would erase it.
 */

import { useEffect, useState } from "react";
import { readParams, writeParams } from "./urlState";

export type Align = "period" | "release";

export function useAlign(): [Align, (a: Align) => void] {
  const [align, setAlign] = useState<Align>("period");
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setAlign(readParams().get("at") === "release" ? "release" : "period");
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeParams({ at: align === "release" ? "release" : null });
  }, [align, ready]);

  return [align, setAlign];
}

/** Whether any reading of the panel carries a release date, i.e. whether it
 *  has a place in the release view at all. */
export function hasReleases(points: { p?: string }[]): boolean {
  return points.some((p) => p.p != null);
}
