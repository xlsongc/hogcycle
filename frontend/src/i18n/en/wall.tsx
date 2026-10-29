/** The causal-chain wall and its table view. */

export const wall = {
  wall: {
    heading: "Causal-chain wall",
    sub: (n: number) => <>{n} series on one time axis, grouped along the causal chain, each on its own scale.</>,
    howTo: (
      <>
        Hover to read every panel at one date; drag to zoom, double-click to reset. Hollow points
        are annual or quarterly readings; a dashed stretch has no readings; a ring marks a revised
        value.
      </>
    ),
    zoomed: "custom window",
    reset: "Reset zoom",

    footerHeading: "Calibers",
    footer: [
      <>
        Hog prices come in three calibers: Hangqingbao platform trades, Xuantian&rsquo;s three-way
        crossbred price, and the ministry&rsquo;s 500-county markets. Each has its own panel.
      </>,
      <>
        Breeding sows: annual to 2020, monthly from 2021-12, quarter-ends only from 2026.
      </>,
      <>
        Designated slaughter (2025-07) and the carcass ex-plant price (2024-01) changed whom they
        survey; each caliber is its own series.
      </>,
      <>
        The 500-county hog-to-corn ratio runs about 0.26 below the NDRC ratio, so the 5:1 line is
        not drawn on it.
      </>,
      <>
        Retail pork (36 cities) is pork at retail, not live hogs. Corn is per tonne.
      </>,
    ],
  },

  table: {
    show: "Table view",
    hide: "Hide table",
    note: (rows: number) => `Last reading of each month · ${rows} rows`,
    month: "Month",
    caption: "Every series on the wall by month: the last observation in each month.",
  },
};
