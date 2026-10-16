/**
 * Every string the English page renders.
 *
 * This file is the reference shape: `zh.tsx` is typed against it, so a key
 * that exists here and not there is a compile error rather than a Chinese
 * sentence appearing mid-paragraph on the English page. Indicator names are
 * *not* here — they belong to the indicator and travel in the contract
 * (ADR-0014), because the caliber lives in the name.
 *
 * Prose blocks are JSX rather than strings with a markup convention: the copy
 * carries inline emphasis that is load-bearing (口径, moving baselines, "must
 * not share one line"), and a hand-rolled mini-parser to preserve it would be
 * more code than the emphasis is worth.
 */

import type { ReactNode } from "react";

/** 1st, 2nd, 3rd, 4th … 11th, 21st. The teens are the exception that makes a
 *  naive `n + "th"` produce "1th" and "43th", which is what it did. */
function ordinal(n: number): string {
  const teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Plural period words for a run of readings ("down 4 quarters in a row"). */
const UNIT_EN: Record<string, string> = {
  D: "days",
  W: "weeks",
  M: "months",
  Q: "quarters",
  A: "years",
};

export const en = {
  meta: {
    title: "The Hog Cycle Wall",
    description:
      "The causal chain of China's hog cycle on one shared time axis, laid out for a human to judge — not judged for them.",
    pages: {
      overview: "Overview",
      wall: "Causal-chain wall",
      compare: "Compare",
    },
  },

  nav: {
    pages: "Pages",
    language: "Language",
    overview: "Overview",
    wall: "Wall",
    compare: "Compare",
  },


  gauge: {
    stale: "STALE",
    staleSince: (date: string, days: number) =>
      `No new data since ${date} (${days} days)`,
  },

  overview: {
    thesisHeading: "Capacity leads price",
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
    },
    extreme: (kind: "low" | "high", since: string, all: boolean) =>
      `${kind === "low" ? "lowest" : "highest"} since ${all ? `the series begins (${since})` : since}`,
    run: (below: boolean, line: string, n: number, since: string) =>
      `${below ? "below" : "above"} the ${line} for ${n} straight readings, since ${since}`,
    staleFor: (days: number, date: string) => `last reading ${date}, ${days} days ago`,
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
    movingBaseline: "the target baseline moves, so no gap is computed",
  },

  wall: {
    heading: "Causal-chain wall",
    sub: (n: number) => (
      <>
        {n} series on one time axis, grouped along the causal chain. Each panel
        keeps its own axis and unit (small multiples, <strong>not a dual
        axis</strong>). The wall computes and aligns; <strong>it does not call
        the phase</strong>.
      </>
    ),
    howTo: (
      <>
        Hover to read every panel at one date; <b>drag</b> across a panel to
        zoom, <b>double-click</b> to reset. Hollow points are annual or
        quarterly readings: a different measurement, not a smoother sample.
        Where readings are more than a month apart, the line between them is
        dashed: nothing was measured in between. A labelled dotted line marks
        where a series changes how often it is read.
      </>
    ),
    zoomed: "custom window",
    reset: "Reset zoom",

    footerHeading: "Calibers and limits",
    footer: [
      <>
        The carcass ex-plant price <b>changed whom it surveys in 2024-01</b>{" "}
        (plants above designated size → every designated plant). The level
        barely moved, but it is still <b>two calibers</b>: the older one is
        retired and appears only in Compare. The 500-county hog-to-corn ratio
        divides two prices from the same weekly report and collection day. It
        tracks the NDRC ratio (correlation 0.996) but runs 0.26 lower on
        average, so it <b>carries no 5:1 line</b>: that line is defined on the
        NDRC caliber.
      </>,
      <>
        Average hog transaction price and average market weight are on the{" "}
        <b>Hangqingbao platform-transaction caliber</b>; the three-way
        crossbred price is on the <b>Xuantian caliber</b>. Those two and the
        Ministry of Agriculture&rsquo;s 500-county market survey are three
        different measurements of <b>the same quantity</b>, and{" "}
        <b>must not share one line</b>, so each gets its own panel.
      </>,
      <>
        Pork retail price (lean cuts, 36 cities, collected by the NDRC)
        measures <b>pork at retail, not live hogs</b>. Same dimension,
        different point in the chain, so it sits structurally above the
        ex-plant price. It shares neither caliber nor quantity with the hog
        prices on the wall: read it as the retail end of the chain.
      </>,
      <>
        Breeding sow inventory comes from the monthly{" "}
        <b>
          joint release of the Ministry of Agriculture and Rural Affairs, the
          NDRC, MOFCOM, the General Administration of Customs and the National
          Bureau of Statistics
        </b>
        . Granularity is caliber here: 2020 and earlier are <b>annual</b>{" "}
        values (hollow points); 2021-12 to 2025-10 are <b>monthly</b>, where
        quarter-end months are the statistics bureau&rsquo;s survey figure and
        the months between are extrapolated from the ministry&rsquo;s
        fixed-point monitoring; <b>from 2026 the public caliber prints
        quarter-ends only</b>, so the most recent stretch is quarterly. That is
        not thinner collection — upstream changed its publishing rhythm.
      </>,
      <>
        Designated slaughter <b>changed caliber in July 2025</b> (from plants
        above designated size to all designated plants) and the level stepped
        up with it, so it is kept as <b>two series rather than spliced into
        one</b>. The old caliber has stopped publishing and is marked retired:
        it is history, not a broken collector, which is why it is not on the
        wall and appears only in Compare.
      </>,
      <>
        The normal-holding target is a <b>moving baseline</b> (41 → 39 → 37.5
        million head). Any gap or ratio has to use the baseline in force at the
        time, never today&rsquo;s, so only the raw level is shown here.
      </>,
      <>
        Corn is quoted in <b>CNY per tonne</b>, a different dimension from the
        per-kilogram series around it. Margin derivations reconcile units in
        the gold layer; silver stays faithful to the source.
      </>,
      <>
        The three-way crossbred price and corn are daily series, and upstream
        keeps only a rolling ~1-year window — anything older is gone from the
        source. Depth beyond that accumulates only by collecting every day.
      </>,
    ],
  },

  window: {
    label: "Window",
    ranges: { all: "All", "8y": "8Y", "5y": "5Y", "3y": "3Y", "1y": "1Y" },
    stamp: (known: string, start: string, end: string) =>
      `Knowledge as of ${known} · data window ${start} → ${end}`,
  },

  health: {
    reached: (when: string) => `sources last reached ${when} UTC`,
    overdue: "a collector is overdue: newer releases may be missing",
    never: "never",
  },

  asOf: {
    label: "As of",
    clear: "Back to today",
    hint: "Pick a past day to see only what was knowable then. A value counts from the day its publisher released it; where the source gives no date, from the day this warehouse learned it, never from an assumed lag.",
    banner: (day: string) => (
      <>
        Standing on <b className="num">{day}</b>: only what was knowable that day is shown.
        Runs, extremes, positions and year-on-year describe today&apos;s series, so they are
        hidden here.
      </>
    ),
    latest: "Latest knowable reading",
    released: (date: string) => `published ${date}`,
    learned: (date: string) =>
      `release date not stated by the source; this warehouse learned it on ${date}`,
    nothing: (day: string) => `Nothing of this series was knowable on ${day}.`,
    firstPublished: (date: string) => `Its earliest release held here is ${date}.`,
    firstLearned: (date: string) =>
      `The source does not date its releases, and this warehouse first learned it on ${date}. A release date is never assumed, so before that it is not shown.`,
    marker: "as of",
    panelNone: (first: { date: string; basis: "published" | "learned" } | null) =>
      first == null
        ? "not knowable on this day"
        : first.basis === "published"
        ? `not knowable on this day: first released ${first.date}`
        : `not knowable on this day: release dates not stated, first learned ${first.date}`,
    startsAt: (month: string) => `knowable periods start ${month}`,
    knownFrom: "Known from",
    overviewLink: "See the wall as it stood on a past day",
  },

  compare: {
    heading: "Compare",
    sub: (
      <>
        Any series, stacked on one time axis. Where the units agree it draws
        raw values; where they do not, everything is indexed to the start of
        the window, because forcing mixed dimensions onto two y-axes invents a
        correlation the data does not contain. Equities appear only here — a
        share price is a claim on the cycle, not a link in it.
      </>
    ),
    lag: "Shift",
    noLag: "None",
    forward: "Forward by",
    months: (n: number) => `${n} mo`,
    lagNote: (
      <>
        Shift a whole series forward to test a lead. Push breeding sow
        inventory 10–12 months onto the hog price — biology fixes that lag (114
        days&rsquo; gestation plus about six months to finish), so an alignment
        there is not a coincidence. This is also the first chart for asking
        whether the capacity signal could have called the turn{" "}
        <i>at the time</i>.
      </>
    ),
    share: "This view lives in the address bar — copy the URL to share it.",
    undated: (names: string[]) =>
      `Not drawn: ${names.join(", ")}. Their sources do not date releases, and a date is never guessed.`,
    signed: (names: string[]) =>
      names.length > 1
        ? `Not drawn: ${names.join(", ")}. They go below zero, so an index to their first value would mean nothing. Select them with series in their own unit to see them.`
        : `Not drawn: ${names[0]}. It goes below zero, so an index to its first value would mean nothing. Select it with series in its own unit to see it.`,
  },

  picker: {
    atCapTitle: (max: number) =>
      `At most ${max} series at once — a ninth would need a generated hue, and a generated hue is indistinguishable from an existing one under colour-vision deficiency`,
    selected: (n: number, max: number) => `${n}/${max} selected`,
    atCap: " · at limit",
  },

  table: {
    show: "Table view",
    hide: "Hide table",
    note: (rows: number) =>
      `Resampled monthly · last observation in each month · ${rows} rows`,
    month: "Month",
    caption: "Every series on the wall by month: the last observation in each month.",
  },

  chart: {
    noData: "No data in this window",
    noneNear: "nothing near this date",
    published: (date: string, lag: number) =>
      lag >= 0 ? `published ${date} · +${lag}d` : `published ${date} · ${-lag}d ahead`,
    startsAt: (month: string) => `data from ${month}`,
    datedFrom: (month: string) => `dated releases from ${month}`,
    undated: "the source does not date its releases, so it has no place in this view",
    caliberFrom: (month: string) => `new caliber from ${month}`,
    cadence: {
      D: "daily",
      W: "weekly",
      M: "monthly",
      Q: "quarterly",
      A: "annual",
    },
    cadenceBreak: (from: string, to: string) => `${from} → ${to}`,
    granularityName: {
      D: "daily reading",
      W: "weekly reading",
      M: "monthly reading",
      Q: "quarterly reading",
      A: "annual reading",
    },
    tierNote: {
      capacity: "Capacity: leads price by 10–12 months",
      margin: "Margin: decides whether a capacity move persists",
      price: "Price: the outcome, not a driver",
      noise: "Noise: short-run disturbance that moves equities, not the cycle",
      equity: "Equity: a claim on the cycle, not a link in it",
    },
    panelLabel: (name: string, unit: string, n: number) =>
      `${name}, unit ${unit}, ${n} observations`,
    coarse: "coarse",
  },

  overlay: {
    indexAxis: (log: boolean) => `Index (start = 100${log ? ", log axis" : ""})`,
    shifted: (months: number) => ` (+${months} mo)`,
    indexedNote: (log: boolean) => (
      <>
        The selected series do not share a unit, so all are indexed to the
        start of the window — this compares relative moves, not levels
        {log
          ? ". The spread exceeds 10x, so the axis is logarithmic and equal percentage moves take equal height"
          : ""}
      </>
    ),
    label: (n: number, indexed: boolean) =>
      `Overlay, ${n} series, ${indexed ? "indexed" : "raw values"}`,
  },

  theme: {
    switch: "Switch theme",
    system: "System",
    light: "Light",
    dark: "Dark",
  },

  tier: {
    capacity: "Capacity",
    margin: "Margin",
    price: "Price",
    noise: "Noise",
    equity: "Equity",
  },

  granularity: { D: "D", W: "W", M: "M", Q: "Q", A: "A" },
};

export type Dict = typeof en;
