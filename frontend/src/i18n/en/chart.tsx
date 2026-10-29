/** Words the charts draw and every page names: tiers, granularities. */

export const chart = {
  chart: {
    noData: "No data in this window",
    noneNear: "nothing near this date",
    published: (date: string, lag: number) =>
      lag >= 0 ? `published ${date} · +${lag}d` : `published ${date} · ${-lag}d ahead`,
    startsAt: (month: string) => `data from ${month}`,
    datedFrom: (month: string) => `dated releases from ${month}`,
    undated: "no release dates, so not drawn by release date",
    caliberFrom: (month: string) => `new caliber from ${month}`,
    cadence: {
      D: "daily",
      W: "weekly",
      M: "monthly",
      Q: "quarterly",
      A: "annual",
    },
    cadenceBreak: (from: string, to: string) => `${from} → ${to}`,
    granularityName: {
      D: "daily reading",
      W: "weekly reading",
      M: "monthly reading",
      Q: "quarterly reading",
      A: "annual reading",
    },
    tierNote: {
      capacity: "Capacity: leads the hog price by 10–12 months",
      margin: "Margin",
      price: "Price",
      noise: "Other",
      equity: "Equities",
      market: "Futures",
    },
    panelLabel: (name: string, unit: string, n: number) =>
      `${name}, unit ${unit}, ${n} observations`,
    keys: "Left and right arrows step through the readings; Home and End jump to the ends.",
    spoken: (value: string, unit: string, date: string, kind: string, published?: string) =>
      `${value} ${unit}, ${date}, ${kind}${published ? `, published ${published}` : ""}`,
    coarse: "coarse",
    revised: (n: number) => `revised: ${n} values on record`,
  },

  tier: {
    capacity: "Capacity",
    margin: "Margin",
    price: "Price",
    noise: "Noise",
    equity: "Equity",
    market: "Market",
  },

  granularity: { D: "D", W: "W", M: "M", Q: "Q", A: "A" },
};
