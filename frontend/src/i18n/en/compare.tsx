/** The compare page, its picker and the overlay chart. */

export const compare = {
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
};
