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

/** 1st, 2nd, 3rd, 4th … 11th, 21st. The teens are the exception that makes a
 *  naive `n + "th"` produce "1th" and "43th", which is what it did. */
function ordinal(n: number): string {
  const teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

export const en = {
  meta: {
    title: "The Hog Cycle Wall",
    description:
      "The causal chain of China's hog cycle on one shared time axis, laid out for a human to judge — not judged for them.",
  },

  nav: {
    language: "Language",
  },

  hud: {
    panel: "Instrument panel",
    knownAt: "KNOWN AT",
    local: "LOCAL",
    title: "HOG CYCLE MONITOR",
    capacity: "CAPACITY",
    coverage: "COVERAGE",
    price: "PRICE",
    howToRead: "HOW TO READ",
    from: "FROM",
    to: "TO",
    series: "SERIES",
    level: "LEVEL",
    yoy: "YOY",
    pctl: "PCTL",
    hint: (
      <>
        Bar fill is each series&rsquo; <b>own historical percentile</b>, not an
        absolute level; too little history leaves it empty. This panel reads
        instruments, it does not judge.
      </>
    ),
    footSource: "SOURCE",
    footSourceValue: "MARA five-ministry release · akshare",
    footCaliber: "CALIBER",
    footCaliberValue: "see footer",
    footCollected: "COLLECTED",
    footCollectedValue: (
      <>
        daily <span className="num">09:00 CST</span>
      </>
    ),
    footVerdict: "VERDICT",
    footVerdictValue: "left to the reader",
  },

  gauge: {
    noPercentile: (name: string) => `${name}: no percentile, history too short`,
    percentile: (name: string, pct: number) =>
      `${name}: ${ordinal(pct)} historical percentile`,
    now: (label: string, value: number) => `${label} now ${value}`,
  },

  tiles: {
    yoy: "YoY",
    noPercentile: "Historical percentile: too little history",
    percentile: (pct: number) => `${ordinal(pct)} historical percentile`,
    percentileNote: (pct: number) => <>{ordinal(pct)} percentile</>,
    belowBreakeven: (
      <>
        <b>Below the 5:1 breakeven</b> · farrow-to-finish is losing money
      </>
    ),
    movingBaseline: "baseline moves, so no gap is computed",
  },

  page: {
    heading: "The Hog Cycle Wall",
    sub: (
      <>
        Twenty series on one shared time axis: a causal-chain wall above, a
        free overlay below. This page computes and aligns —{" "}
        <strong>it does not call the phase</strong>. There are roughly three
        cycles of usable history, and any automatic rule would be fitted to its
        own sample.
      </>
    ),
    chainCapacity: "Capacity",
    chainToPrice: "→ 10-12 months later →",
    chainPrice: "Price",
    chainToMargin: "→ minus cost →",
    chainMargin: "Margin",
    chainFeedback: "→ feeds back into capacity",
    chainNoise: "Noise (does not move the cycle)",

    footerHeading: "Calibers and limits",
    footer: [
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
        ex-plant price — it shares neither caliber nor quantity with the series
        above, and appears only in the overlay, for reference.
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
        it is history, not a broken collector, which is why it does not appear
        in the readout tiles above.
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

  dashboard: {
    window: "Time window",
    ranges: { all: "All", "8y": "8Y", "3y": "3Y", "1y": "1Y" },
    appliesBelow: " · applies to every chart below",

    wallHeading: "Causal-chain wall",
    wallNote: (
      <>
        The physical cycle itself, in causal order: capacity → price → margin.
        Every cell carries its own axis and unit — this is small multiples, not
        a dual-axis chart, and it is the only honest way to put head counts,
        CNY/kg and a bare ratio on one time axis.
      </>
    ),

    overlayHeading: "Free overlay",
    overlayNote: (
      <>
        Any series, stacked on one time axis. Where the units agree it draws
        raw values; where they do not, everything is indexed to the start of
        the window, because forcing mixed dimensions onto two y-axes invents a
        correlation the data does not contain. Equities appear only here — a
        share price is a claim on the cycle, not a link in it.
      </>
    ),

    lag: "Lag shift",
    noLag: "No shift",
    shiftForward: "Forward",
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

    stamp: (known: string, start: string, end: string) =>
      `Knowledge as of ${known} · data window ${start} → ${end}`,
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
  },

  chart: {
    noData: "No data in this window",
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
