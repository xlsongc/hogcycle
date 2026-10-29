/** 图上画的字和各页共用的名称：层级、粒度。 */

import type { Dict } from "../en";

export const chart: Pick<Dict, "chart" | "tier" | "granularity"> = {
  chart: {
    noData: "此期间无数据",
    noneNear: "该日期附近无数据",
    published: (date: string, lag: number) =>
      lag >= 0 ? `${date} 发布 · 晚 ${lag} 天` : `${date} 发布 · 提前 ${-lag} 天`,
    startsAt: (month: string) => `数据始于 ${month}`,
    datedFrom: (month: string) => `发布日期始于 ${month}`,
    undated: "源头未注明发布日期，按发布日放置时不画",
    caliberFrom: (month: string) => `新口径始于 ${month}`,
    cadence: {
      D: "日度",
      W: "周度",
      M: "月度",
      Q: "季度",
      A: "年度",
    },
    cadenceBreak: (from: string, to: string) => `${from} → ${to}`,
    granularityName: {
      D: "日度读数",
      W: "周度读数",
      M: "月度读数",
      Q: "季度读数",
      A: "年度读数",
    },
    tierNote: {
      capacity: "产能：领先猪价 10–12 个月",
      margin: "利润",
      price: "价格",
      noise: "其他",
      equity: "股票",
      market: "期货",
    },
    panelLabel: (name: string, unit: string, n: number) =>
      `${name}，单位 ${unit}，共 ${n} 个观测点`,
    keys: "左右方向键逐个读数，Home 和 End 跳到两端。",
    spoken: (value: string, unit: string, date: string, kind: string, published?: string) =>
      `${value} ${unit}，${date}，${kind}${published ? `，${published} 发布` : ""}`,
    revised: (n: number) => `修订过：共记录 ${n} 个数值`,
    coarse: "粗粒度",
  },

  tier: {
    capacity: "产能",
    margin: "利润",
    price: "价格",
    noise: "噪音",
    equity: "股票",
    market: "市场",
  },

  granularity: { D: "日", W: "周", M: "月", Q: "季", A: "年" },
};
