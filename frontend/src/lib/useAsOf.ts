"use client";

/**
 * The day a page stands on, kept in the URL as `?asof=YYYY-MM-DD` so a view
 * of the past is a link like any other view (docs/adr/0016, 0025).
 *
 * The page prerenders today; the query is read once mounted and written back
 * only after that, or the first render would erase it.
 */

import { useEffect, useState } from "react";
import { isDay } from "./asOf";
import { readParams, writeParams } from "./urlState";

export function useAsOf(): [string | null, (day: string | null) => void] {
  const [day, setDay] = useState<string | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const q = readParams().get("asof");
    setDay(isDay(q) ? q : null);
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) writeParams({ asof: day });
  }, [day, ready]);

  return [day, setDay];
}
