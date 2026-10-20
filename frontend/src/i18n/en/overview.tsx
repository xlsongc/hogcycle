/** The overview page and its readings table. */

import { ordinal, UNIT_EN } from "./words";

export const overview = {
  overview: {
    thesisHeading: "Capacity leads price",
    feed: "Subscribe (Atom)",
    api: "Every series as JSON",
    futuresHeading: "What the futures market prices ahead",
    futuresNote: (date: string) =>
      `The latest settle of every listed Dalian live-hog contract, by delivery month, as of ${date}, from Sina's copy of the exchange's prices. The market's expectation with money behind it, not this site's forecast. Per tonne of the delivery grade, a different caliber from the spot prices above.`,
    futuresCaption: "Live hog futures: the latest settle by delivery month",
    futuresMonth: "Delivery month",
    futuresSettle: "Settle",
    futuresMore: "every contract, and the main contract since 2021",
    thesisNote: (
      <>
        Breeding sow inventory, shifted forward by the lead you pick, above the
        hog price it is supposed to lead. Biology fixes the lag at 10–12
        months — 114 days&rsquo; gestation plus about six months to finish — so
        the shift is not a fitted parameter. Two panels on one time axis, each
        on its own scale: <b>not a dual axis</b>. Past today the shifted line
        is capacity that already exists, drawn where biology puts it on the
        market. It is an alignment, <b>not a forecast</b>.
      </>
    ),
    lead: "Lead",
    leadOption: (n: number) => (n ? `+${n} mo` : "None"),
    shifted: (n: number) => (n ? ` · shifted +${n} mo` : ""),
    today: "today",
    changesNote: (
      <>
        Facts with fixed definitions, computed in the pipeline: runs against a
        threshold, multi-year extremes, series that stopped updating.{" "}
        <b>None of them is a call on the phase</b> — that stays with the reader.
      </>
    ),
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
    lede: (
      <>
        Three readings in causal order. Breeding sows fix hog supply 10–12
        months out; the hog price is where that supply lands; the hog-to-corn
        ratio decides whether farmers keep breeding. Each number says which
        period it describes and the day it became public. None of them is a
        call on the phase.
      </>
    ),
    stamp: (asOf: string) => `Data as of ${asOf}`,
    lastRelease: (date: string) => `latest release ${date}`,
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
        Placed at its publication date, each reading appears where a reader could
        first have used it. A release comes a median of{" "}
        <b className="num">{median}</b> days after the period ends, and that time
        is spent out of the biological lead. Readings from before 2021-12 carry
        no publication date and are left out of this view, not guessed at.
      </>
    ),
    feedHeading: "Latest releases",
    feedNote: "Weekly and monthly prints, newest publication first.",
    factsHeading: "Worth noting",
  },

  readings: {
    heading: "All readings",
    note: "Every series on the causal wall. Select a name to open its panel.",
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
    overdueTitle: (period: string, by: string) =>
      `The value for ${period} is not out, and it is later than any release on record (${by}). Not stale yet.`,
    movingBaseline: "the target baseline moves, so no gap is computed",
  },
};
