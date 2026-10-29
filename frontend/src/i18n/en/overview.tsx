/** The overview page and its readings table. */

import { ordinal, UNIT_EN } from "./words";

export const overview = {
  overview: {
    tickerLabel: "Latest prices",
    thesisHeading: "Capacity leads price",
    feed: "Subscribe (Atom)",
    api: "Downloads and API",
    futuresHeading: "Futures curve",
    futuresNote: (date: string) => `大商所 live hog settles of ${date}, by delivery month.`,
    futuresCaption: "Live hog futures: the latest settle by delivery month",
    futuresMonth: "Delivery",
    futuresSettle: "Settle",
    futuresWeek: "On the week",
    futuresMore: "each contract, and how far off the market has been",
    futuresSpread: (nearM: string, nearV: string, farM: string, farV: string, pct: number) =>
      `${farM} settles at ${farV}, ${Math.abs(pct)}% ${pct >= 0 ? "above" : "below"} ${nearM} (${nearV}).`,
    futuresTrack: (six: number, signed: number, n: number) =>
      `Six months before delivery, settles have missed the final price by ${six}% on average, ${Math.abs(signed)}% ${signed >= 0 ? "too high" : "too low"} signed (${n} contracts since 2021).`,
    thesisNote: "Breeding sows shifted forward by the lead you pick, above the hog price.",
    thesisMethod: (
      <p>Biology sets the lag at 10–12 months: 114 days&rsquo; gestation plus about six months to finish.</p>
    ),
    lead: "Lead",
    leadOption: (n: number) => (n ? `+${n} mo` : "None"),
    shifted: (n: number) => (n ? ` · shifted +${n} mo` : ""),
    today: "today",
    groups: {
      runs: "Thresholds",
      extremes: "Multi-year extremes",
      stale: "Stopped updating",
      overdue: "Releases overdue",
    },
    extreme: (kind: "low" | "high", since: string, all: boolean) =>
      `${kind === "low" ? "lowest" : "highest"} since ${all ? `the series begins (${since})` : since}`,
    run: (below: boolean, line: string, n: number, since: string) =>
      `${below ? "below" : "above"} the ${line} for ${n} straight readings, since ${since}`,
    staleFor: (days: number, date: string) => `last reading ${date}, ${days} days ago`,
    overdueFor: (period: string, by: string) =>
      `${period} not out, and later than any release on record since ${by}`,
    nothing: "Nothing to report under these definitions.",

    heading: "Where the hog cycle stands",
    lede: "Breeding sows set hog supply 10–12 months out, the hog price is where it lands, and margins decide whether farms restock.",
    stamp: (asOf: string) => `Data as of ${asOf}`,
    role: {
      capacity: "leads price by 10–12 months",
      price: "where supply lands",
      margin: "decides whether breeding continues",
    },
    streak: (dir: "up" | "down", n: number, g: string) =>
      `${dir === "down" ? "down" : "up"} ${n} ${UNIT_EN[g] ?? "readings"} in a row`,
    change: (pct: number, since: string) =>
      `${pct > 0 ? "+" : ""}${pct}% vs ${since}`,
    yoy: (pct: number) => `${pct > 0 ? "+" : ""}${pct}% YoY`,
    position: (pct: number, years: number | null) =>
      years == null
        ? `${ordinal(pct)} percentile of its own history`
        : `${ordinal(pct)} percentile of its own ${years}-year history`,
    released: (date: string, lag: number) => `published ${date}, ${lag} days after`,
    outlook: (who: string, year: string, value: string, unit: string, date: string | null) =>
      `${who} forecast for the end of ${year}: ${value} ${unit}${date ? ` (published ${date})` : ""}`,
    releaseUnknown: "source gives no release date",
    nextRelease: (period: string, usual: string) => `next: ${period}, usually out by ${usual}`,
    nextOverdue: (period: string, by: string) =>
      `${period} is overdue: later than any release on record (${by})`,
    staleBadge: (days: number) => `no new data for ${days} days`,
    align: "Place each reading at",
    alignPeriod: "the period it describes",
    alignRelease: "the day it was published",
    alignNote: (median: number) => (
      <>
        By publication date: a median of <b className="num">{median}</b> days after the period.
        Readings before 2021-12 carry no date and are not shown.
      </>
    ),
    feedHeading: "Latest releases",
    feedNote: "Newest publication first.",
    factsHeading: "Worth noting",
  },

  readings: {
    heading: "All readings",
    note: "Every series on the wall.",
    name: "Series",
    value: "Latest",
    yoy: "YoY",
    position: "Position",
    asOf: "As of",
    status: "Status",
    ordinal: (pct: number) => ordinal(pct),
    span: (years: number) => `${years}y`,
    positionTitle: (pct: number, years: number | null) =>
      `${ordinal(pct)} percentile of its own history${years == null ? "" : ` over ${years} years`}: 0 is its lowest reading, 100 its highest`,
    noPositionTitle: "Too little history for a percentile",
    live: "live",
    overdue: "overdue",
    overdueTitle: (period: string, by: string) => `${period} is later than any release on record (${by}).`,
    movingBaseline: "the target baseline moves, so no gap is computed",
  },
};
