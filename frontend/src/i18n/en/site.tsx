/** The foot of every page, the method disclosure, and the data page. */

export const site = {
  more: {
    howTo: "How to read and use it",
    method: "How this is built",
  },

  foot: {
    about: "China's hog cycle from primary sources. Each number names its source and release date.",
    disclaimer: "Data as published by its sources. Nothing here is investment advice.",
    pages: "Pages",
    data: "Data",
    project: "Project",
    index: "Every series (JSON)",
    feed: "Release feed (Atom)",
    weekFeed: "Weekly digest (Atom)",
    downloads: "Downloads and API",
    code: "Source code",
    decisions: "Design decisions",
    issues: "Report a problem",
  },

  datasets: {
    heading: "Data and API",
    sub: "Every series as CSV and JSON. Updated daily, free to use.",
    endpointsHeading: "Endpoints",
    endpointsNote: "Static files at stable addresses; no key.",
    endpoints: [
      ["data/index.json", "Every series: name, unit, frequency, latest value and links to its files."],
      ["data/series/<id>.csv", "One series, every reading. Open it straight in a spreadsheet."],
      ["data/series/<id>.json", "The same rows as JSON."],
      ["feed.xml", "New releases as an Atom feed, for a feed reader."],
      ["week.xml", "The weekly digest as an Atom feed: one entry per finished week."],
      ["data/futures/lh_contracts.csv", "Every 大商所 live-hog contract since LH2109, one row per contract and trading day (a day whose settle did not move has no row)."],
    ] as [string, string][],
    columnsHeading: "What the columns mean",
    columns: [
      ["obs_date", "The last day of the period the value describes."],
      ["value", "As the source printed it, in the series' unit."],
      ["granularity", "daily, weekly, monthly, quarterly or annual: rows of one series can differ."],
      ["published_on", "The day the source released it, where the source says; blank where it does not."],
      ["learned", "The day this warehouse first fetched it."],
    ] as [string, string][],
    example: "Example",
    seriesHeading: "Every series",
    seriesNote: "Grouped along the chain; each source is on the series' page.",
    cols: { name: "Series", unit: "Unit", freq: "Frequency", latest: "Latest", files: "Files" },
    freq: {
      daily: "daily",
      weekly: "weekly",
      monthly: "monthly",
      quarterly: "quarterly",
      annual: "annual",
    } as Record<string, string>,
    offWall: "Off the wall",
    citeHeading: "Citing",
    cite: (name: string, date: string) =>
      `hogcycle, “${name}”, xlsongc.github.io/hogcycle, retrieved ${date}. Name the original publisher too: it is on the series' page.`,
    rights:
      "The underlying figures belong to the agencies and exchanges that publish them; check their terms before republishing. Estimates computed here say so in their names.",
  },
};
