/** One series' own page. */

import type { ReactNode } from "react";

export const series = {
  series: {
    back: "All readings",
    publisher: "Published by",
    sourcePage: "Source page",
    noUrl: "Collected through an API; no public page.",
    retired: "Discontinued upstream; history only.",
    caliberEarlier: (from: string | null, link: ReactNode) => (
      <>
        {from ? `New caliber from ${from}. ` : ""}Before it: {link}.
      </>
    ),
    caliberLater: (until: string | null, link: ReactNode) => (
      <>
        {until ? `This caliber ends ${until}. ` : ""}After it: {link}.
      </>
    ),
    forecast: "USDA's estimate and forecast.",
    releaseForecast: "USDA revises its China numbers each April and October.",
    releaseSettle: "大商所 publishes settles after each trading day's close.",
    ahead: (date: string, days: number) => `published ${date}, ${days} days before the period ends`,
    latest: "Latest reading",
    chartHeading: "History",
    releaseHeading: "Release",
    releaseBody: (median: number, max: number, n: number) => (
      <>
        Published a median of <b className="num">{median}</b> days after the period ends,{" "}
        <b className="num">{max}</b> at most ({n} releases).
      </>
    ),
    releaseNext: (period: string, usual: string, by: string) => (
      <>
        Next: {period}, usually by <b className="num">{usual}</b>; late after{" "}
        <b className="num">{by}</b>.
      </>
    ),
    releaseNone: "The source does not date its releases.",
    revisionsHeading: "Revisions",
    revisionsNote: "Every value each period has had, oldest first.",
    revisionsNone: "Never revised.",
    cols: {
      period: "Period",
      value: "Value",
      change: "Change",
      released: "Published",
      learned: "Collected",
    },
    unknown: "not stated",
    recentHeading: "Recent readings",
    download: "Download CSV",
    downloadNote: "every reading, full history",
    onWall: "On the wall",
    inCompare: "Compare with other series",
    showAll: (n: number) => `All ${n} readings`,
    showRecent: "Latest 12",
  },

  cycles: {
    heading: "Cycles side by side",
    intro: "Enter the month each cycle starts; each is redrawn from there, indexed to 100.",
    signedNote: "This series crosses zero, so cycles are laid over in its own units.",
    add: "Start a cycle at",
    addButton: "Add",
    horizon: "Show",
    tick: (m: number) => (m === 0 ? "start" : `+${m} mo`),
    monthsIn: (m: number) => (m === 0 ? "at the start" : `${m} months in`),
    legend: (month: string) => `from ${month}`,
    remove: (month: string) => `Remove the cycle from ${month}`,
    none: (months: string[]) => `No reading in ${months.join(", ")}.`,
    bad: "A start is a month, written YYYY-MM.",
    atCap: (max: number) => `At most ${max} cycles at once.`,
    empty: "Add a start month above, e.g. a trough.",
    indexAxis: "Index (each cycle's start = 100)",
    showTable: "Table view",
    hideTable: "Hide table",
    monthCol: "Since start",
    caption:
      "Each cycle by whole months since its start: the reading nearest each month, as an index and in the series' own units.",
    label: (n: number, months: number, indexed: boolean) =>
      `Cycles side by side, ${n} cycles over ${months} months, ${indexed ? "indexed to each start" : "in the series' own units"}`,
  },

  seasons: {
    heading: "Season by season",
    note: "The last six years, January to December; this year is the heavy line.",
    month: (m: number) =>
      ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][m - 1] ?? "",
    label: (years: number[]) => `Season by season, one line per year: ${years.join(", ")}`,
  },

  units: {
    label: "Units",
    level: "Level",
    yoy: "Change from a year ago",
    yoypct: "% from a year ago",
    pct: "% from the reading before",
  },

  span: {
    heading: "In this window",
    hint: "Drag across the chart to zoom.",
    note: (n: number) => `${n} readings`,
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
