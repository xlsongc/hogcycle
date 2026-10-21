/** The futures curve's history and the market's track record (docs/adr/0036). */

export const futures = {
  futures: {
    historyHeading: "How the market priced each delivery month",
    historyNote:
      "Every contract since the first, LH2109, by the last settle of each week, from listing to delivery. A line ends where its contract finished. The contracts still trading are drawn in colour. Point at a week to read the whole curve as it stood then.",
    contract: (delivery: string) => `LH${delivery.slice(2, 4)}${delivery.slice(5, 7)}`,
    trackHeading: "How far off the market has been",
    trackNote: (n: number, first: string) =>
      `Every delivered contract (${n}, the first delivering in ${first}): its settle 1, 3, 6 and 9 months before its delivery month began, against where it finished. Arithmetic on settles, not a model. It says how wide the market's misses have been, not where the next one will land.`,
    cols: {
      ahead: "Ahead",
      n: "Contracts",
      meanAbs: "Mean miss",
      mean: "Mean, signed",
      worst: "Largest",
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
    asOfHidden:
      "The track record describes today's history, so it is hidden while the page stands on a past day.",
  },
};
