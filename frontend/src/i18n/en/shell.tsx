/** Copy every page shares: the shell, the theme, the as-of control, the stamps. */

export const shell = {
  meta: {
    title: "The Hog Cycle Wall",
    description: "China's hog cycle from primary sources: prices, breeding sows, futures and margins, in English and Chinese.",
    card: "hogcycle: China's hog cycle from primary sources, with a weekly digest",
    pages: {
      overview: "Overview",
      week: "Weekly digest",
      wall: "Causal-chain wall",
      compare: "Compare",
      calc: "Hog margin calculator",
      datasets: "Data and API",
    },
  },

  nav: {
    pages: "Pages",
    language: "Language",
    overview: "Overview",
    week: "This week",
    wall: "Wall",
    compare: "Compare",
    calc: "Calculator",
    datasets: "Data",
  },

  gauge: {
    stale: "STALE",
    staleSince: (date: string, days: number) =>
      `No new data since ${date} (${days} days)`,
  },

  search: {
    open: "Search",
    title: "Find a series (press / or ⌘K)",
    label: "Find a series",
    placeholder: "A name in either language, or an id",
    none: "No series matches.",
    compare: "compare",
    hint: "↑↓ to move · Enter opens its page · Esc closes",
  },

  theme: {
    switch: "Switch theme",
    system: "System",
    light: "Light",
    dark: "Dark",
  },

  health: {
    reached: (when: string) => `last collected ${when} UTC`,
    overdue: "a collector is overdue: newer releases may be missing",
    never: "never",
  },

  asOf: {
    label: "As of",
    clear: "Back to today",
    hint: "Show only what had been published by a past day.",
    banner: (day: string) => (
      <>
        Showing <b className="num">{day}</b>: only what had been published by then.
      </>
    ),
    latest: "Latest knowable reading",
    released: (date: string) => `published ${date}`,
    learned: (date: string) => `collected ${date} (release date not stated)`,
    nothing: (day: string) => `Nothing of this series was knowable on ${day}.`,
    firstPublished: (date: string) => `Its earliest release held here is ${date}.`,
    firstLearned: (date: string) => `First collected ${date}; the source gives no release dates.`,
    marker: "as of",
    panelNone: (first: { date: string; basis: "published" | "learned" } | null) =>
      first == null
        ? "not knowable on this day"
        : first.basis === "published"
        ? `not knowable on this day: first released ${first.date}`
        : `not knowable on this day: first collected ${first.date}`,
    startsAt: (month: string) => `knowable periods start ${month}`,
    knownFrom: "Known from",
  },

  window: {
    label: "Window",
    ranges: { all: "All", "8y": "8Y", "5y": "5Y", "3y": "3Y", "1y": "1Y" },
    stamp: (known: string, start: string, end: string) =>
      `Knowledge as of ${known} · data window ${start} → ${end}`,
  },

  // The 404 page has no language of its own (one page answers every wrong
  // address, /zh/ or not), so it shows both.
  notFound: {
    title: "Page not found",
    body: "The address may be mistyped, or that week's issue is not out yet.",
    home: "Overview",
    week: "This week's digest",
    data: "Data and API",
  },
};
