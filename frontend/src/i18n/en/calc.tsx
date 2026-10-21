/** The hog margin calculator (docs/adr/0038). */

export const calc = {
  calc: {
    heading: "Hog margin calculator",
    sub: "What a hog earns or loses at your weight, cost and price: today, and at each price the futures market quotes ahead. It starts from this site's latest figures; replace them with your own.",
    inputs: "Your numbers",
    weight: "Live weight at sale",
    cost: "Full cost per kg",
    price: "Your price today",
    basis: "Basis: your price minus futures",
    heads: "Hogs in the batch",
    units: { kg: "kg", perKg: "CNY/kg", head: "head", perTonne: "CNY/t", perHead: "CNY/head", lots: "lots", yuan: "CNY" },
    from: (name: string, value: string, date: string) => `default: ${name}, ${value}, ${date}`,
    costFrom: (value: string, date: string) =>
      `default: this site's estimated breakeven for scale farms, ${value}, week of ${date}. An estimate; your own cost is better.`,
    basisFrom: "default 0: futures and your market differ in grade, place and timing, and only you know by how much.",
    basisToday: (local: string, month: string, fut: string, gap: string) =>
      `Today: the 500-county price is ${local} and the ${month} contract ${fut}, a gap of ${gap}.`,
    useBasis: "Use that gap",
    reset: "Back to the site's figures",
    share: "The link in the address bar keeps these numbers.",
    nowHeading: "Selling today",
    perHead: "per hog",
    perBatch: (n: string) => `for ${n} hogs`,
    gapUp: (kg: string, pct: string) => `The price needs to rise ${kg} (${pct}) to reach your cost.`,
    gapDown: (kg: string, pct: string) => `The price is ${kg} (${pct}) above your cost.`,
    revenue: "Revenue per hog",
    costHead: "Cost per hog",
    forwardHeading: "Selling at the futures price",
    forwardNote:
      "Each hog at each contract's latest settle, moved by your basis. A hedge fixes that price for the hogs it covers. Whether the price turns out to have been right is another matter.",
    forwardTrack: (six: number, signed: number, n: number) =>
      `How far off such prices have been: six months before delivery, a settle sat ${six}% from where its contract finished on average, ${Math.abs(signed)}% ${signed >= 0 ? "above" : "below"} on the signed average (${n} contracts since 2021).`,
    forwardCaption: "Profit or loss per hog at each futures contract's latest settle",
    cols: {
      month: "Delivery",
      settle: "Settle",
      local: "Your price",
      perHead: "Per hog",
      batch: "Batch",
      lots: "Lots",
    },
    lotsNote: (kg: string) => `A lot is 16 tonnes of live hogs; the batch weighs ${kg}.`,
    gridHeading: "How the answer moves",
    gridNote:
      "Profit or loss per hog as your price (down the side) and your cost (across the top) move a yuan at a time. Your own numbers are the outlined cell.",
    gridCaption: "Profit or loss per hog, by price and cost",
    priceAxis: "Price ↓",
    costAxis: "Cost →",
    disclaimer:
      "Arithmetic on the numbers above, not advice. Futures carry margin calls and basis risk; a hedge needs a futures broker and a plan for both.",
    noFutures: "No futures settles are on file, so only today's sale is shown.",
  },
};
