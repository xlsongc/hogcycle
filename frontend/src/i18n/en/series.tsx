/** One series' own page. */

import type { ReactNode } from "react";

export const series = {
  series: {
    back: "All readings",
    publisher: "Published by",
    sourcePage: "Source page",
    noUrl: "No public page: collected through an API.",
    retired: "This caliber is closed upstream. The page keeps its history.",
    caliberEarlier: (from: string | null, link: ReactNode) => (
      <>
        {from ? `A new caliber from ${from}. ` : ""}The caliber before it is a
        separate series: {link}.
      </>
    ),
    caliberLater: (until: string | null, link: ReactNode) => (
      <>
        {until ? `This caliber ends ${until}. ` : ""}The caliber after it is a
        separate series: {link}.
      </>
    ),
    equity: "A share price is a claim on the cycle, not a link in it, so it is not on the wall.",
    forecast:
      "This is USDA's estimate and forecast, not a measurement, so it is kept off the wall.",
    releaseForecast:
      "A forecast is published before the period it describes ends, and revised as that period approaches. USDA sets China's numbers each April and October.",
    ahead: (date: string, days: number) => `published ${date}, ${days} days before the period ends`,
    latest: "Latest reading",
    chartHeading: "History",
    releaseHeading: "When it becomes public",
    releaseBody: (median: number, max: number, n: number) => (
      <>
        A value appears a median of <b className="num">{median}</b> days after its period
        ends, and <b className="num">{max}</b> at the longest, over{" "}
        <b className="num">{n}</b> dated releases. A backtest has to wait that long too.
      </>
    ),
    releaseNext: (period: string, usual: string, by: string) => (
      <>
        Next: {period}. Usually out by <b className="num">{usual}</b>; after{" "}
        <b className="num">{by}</b> it would be later than any release on record. An
        expectation read off past releases, never a release date.
      </>
    ),
    releaseNone:
      "The source does not date its releases, so when each value became public is not known. Do not assume it was the day the period ended.",
    revisionsHeading: "Revisions",
    revisionsNote:
      "Each value a period has had, in the order this warehouse learned them. Nothing is overwritten.",
    revisionsNone:
      "No value has changed since it was first recorded. A revision would appear here as a second release of the same period.",
    cols: {
      period: "Period",
      value: "Value",
      change: "Change",
      released: "Published",
      learned: "Learned",
    },
    unknown: "not stated",
    recentHeading: "Recent readings",
    download: "Download CSV",
    downloadNote: "Full resolution and full depth; the chart thins daily data.",
    onWall: "See it on the causal-chain wall",
    inCompare: "Compare it with other series",
    showAll: (n: number) => `Show all ${n} readings`,
    showRecent: "Show the latest 12",
    allNote: "Every reading at full resolution, newest first.",
  },

  span: {
    heading: "In this window",
    hint: "Pick a window, or drag across the chart, to see its change, high and low.",
    note: (n: number) => `${n} readings · computed in your browser from the points shown`,
    first: "From",
    last: "To",
    change: "Change",
    high: "High",
    low: "Low",
    noPct: "no percentage: the window reaches zero or below",
    rank: (below: number, others: number) =>
      below === 0 ? (
        <>The last reading is the lowest in the window.</>
      ) : below === others ? (
        <>The last reading is the highest in the window.</>
      ) : (
        <>
          The last reading is above <b className="num">{below}</b> of the other{" "}
          <b className="num">{others}</b> in the window.
        </>
      ),
  },
};
