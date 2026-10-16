/** 对比页、序列选择器和叠放图。 */

import type { Dict } from "../en";

export const compare: Pick<Dict, "compare" | "picker" | "overlay"> = {
  compare: {
    heading: "对比",
    sub: (
      <>
        任选序列压在一条时间轴上。单位一致时画原值；单位混杂时全部指数化到窗口起点，因为把不同量纲塞进两条纵轴会凭空造出数据里没有的相关性。股票只出现在这里 ——
        股价是对周期的索取权，不是周期的一环。
      </>
    ),
    lag: "位移",
    noLag: "不位移",
    forward: "前移",
    months: (n: number) => `${n} 个月`,
    lagNote: (
      <>
        把某条序列整体前移，检验领先关系。能繁母猪前移 10–12 个月压到猪价上 ——
        生物学把这个滞后钉死了（妊娠 114 天 + 育肥 6 个月），所以对齐得上不是巧合。这也是判断「产能信号<i>当时</i>能不能叫出拐点」的第一张图。
      </>
    ),
    share: "这个视图记在地址栏里 —— 复制网址即可分享。",
    undated: (names: string[]) =>
      `未画出：${names.join("、")}。它们的源头不写发布日期，本页从不猜测日期。`,
    signed: (names: string[]) =>
      `未画出：${names.join("、")}。${names.length > 1 ? "它们" : "它"}会跌到零以下，以首值为 100 的指数没有意义；和同单位的序列一起选，就能看到。`,
  },

  picker: {
    atCapTitle: (max: number) =>
      `最多同时叠放 ${max} 条 —— 再多就得生成新色相，而生成的色相在色觉缺陷下与已有色无法区分`,
    selected: (n: number, max: number) => `已选 ${n}/${max}`,
    atCap: " · 已达上限",
  },

  overlay: {
    indexAxis: (log: boolean) => `指数（起点=100${log ? "，对数轴" : ""}）`,
    shifted: (months: number) => ` (前移${months}月)`,
    indexedNote: (log: boolean) => (
      <>
        所选序列单位不一致，已全部指数化到窗口起点 —— 比较的是相对涨跌，不是水平
        {log ? "。跨度超过 10 倍，已切换对数轴，使等百分比涨幅占等高" : ""}
      </>
    ),
    label: (n: number, indexed: boolean) =>
      `叠放图，${n} 条序列，${indexed ? "指数化" : "原值"}`,
  },
};
