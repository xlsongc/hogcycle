/** 养殖利润计算器（docs/adr/0038）。 */

import type { Dict } from "../en";

export const calc: Pick<Dict, "calc"> = {
  calc: {
    heading: "养殖利润计算器",
    sub: "按你的出栏重、成本和售价，算每头猪现在卖和按各期货价卖的盈亏。默认值取自本站最新数据。",
    inputs: "你的数字",
    weight: "出栏体重",
    cost: "每公斤完全成本",
    price: "你今天能卖的价",
    basis: "基差：你的价 − 期货价",
    heads: "这批头数",
    units: { kg: "公斤", perKg: "元/公斤", head: "头", perTonne: "元/吨", perHead: "元/头", lots: "手", yuan: "元" },
    from: (name: string, value: string, date: string) => `默认：${name}，${value}，${date}`,
    costFrom: (value: string, date: string) => `默认：规模场盈亏平衡价（估算），${value}，${date} 当周`,
    basisFrom: "默认 0",
    basisToday: (local: string, month: string, fut: string, gap: string) =>
      `今天：500 县生猪价 ${local}，${month} 合约 ${fut}，相差 ${gap}。`,
    useBasis: "用这个差",
    reset: "恢复本站数据",
    share: "地址栏里的链接会保留这些数字。",
    memory: "出栏体重、成本、基差和头数只记在这个浏览器里。",
    restored: (fields: string) => `已填入你上次的数字：${fields}。`,
    kept: { weight: "出栏体重", cost: "成本", basis: "基差", heads: "头数" },
    listJoin: "、",
    forget: "清除",
    nowHeading: "现在出栏",
    perHead: "每头",
    perBatch: (n: string) => `这批 ${n} 头`,
    gapUp: (kg: string, pct: string) => `价格还要涨 ${kg}（${pct}）才到你的成本。`,
    gapDown: (kg: string, pct: string) => `价格比你的成本高 ${kg}（${pct}）。`,
    revenue: "每头收入",
    costHead: "每头成本",
    forwardHeading: "按期货价卖",
    forwardNote: "各合约最新结算价加上你的基差，也就是套保能锁定的价格。",
    forwardTrack: (six: number, signed: number, n: number) =>
      `以往交割前 6 个月的价格，与最终结算价平均相差 ${six}%，平均${signed >= 0 ? "偏高" : "偏低"} ${Math.abs(signed)}%（2021 年以来 ${n} 个合约）。`,
    forwardCaption: "按各期货合约最新结算价，每头猪的盈亏",
    clears: (above: number, total: number, first: string | null) =>
      above === 0
        ? `按你的成本和基差，${total} 个合约都没到盈亏平衡价。`
        : above === total
          ? `按你的成本和基差，全部 ${total} 个合约都在盈亏平衡价以上。`
          : `按你的成本和基差，${total} 个合约里有 ${above} 个在盈亏平衡价以上，最早的是 ${first} 合约。`,
    chart: { today: "今天", cost: (v: string) => `你的成本 ${v}` },
    cols: {
      month: "交割月",
      settle: "结算价",
      local: "折合你的价",
      perHead: "每头",
      batch: "这批",
      lots: "手数",
    },
    lotsNote: (kg: string) => `一手是 16 吨生猪；这批共重 ${kg}。`,
    gridHeading: "结果随什么变",
    gridNote: "每头盈亏：纵向是售价，横向是成本，加框的是你填的数。",
    gridCaption: "每头盈亏，按售价和成本",
    priceAxis: "售价 ↓",
    costAxis: "成本 →",
    disclaimer: "不构成建议。套保有追加保证金和基差风险。",
    noFutures: "没有期货结算价记录，所以只算现在出栏。",
  },
};
