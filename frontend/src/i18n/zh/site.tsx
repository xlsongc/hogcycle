/** 每页的页脚、方法说明的折叠标签，以及数据页。 */

import type { Dict } from "../en";

export const site: Pick<Dict, "more" | "foot" | "datasets"> = {
  more: {
    howTo: "怎么读、怎么用",
    method: "怎么算的",
  },

  foot: {
    about: "中国猪周期一手数据，每个数字都注明来源和发布日期。",
    disclaimer: "数据按来源公布的原样提供，不构成投资建议。",
    pages: "页面",
    data: "数据",
    project: "项目",
    index: "全部序列（JSON）",
    feed: "发布订阅（Atom）",
    weekFeed: "周报订阅（Atom）",
    downloads: "下载与接口",
    code: "源代码",
    decisions: "设计决策记录",
    issues: "报告问题",
  },

  datasets: {
    heading: "数据与接口",
    sub: "每个序列都有 CSV 和 JSON，每天更新，免费使用。",
    endpointsHeading: "接口",
    endpointsNote: "静态文件，地址长期不变，不需要密钥。",
    endpoints: [
      ["data/index.json", "全部序列：名称、单位、频率、最新值和各自文件的链接。"],
      ["data/series/<id>.csv", "一个序列的全部读数，可以直接用表格打开。"],
      ["data/series/<id>.json", "同样的行，JSON 格式。"],
      ["feed.xml", "新发布的数据，Atom 订阅格式，可用阅读器订阅。"],
      ["week.xml", "猪市周报的 Atom 订阅，每过完一周新增一条。"],
      ["data/futures/lh_contracts.csv", "大商所生猪期货 LH2109 以来每个合约的逐日结算价，每个合约每个交易日一行（结算价没变的那天没有行）。"],
    ],
    columnsHeading: "各列的含义",
    columns: [
      ["obs_date", "数值所描述时期的最后一天。"],
      ["value", "来源公布的原值，单位见该序列。"],
      ["granularity", "日、周、月、季或年度：同一序列的行可能不同。"],
      ["published_on", "来源发布它的日期，来源注明时才有，否则留空。"],
      ["learned", "本站第一次抓到它的日期。"],
    ],
    example: "示例",
    seriesHeading: "全部序列",
    seriesNote: "按因果链分组，来源见各序列页面。",
    cols: { name: "序列", unit: "单位", freq: "频率", latest: "最新", files: "文件" },
    freq: {
      daily: "日度",
      weekly: "周度",
      monthly: "月度",
      quarterly: "季度",
      annual: "年度",
    },
    offWall: "不在图表墙上",
    citeHeading: "引用",
    cite: (name: string, date: string) =>
      `hogcycle，《${name}》，xlsongc.github.io/hogcycle，${date} 取得。请同时注明原始发布机构，见该序列页面。`,
    rights: "原始数据的权利属于发布它的机构和交易所，转载前请查看它们的条款。本站计算的估算值，名字里都注明了“估算”。",
  },
};
