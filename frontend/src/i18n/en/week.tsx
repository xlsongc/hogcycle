/** The weekly digest (docs/adr/0039). */

export const week = {
  week: {
    kicker: (year: number, n: number) => `Weekly · ${year}, week ${n}`,
    title: (range: string) => `The hog market, ${range}`,
    metaTitle: (year: number, n: number) => `Week ${n}, ${year}`,
    metaDescription: "China's hog prices, futures and official releases this week.",
    open: (cut: string) => `Through ${cut}. The week is not over, so this issue still changes.`,
    closed: (end: string) => `As of the end of ${end}.`,
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
      <p>
        Each issue compares what had been published by the end of the week with what had been
        published a week earlier. A later revision does not change a past issue.
      </p>
    ),

    moves: {
      title: "Prices this week",
      note: "Daily and weekly series against a week earlier.",
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
        `Settles of ${on} against a week earlier, CNY per tonne.`,
      contract: "Contract",
      settle: "Settle",
      change: "On the week",
    },

    released: {
      title: "Released this week",
      note: "Monthly, quarterly and annual figures out this week.",
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
      note: "Expected from past release dates.",
      none: "Nothing is expected in the coming week.",
      usual: (d: string) => `usually by ${d}`,
      by: (d: string) => `latest on record ${d}`,
      overdue: "overdue",
    },

    equities: {
      title: "Listed producers",
      note: "Close to close.",
    },

    archive: {
      title: "Every issue",
      note: "Weekly since 2026-09-06. The figure is that week's spot hog price move.",
      current: "in progress",
    },
  },
};
