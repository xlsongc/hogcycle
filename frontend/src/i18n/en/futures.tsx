/** One contract at a time, and the market's track record (docs/adr/0036, 0041). */

export const futures = {
  futures: {
    contract: (delivery: string) => `LH${delivery.slice(2, 4)}${delivery.slice(5, 7)}`,
    contractHeading: "Contracts",
    deliveredPick: "Delivered…",
    liveSum: (code: string, last: string, on: string, week: string | null, sinceFirst: string) =>
      `${code}: ${last} on ${on}${week ? `, ${week} on the week` : ""}, ${sinceFirst} since its first week.`,
    doneSum: (
      code: string,
      final: string,
      on: string,
      far: { months: number; v: string; pct: string } | undefined
    ) =>
      `${code} finished at ${final} on ${on}.${far ? ` ${far.months} months before delivery it was ${far.v}, ${far.pct} against that.` : ""}`,
    whole: "All contracts since 2021",
    closeIn: (code: string) => `Back to ${code}`,
    finalLine: (v: string) => `Last settle ${v}`,
    contractLabel: (code: string) => `${code}: settle by week, among the other contracts`,
    weeksCaption: (code: string) => `${code}: the last settle of each week`,
    allWeeks: (n: number) => `All ${n} weeks`,
    download: "Every contract, every day (CSV)",
    curveTable: "Settle by delivery month",

    trackHeading: "How far off the market has been",
    trackNote: (n: number, first: string) =>
      `${n} delivered contracts since ${first}: the settle 1, 3, 6 and 9 months before delivery, against the last settle.`,
    cols: {
      ahead: "Ahead",
      n: "Contracts",
      meanAbs: "Mean miss",
      mean: "Mean, signed",
      worst: "Largest",
      week: "Week of",
      settle: "Settle",
      onWeek: "Week",
      vsFirst: "vs first week",
      vsFinal: "vs last settle",
    },
    months: (m: number) => `${m} mo`,
    signedNote: "Signed: above zero, the market priced higher than the contract finished.",
    showContracts: "Every contract",
    hideContracts: "Hide the contracts",
    deliveryCol: "Delivery",
    finalCol: "Last settle",
    caption: "Each delivered contract's settle months ahead, and its miss against its last settle",
    chartLabel: (n: number) =>
      `Live hog futures: ${n} contracts, each by week from listing to delivery`,
    asOfHidden: "Not shown for a past day.",
  },
};
