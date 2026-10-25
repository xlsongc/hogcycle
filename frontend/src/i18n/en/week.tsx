/** The weekly digest (docs/adr/0039). */

export const week = {
  week: {
    kicker: (year: number, n: number) => `Weekly · ${year}, week ${n}`,
    title: (range: string) => `The hog market, ${range}`,
    metaTitle: (year: number, n: number) => `Week ${n}, ${year}`,
    metaDescription:
      "What China's hog prices, futures and official releases did this week, from public sources, as this site knew it at the week's end.",
    open: (cut: string) => `Through ${cut}. The week is not over, so this issue still changes.`,
    closed: (end: string) =>
      `As this site knew it at the end of ${end}. A value revised later does not rewrite it.`,
    headlinePart: (name: string, value: string, delta: string | null, pct: string | null) =>
      delta == null
        ? `${name} ${value}`
        : `${name} ${value}, ${delta}${pct ? ` (${pct})` : ""} on the week`,
    join: "; ",
    stop: ".",
    noHeadline: "No headline price had a new reading this week.",
    fromOverview: "This week",
    read: "Read the weekly digest",
    prev: "Previous week",
    next: "Next week",
    feed: "Subscribe (Atom)",
    share: {
      copy: "Copy this week's summary",
      copied: "Copied",
      copiedAll: "Copied: the summary and the link",
      share: "Share…",
      failed: "This browser would not copy. Select the text below:",
    },
    method: (
      <>
        <p>
          Each issue is the difference between two snapshots of this site: every series as it
          could be known at the end of the week, and as it could be known at the end of the week
          before. A value counts from the day its publisher released it; where the source gives no
          date, from the day this site learned it. This is the rule the wall&apos;s as-of control
          uses.
        </p>
        <p>
          So a past issue reads as it stood then. A figure revised the week after does not change
          it, and a series this site had not yet collected is missing rather than filled in from
          today. Every number is arithmetic on published values: nothing here says what a move
          means.
        </p>
      </>
    ),

    moves: {
      title: "Prices this week",
      note: "The latest reading of every daily and weekly series against the latest a week earlier.",
    },
    cols: {
      series: "Series",
      latest: "Latest",
      change: "On the week",
      range: "Week's range",
    },
    groups: {
      price: "Hog and pork prices",
      market: "Futures",
      capacity: "Piglets",
      margin: "Feed and margins",
      noise: "Other",
    } as Record<string, string>,
    revised: "revised",
    firstWeek: "first week on record",
    quietLabel: "No new reading this week:",

    curve: {
      title: "The futures curve",
      note: (on: string) =>
        `Each listed contract's settle on ${on}, against a week earlier. CNY per tonne of the delivery grade, the market's price, not ours.`,
      contract: "Contract",
      settle: "Settle",
      change: "On the week",
    },

    released: {
      title: "Released this week",
      note: "Monthly, quarterly and annual figures that came out, each beside the period before.",
      none: "Nothing monthly, quarterly or annual came out this week.",
      published: (d: string) => `released ${d}`,
      learned: (d: string) => `learned ${d}; the source gives no date`,
      prior: (period: string) => `vs ${period}`,
      yoy: "year on year",
      revisedFrom: (v: string) => `revised from ${v}`,
      forecast: "forecast",
    },

    upcoming: {
      title: "Due next",
      note: "What the release calendar expects within a week, read off each series' past releases. An expectation, never a date.",
      none: "Nothing is expected in the coming week.",
      usual: (d: string) => `usually by ${d}`,
      by: (d: string) => `latest on record ${d}`,
      overdue: "overdue",
    },

    equities: {
      title: "Listed producers",
      note: "Share prices, close to close. A claim on the cycle, not a measurement of it.",
    },

    archive: {
      title: "Every issue",
      note: "One page per week since collection began on 2026-09-06, each at a stable link. The figure beside a week is its spot hog price's move.",
      current: "in progress",
    },
  },
};
