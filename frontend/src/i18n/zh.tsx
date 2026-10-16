/**
 * 中文文案。类型来自 en.tsx —— 少一个键就是编译错误，
 * 而不是英文句子出现在中文段落里。
 *
 * 指标名不在这里：它属于指标本身，随契约一起过来（ADR-0014），
 * 因为口径就写在名字里。
 */

import type { ReactNode } from "react";
import type { Dict } from "./en";

/** 一段连续读数的期间量词（「连续 4 个季度下降」）。 */
const UNIT_ZH: Record<string, string> = {
  D: "天",
  W: "周",
  M: "个月",
  Q: "个季度",
  A: "年",
};

export const zh: Dict = {
  meta: {
    title: "猪周期图表墙",
    description: "把猪周期的因果链放在一条共享时间轴上，供人判断，不代人判断。",
    pages: {
      overview: "总览",
      wall: "因果链图表墙",
      compare: "对比",
    },
  },

  nav: {
    pages: "页面",
    language: "语言",
    overview: "总览",
    wall: "因果链",
    compare: "对比",
  },


  gauge: {
    stale: "停更",
    staleSince: (date: string, days: number) => `${date} 之后无新数据（${days} 天）`,
  },

  overview: {
    thesisHeading: "产能领先价格",
    thesisNote: (
      <>
        把能繁母猪存栏按所选月数整体前移，放在它理应领先的猪价上方。这个滞后由生物学钉死在 10–12 个月（妊娠 114 天 + 育肥约 6 个月），所以位移量不是拟合出来的参数。两格共用一条时间轴、各自一套纵轴：<b>不是双轴图</b>。今天之后的那段前移曲线，是已经存在的产能被画在生物学让它上市的位置 —— 这是对齐，<b>不是预测</b>。
      </>
    ),
    lead: "前移",
    leadOption: (n: number) => (n ? `${n} 个月` : "不前移"),
    shifted: (n: number) => (n ? `（前移 ${n} 个月）` : ""),
    today: "今天",
    changesNote: (
      <>
        由管道按固定定义计算出的事实：相对阈值的连续位置、多年极值、停止更新的序列。
        <b>没有一条是阶段判定</b> —— 判断留给读者。
      </>
    ),
    groups: {
      runs: "阈值",
      extremes: "多年极值",
      stale: "停止更新",
    },
    extreme: (kind: "low" | "high", since: string, all: boolean) =>
      `${all ? `序列开始（${since}）` : since}以来${kind === "low" ? "最低" : "最高"}`,
    run: (below: boolean, line: string, n: number, since: string) =>
      `自 ${since} 起连续 ${n} 期在${line}${below ? "下方" : "上方"}`,
    staleFor: (days: number, date: string) => `最后读数 ${date}，已 ${days} 天`,
    nothing: "按这些定义，暂无可报告的事实。",

    heading: "猪周期现在在哪",
    lede: (
      <>
        三个读数，按因果顺序排列：能繁母猪决定 10–12 个月后的生猪供给，猪价是这批供给落地的地方，猪粮比决定养殖户还愿不愿意补栏。每个数字都注明了它描述的时期和公开的日期。没有一个是阶段判定。
      </>
    ),
    stamp: (asOf: string) => `数据截至 ${asOf}`,
    lastRelease: (date: string) => `最近一次发布 ${date}`,
    role: {
      capacity: "领先猪价 10–12 个月",
      price: "供给落地的地方",
      margin: "决定补栏是否继续",
    },
    streak: (dir: "up" | "down", n: number, g: string) =>
      `连续 ${n} ${UNIT_ZH[g] ?? "期"}${dir === "down" ? "下降" : "上升"}`,
    change: (pct: number, since: string) => `较 ${since} ${pct > 0 ? "+" : ""}${pct}%`,
    yoy: (pct: number) => `同比 ${pct > 0 ? "+" : ""}${pct}%`,
    position: (pct: number) => `处于自身历史第 ${pct} 分位`,
    released: (date: string, lag: number) => `${date} 发布，滞后 ${lag} 天`,
    outlook: (who: string, year: string, value: string, unit: string, date: string | null) =>
      `${who} 预测 ${year} 年末：${value} ${unit}${date ? `（${date} 发布）` : ""}`,
    releaseUnknown: "源头未注明发布日期",
    staleBadge: (days: number) => `已 ${days} 天没有新数据`,
    align: "读数画在",
    alignPeriod: "它描述的时期",
    alignRelease: "它公开的那天",
    alignNote: (median: number) => (
      <>
        按发布日放置时，每个读数出现在读者第一次能用上它的位置。发布比时期结束中位晚 <b className="num">{median}</b> 天，这段时间是从生物学领先期里扣掉的。
        2021-12 以前的读数没有发布日期，这一视图里不画，也不去猜。
      </>
    ),
    feedHeading: "最近发布",
    feedNote: "周度与月度发布，按公开日期从新到旧。",
    factsHeading: "值得留意",
  },

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
  },

  readings: {
    heading: "全部读数",
    note: "因果链图表墙上的每一条序列。点名称打开它在图表墙上的那一格。",
    name: "序列",
    value: "最新值",
    yoy: "同比",
    position: "历史位置",
    asOf: "日期",
    status: "状态",
    ordinal: (pct: number) => `第 ${pct} 分位`,
    positionTitle: (pct: number) =>
      `在该序列 2015 年以来自身历史中的第 ${pct} 分位：0 为最低读数，100 为最高`,
    noPositionTitle: "历史太短，不计分位",
    live: "更新中",
    movingBaseline: "调控基准为移动值，故不计缺口",
  },

  wall: {
    heading: "因果链图表墙",
    sub: (n: number) => (
      <>
        {n} 个序列共用一条时间轴，按因果链分组。每格自带纵轴与单位（小倍数，
        <strong>不是双轴图</strong>）；本页只计算与对齐，<strong>不做阶段判定</strong>。
      </>
    ),
    howTo: (
      <>
        悬停读出所有格同一天的数值；在任一格上<b>拖选</b>缩放，<b>双击</b>复原。空心点是年度或季度读数，是另一种测量，不是更平滑的采样。相邻读数隔了一个多月的地方用虚线相连：中间没有测量。带标注的竖点线标出序列读数频率改变之处。
      </>
    ),
    zoomed: "自定义窗口",
    reset: "重置缩放",

    footerHeading: "口径与局限",
    footer: [
      <>
        白条肉出厂价在 <b>2024-01</b> 换了调查对象（全国规模以上 → 全部定点屠宰企业），水平几乎没动，但仍按<b>两个口径</b>分开；规模以上那段已封存，只在对比页。猪粮比价（500县集贸）由同一份周报、同一采集日的生猪价 ÷ 玉米价算出，与发改委口径相关 0.996、平均低 0.26，所以<b>不画 5:1 线</b> —— 那条线定义在发改委口径上。
      </>,
      <>
        生猪成交均价与出栏均重为<b>行情宝平台成交口径</b>；外三元为
        <b>玄田数据口径</b>。两者与农业农村部 500 县集贸市场是三套不同口径的
        <b>同一个量</b>，<b>不可混入同一条曲线</b>，故各自成板。
      </>,
      <>
        猪肉零售价（36 城精瘦肉，发改委采集）测的<b>不是生猪</b>而是零售端猪肉，量纲相同但环节不同，天然高于出场价 —— 它和墙上的生猪价格既不是同一口径，也不是同一个量，应当读作产业链的零售端。
      </>,
      <>
        能繁母猪存栏来自
        <b>农业农村部、发改委、商务部、海关总署、国家统计局联合发布</b>
        的《生猪产品数据》，每月一期。粒度即口径：2020 年及以前只有<b>年度值</b>
        （空心点）；2021-12 至 2025-10 为<b>月度值</b>，其中季末月是国家统计局调查数，非季末月由农业农村部定点监测的环比推算；
        <b>2026 年起公开口径改为只发季度末</b>，所以最新一段是季频。这不是采集变稀，是上游发布节奏变了。
      </>,
      <>
        定点屠宰量在 <b>2025 年 7 月换了口径</b>（「规模以上」扩为全部定点企业），绝对值随之跳升，因此拆成两条序列而<b>不接成一条</b>。旧口径已停止发布，标记为封存：它是历史，不是坏掉的采集，所以不在图表墙上，只出现在对比页。
      </>,
      <>
        正常保有量是<b>移动基准</b>（4100 → 3900 → 3750 万头）。缺口或比值必须用当期基准，不能用今天的，故此处只列原值。
      </>,
      <>
        玉米按<b>元/吨</b>报价，与其余按元/公斤计价的序列量纲不同；利润类派生计算在 gold 层统一量纲，silver 层忠于源。
      </>,
      <>
        外三元与玉米为日频序列，上游仅保留约 1 年滚动窗口 —— 超出部分已从源头消失，此后深度靠每日采集向前积累。
      </>,
    ],
  },

  window: {
    label: "时间窗口",
    ranges: { all: "全部", "8y": "近 8 年", "5y": "近 5 年", "3y": "近 3 年", "1y": "近 1 年" },
    stamp: (known: string, start: string, end: string) =>
      `知识时点 ${known} · 数据窗口 ${start} → ${end}`,
  },

  health: {
    reached: (when: string) => `数据源最近一次抓取 ${when} UTC`,
    overdue: "有采集器逾期未运行：可能缺少更新的发布",
    never: "从未",
  },

  asOf: {
    label: "站在",
    clear: "回到今天",
    hint: "选一个过去的日子，只看那天能知道的数据。有发布日期的，从发布方公开那天算；源头没写发布日期的，从本仓库获知那天算，绝不按「通常滞后」去推。",
    banner: (day: string) => (
      <>
        站在 <b className="num">{day}</b>：只显示那天能知道的数据。连续涨跌、多年极值、历史分位和同比描述的是今天的序列，这里不显示。
      </>
    ),
    latest: "当时最新可知的读数",
    released: (date: string) => `${date} 发布`,
    learned: (date: string) => `源头没写发布日期；本仓库 ${date} 获知`,
    nothing: (day: string) => `${day} 这一天，这条序列还没有任何可知的数据。`,
    firstPublished: (date: string) => `本仓库里它最早的一次发布是 ${date}。`,
    firstLearned: (date: string) =>
      `源头不写发布日期，本仓库 ${date} 才首次获知。发布日期从不推算，所以此前不显示。`,
    marker: "站在此日",
    panelNone: (first: { date: string; basis: "published" | "learned" } | null) =>
      first == null
        ? "这一天还不可知"
        : first.basis === "published"
        ? `这一天还不可知：最早一次发布是 ${first.date}`
        : `这一天还不可知：源头没写发布日期，本仓库 ${first.date} 首次获知`,
    startsAt: (month: string) => `可知的期间始于 ${month}`,
    knownFrom: "从何时可知",
    overviewLink: "看某个过去日子里的因果链图表墙",
  },

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

  table: {
    show: "表格视图",
    hide: "隐藏表格",
    note: (rows: number) => `按月重采样 · 每月取最后一个观测值 · 共 ${rows} 行`,
    month: "月份",
    caption: "图表墙上每个序列的月度表：每月取最后一个观测值。",
  },

  chart: {
    noData: "此期间无数据",
    noneNear: "该日期附近无数据",
    published: (date: string, lag: number) =>
      lag >= 0 ? `${date} 发布 · 晚 ${lag} 天` : `${date} 发布 · 提前 ${-lag} 天`,
    startsAt: (month: string) => `数据始于 ${month}`,
    datedFrom: (month: string) => `发布日期始于 ${month}`,
    undated: "源头不写发布日期，这个视图里没有它的位置",
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
      capacity: "产能：领先价格 10–12 个月",
      margin: "利润：决定产能变化能否持续",
      price: "价格：被预测的结果，不是驱动因素",
      noise: "噪音：短期扰动，影响股价，不改变周期",
      equity: "股票：对周期的索取权，不是周期的一环",
    },
    panelLabel: (name: string, unit: string, n: number) =>
      `${name}，单位 ${unit}，共 ${n} 个观测点`,
    coarse: "粗粒度",
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

  theme: {
    switch: "切换主题",
    system: "跟随系统",
    light: "浅色",
    dark: "深色",
  },

  tier: {
    capacity: "产能",
    margin: "利润",
    price: "价格",
    noise: "噪音",
    equity: "股票",
  },

  granularity: { D: "日", W: "周", M: "月", Q: "季", A: "年" },
};
