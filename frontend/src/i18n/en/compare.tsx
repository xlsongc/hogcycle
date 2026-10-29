/** The compare page, its picker and the overlay chart. */

export const compare = {
  compare: {
    heading: "Compare",
    sub: <>Any series on one time axis. Mixed units are indexed to the start of the window.</>,
    lag: "Shift",
    noLag: "None",
    forward: "Forward by",
    months: (n: number) => `${n} mo`,
    lagNote: <>Shift a series forward to test a lead, e.g. breeding sows by 10–12 months onto the hog price.</>,
    share: "Copy the address to share this view.",
    tableCaption:
      "The series shown, by month, in their own units: the last observation in each month, inside the window, with any shift applied.",
    tableNote: (rows: number) => `Own units, last reading of each month, shift applied · ${rows} rows`,
    undated: (names: string[]) => `Not drawn by release date (no dates from the source): ${names.join(", ")}.`,
    signed: (names: string[]) =>
      `Not drawn when indexed (crosses zero): ${names.join(", ")}. Pair with series in the same unit.`,
  },

  lagScan: {
    heading: "Which shift lines up best",
    against: "Against",
    basis: "Compare",
    yoy: "year-on-year changes",
    level: "levels",
    here: (k: number, r: string, n: number) =>
      `Shifted ${k} months, the correlation is ${r} over ${n} months.`,
    hereNone: (k: number) => `Shifted ${k} months, too few months overlap for a correlation.`,
    best: (k: number, r: string, n: number) => `The strongest is at ${k} months: ${r} over ${n}.`,
    note: (basis: "yoy" | "level") =>
      `Correlation at each shift from 0 to 24 months, month-end values${basis === "yoy" ? ", year-on-year" : ""}. About three cycles of history.`,
    tooFew: "Too few months overlap at any shift for a correlation (24 at least).",
    label: (lead: string, target: string) =>
      `Correlation of ${lead}, shifted 0 to 24 months, with ${target}`,
  },

  picker: {
    atCapTitle: (max: number) => `At most ${max} series at once`,
    selected: (n: number, max: number) => `${n}/${max} selected`,
    atCap: " · at limit",
    chosen: "Shown",
    find: "Find a series to add",
    showAll: (n: number) => `All ${n} series`,
    hideAll: "Hide the list",
    none: "No series matches.",
  },

  overlay: {
    indexAxis: (log: boolean) => `Index (start = 100${log ? ", log axis" : ""})`,
    shifted: (months: number) => ` (+${months} mo)`,
    indexedNote: (log: boolean) => (
      <>
        Mixed units: indexed to the start of the window{log ? ", log axis" : ""}
      </>
    ),
    label: (n: number, indexed: boolean) =>
      `Overlay, ${n} series, ${indexed ? "indexed" : "raw values"}`,
  },
};
