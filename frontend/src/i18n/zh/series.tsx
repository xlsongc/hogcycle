/** 单个序列自己的页面。 */

import type { ReactNode } from "react";
import type { Dict } from "../en";

export const series: Pick<Dict, "series" | "span"> = {
  series: {
    back: "全部读数",
    publisher: "发布方",
    sourcePage: "源页面",
    noUrl: "没有公开页面：通过接口采集。",
    retired: "上游已关闭这个口径，本页只保留历史。",
    caliberEarlier: (from: string | null, link: ReactNode) => (
      <>
        {from ? `新口径始于 ${from}。` : ""}此前的口径是另一个序列：{link}。
      </>
    ),
    caliberLater: (until: string | null, link: ReactNode) => (
      <>
        {until ? `此口径止于 ${until}。` : ""}此后的口径是另一个序列：{link}。
      </>
    ),
    equity: "股价是对周期的索取权，不是周期的一环，所以不在图表墙上。",
    forecast: "这是 USDA 的估计与预测，不是测量，所以不放在图表墙上。",
    releaseForecast: "预测在它描述的时期结束之前发布，并随时期临近而修订。USDA 每年 4 月和 10 月设定中国的数字。",
    ahead: (date: string, days: number) => `${date} 发布，比时期结束早 ${days} 天`,
    latest: "最新读数",
    chartHeading: "历史",
    releaseHeading: "什么时候公开",
    releaseBody: (median: number, max: number, n: number) => (
      <>
        期末后中位 <b className="num">{median}</b> 天公开，最长 <b className="num">{max}</b>{" "}
        天，基于 <b className="num">{n}</b> 次有日期的发布。回测也必须等这么久。
      </>
    ),
    releaseNext: (period: string, usual: string, by: string) => (
      <>
        下一期：{period}。通常 <b className="num">{usual}</b> 前发布；过了{" "}
        <b className="num">{by}</b> 仍未发布，就比有记录以来的每一次都晚。这是从过去的发布推出的预期，不是发布日期。
      </>
    ),
    releaseNone: "源头没有注明发布日期，所以每个数值是哪天公开的并不知道。不要假设它在期末当天就公开了。",
    revisionsHeading: "修订记录",
    revisionsNote: "同一时期出现过的每个数值，按本仓库得知的先后排列。没有任何覆盖。",
    revisionsNone: "自首次记录以来没有数值变过。若有修订，会作为同一时期的第二次发布出现在这里。",
    cols: {
      period: "时期",
      value: "数值",
      change: "变化",
      released: "发布",
      learned: "采集",
    },
    unknown: "未注明",
    recentHeading: "最近读数",
    download: "下载 CSV",
    downloadNote: "全分辨率、全历史；图上的日频数据经过抽稀。",
    onWall: "在因果链图表墙上查看",
    inCompare: "和其他序列对比",
    showAll: (n: number) => `显示全部 ${n} 个读数`,
    showRecent: "只显示最近 12 个",
    allNote: "每个读数都是原始分辨率，最新的在前。",
  },

  span: {
    heading: "所选区间",
    hint: "选一个区间，或在图上拖选一段，可以看到这段时间的变化和高低点。",
    note: (n: number) => `${n} 个读数 · 由你的浏览器根据图上的点计算`,
    first: "起",
    last: "止",
    change: "变化",
    high: "最高",
    low: "最低",
    noPct: "不给百分比：区间内有零或负值",
    rank: (below: number, others: number) =>
      below === 0 ? (
        <>最后一个读数是区间内最低的。</>
      ) : below === others ? (
        <>最后一个读数是区间内最高的。</>
      ) : (
        <>
          最后一个读数高于区间内其余 <b className="num">{others}</b> 个中的{" "}
          <b className="num">{below}</b> 个。
        </>
      ),
  },
};
