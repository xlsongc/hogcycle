/** The hog margin calculator (docs/adr/0038). */

export const calc = {
  calc: {
    heading: "Hog margin calculator",
    sub: "Profit or loss per hog at your weight, cost and price, today and at each futures price. Starts from this site's latest figures.",
    inputs: "Your numbers",
    weight: "Live weight at sale",
    cost: "Full cost per kg",
    price: "Your price today",
    basis: "Basis: your price minus futures",
    heads: "Hogs in the batch",
    units: { kg: "kg", perKg: "CNY/kg", head: "head", perTonne: "CNY/t", perHead: "CNY/head", lots: "lots", yuan: "CNY" },
    from: (name: string, value: string, date: string) => `default: ${name}, ${value}, ${date}`,
    costFrom: (value: string, date: string) =>
      `default: estimated scale-farm breakeven, ${value}, week of ${date}`,
    basisFrom: "default 0",
    basisToday: (local: string, month: string, fut: string, gap: string) =>
      `Today: the 500-county price is ${local} and the ${month} contract ${fut}, a gap of ${gap}.`,
    useBasis: "Use that gap",
    reset: "Back to the site's figures",
    share: "The link in the address bar keeps these numbers.",
    memory: "Weight, cost, basis and batch size are remembered in this browser only.",
    restored: (fields: string) => `Filled in from your last visit: ${fields}.`,
    kept: { weight: "weight", cost: "cost", basis: "basis", heads: "batch size" },
    listJoin: ", ",
    forget: "Forget them",
    nowHeading: "Selling today",
    perHead: "per hog",
    perBatch: (n: string) => `for ${n} hogs`,
    gapUp: (kg: string, pct: string) => `The price needs to rise ${kg} (${pct}) to reach your cost.`,
    gapDown: (kg: string, pct: string) => `The price is ${kg} (${pct}) above your cost.`,
    revenue: "Revenue per hog",
    costHead: "Cost per hog",
    forwardHeading: "Selling at the futures price",
    forwardNote: "Each contract's latest settle plus your basis: the price a hedge would lock in.",
    forwardTrack: (six: number, signed: number, n: number) =>
      `Six months before delivery, settles have missed the final price by ${six}% on average, ${Math.abs(signed)}% ${signed >= 0 ? "too high" : "too low"} signed (${n} contracts since 2021).`,
    forwardCaption: "Profit or loss per hog at each futures contract's latest settle",
    clears: (above: number, total: number, first: string | null) =>
      above === 0
        ? `At your cost and basis, none of the ${total} contracts reaches breakeven.`
        : above === total
          ? `At your cost and basis, all ${total} contracts are at or above breakeven.`
          : `At your cost and basis, ${above} of ${total} contracts are at or above breakeven, the first for ${first} delivery.`,
    chart: { today: "Today", cost: (v: string) => `Your cost ${v}` },
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
    gridNote: "Per hog, price down the side, cost across; your numbers are outlined.",
    gridCaption: "Profit or loss per hog, by price and cost",
    priceAxis: "Price ↓",
    costAxis: "Cost →",
    disclaimer: "Not advice. Hedging carries margin calls and basis risk.",
    noFutures: "No futures settles are on file, so only today's sale is shown.",
  },
};
