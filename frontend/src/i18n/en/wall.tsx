/** The causal-chain wall and its table view. */

export const wall = {
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
        where a series changes how often it is read. From the keyboard, Tab to
        a panel and step through it with the arrow keys. A ring marks a period
        whose value was revised; its series page lists every value it has had.
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

  table: {
    show: "Table view",
    hide: "Hide table",
    note: (rows: number) =>
      `Resampled monthly · last observation in each month · ${rows} rows`,
    month: "Month",
    caption: "Every series on the wall by month: the last observation in each month.",
  },
};
