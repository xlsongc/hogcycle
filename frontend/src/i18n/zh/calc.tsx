/** 养殖利润计算器（docs/adr/0038）。 */

import type { Dict } from "../en";

export const calc: Pick<Dict, "calc"> = {
  calc: {
    heading: "养殖利润计算器",
    sub: "按你的出栏重、成本和售价，算一头猪现在卖赚多少、亏多少，以及按期货市场给出的未来价格卖又是多少。默认值是本站最新的数据，换成你自己的数更准。",
    inputs: "你的数字",
    weight: "出栏体重",
    cost: "每公斤完全成本",
    price: "你今天能卖的价",
    basis: "基差：你的价 − 期货价",
    heads: "这批头数",
    units: { kg: "公斤", perKg: "元/公斤", head: "头", perTonne: "元/吨", perHead: "元/头", lots: "手", yuan: "元" },
    from: (name: string, value: string, date: string) => `默认：${name}，${value}，${date}`,
    costFrom: (value: string, date: string) =>
      `默认：本站估算的规模场盈亏平衡价，${value}，${date} 当周。这是估算，用你自己的成本更准。`,
    basisFrom: "默认 0：期货和你所在的市场在品级、地点、时间上都不一样，差多少只有你知道。",
    basisToday: (local: string, month: string, fut: string, gap: string) =>
      `今天：500 县生猪价 ${local}，${month} 合约 ${fut}，相差 ${gap}。`,
    useBasis: "用这个差",
    reset: "恢复本站数据",
    share: "地址栏里的链接会保留这些数字。",
    nowHeading: "现在出栏",
    perHead: "每头",
    perBatch: (n: string) => `这批 ${n} 头`,
    gapUp: (kg: string, pct: string) => `价格还要涨 ${kg}（${pct}）才到你的成本。`,
    gapDown: (kg: string, pct: string) => `价格比你的成本高 ${kg}（${pct}）。`,
    revenue: "每头收入",
    costHead: "每头成本",
    forwardHeading: "按期货价卖",
    forwardNote:
      "每头猪按各合约最新结算价、加上你的基差来卖。套期保值能把它覆盖的那部分猪锁在这个价上；这个价事后看对不对，是另一回事。",
    forwardTrack: (six: number, signed: number, n: number) =>
      `这类价格以往偏离多少：交割前 6 个月，结算价与合约最后的结算价平均相差 ${six}%，带方向平均${signed >= 0 ? "高出" : "低于"} ${Math.abs(signed)}%（2021 年以来 ${n} 个合约）。`,
    forwardCaption: "按各期货合约最新结算价，每头猪的盈亏",
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
    gridNote: "售价（纵向）和成本（横向）每次变动 1 元/公斤时，每头的盈亏。加框的格子是你填的数。",
    gridCaption: "每头盈亏，按售价和成本",
    priceAxis: "售价 ↓",
    costAxis: "成本 →",
    disclaimer: "这是对上面数字的算术，不是建议。期货有追加保证金和基差风险；做套保需要期货公司，也需要应对这两种风险的计划。",
    noFutures: "没有期货结算价记录，所以只算现在出栏。",
  },
};
