# Making it useful, and whether it can pay (2026-10-21)

The owner asked for broader thinking on UI and data, how to make the site
more useful, and whether it could earn money. This file is the reasoning and
the recommendation. Nothing here that needs an account, a payment or a
public post has been done: those are the owner's to start.

Done today in the same direction: the readable, premium redesign
(ADR-0037), the margin calculator and the data page (ADR-0038), and the
removal of the one asset that needed a commercial licence (zpix, USD 1,000
for commercial use).

## Who would use it

| reader | what they need | what they use today | what the site offers |
|---|---|---|---|
| Small and mid-size farms (the largest group) | Today's price where they sell, whether a hog makes money, when to restock, on a phone | WeChat groups, free price sites (搜猪网, 中国养猪网), word of mouth | The calculator, the price strip, the phone layout. They pay little; they are the audience, not the revenue |
| Large farms, feed mills, slaughterhouses (procurement and planning) | Breadth: province-level daily prices, fast | Paid terminals: Mysteel (我的农产品网), 卓创资讯 (SCI99), 涌益咨询. Prices are quote-only | Not competitive on breadth: those firms run their own survey networks. Competitive on method: vintages, release dates, an estimate with its error printed |
| Futures traders, analysts covering 牧原 / 温氏 | The curve, basis, how far off the market has been, fast data | Wind, exchange data, broker research | The track record (ADR-0036) and the as-of view are unusual. In China, selling them *analysis* needs a licence (below); selling *data and tools* does not |
| Researchers, journalists | A clean, citable series with its sources | Government sites, scraping | The data page, CSV/JSON, citations. Pays in reputation |
| **Readers outside China** (ag traders, exporters to China, investors in WH Group or Smithfield, analysts) | China's hog cycle in English, sourced and current | 3tres3, IQC Insights, Mysteel's English notes, USDA FAS reports | The whole site in English, with the official sources named. **The least served group that is used to paying** |

## Routes to revenue

| # | route | needs | legal and practical | verdict |
|---|---|---|---|---|
| 1 | **Paid English monthly** ("China Hog Monthly"): the site's charts plus the owner's commentary | A newsletter platform (Substack, Ghost or Buttondown), the owner's writing | Sold from outside China in USD, so no ICP licence. Substack takes 10% plus card fees. The commentary is the owner's opinion, kept separate from the site, which still makes no phase calls | **Best first test.** Start free, charge when the list is real |
| 2 | **Data API tier**: the free static files stay; a paid tier adds vintages (the site's as-of data, which FRED charges nothing for but few China sources have), bulk history, alerts, an uptime promise | Accounts and billing: a small backend (e.g. a Cloudflare Worker and Stripe) | Only for data the site may resell: see the rights review below. Exchange data is out unless licensed | Later, after the rights review |
| 3 | **Premium tools**: saved farm profiles, alerts when the price crosses the reader's breakeven, scenario plans, PDF reports | Accounts, a backend, a sender for alerts | In mainland China a paid online service needs a company, an ICP 备案 and an ICP 经营许可证 (agents list RMB 1 million registered capital among the conditions) | Only after 1 or 2 shows demand |
| 4 | **Sponsors in Chinese**: feed, animal health, equipment companies; a WeChat 公众号 with its ad programme | An audience first, measured | The 公众号 route needs no ICP licence. Sponsors must never touch the numbers | Only once analytics show a Chinese audience |
| 5 | **Custom research and consulting** | The owner's time | Using the site as the portfolio | Possible at any time, does not scale |
| 6 | **GitHub Sponsors / donations** | The owner's account | None | Small money, almost no effort |

## What not to do

- **Sell signals, phase calls or trading advice in China.** Paid analysis or
  recommendations on futures is 期货投资咨询 and needs a licence and
  licensed staff. It would also break the site's own rule.
- **Resell exchange prices.** The futures come from Sina's copy of DCE data.
  Showing them free with the source named is one thing; selling them is
  redistribution, which exchanges license.
- **Put the existing free data behind a wall.** Being free, sourced and
  citable is what the site has that the paid terminals do not.

## Rights review, before charging for any data

| source | used for | commercial reuse |
|---|---|---|
| MARA, NBS, NDRC, Customs (five-ministry release; 500-county weekly) | Most of the wall | Government publications. Generally citable; check whether resale of compiled series is allowed |
| USDA FAS PSD | Outlook series | US government work, public domain |
| DCE futures via Sina | Market tier | Exchange data; redistribution is licensed. Do not sell |
| 行情宝 (hog_price_index), Xuantian Data mirror, akshare-sourced daily prices | Several price series | Commercial platforms; terms unknown. Do not sell until checked |
| Estimates computed here (profit, breakeven, track record) | Margin tier, futures page | Ours to license, but built from the inputs above |

## Recommended sequence

1. **Measure.** Cloudflare Web Analytics, country-level and cookie-free
   (owner's yes and account; asked 10-21). Without it there is no way to
   know who reads the site or whether anything below is working. **The
   owner said not for now on 10-24.** What it would take, if that changes:
   a free Cloudflare account, the site added under Web Analytics (no DNS
   change for a GitHub Pages site), and the snippet's token pasted back.
   It counts by country, page, referrer and device, never by IP or city,
   and keeps six months. Ad blockers hide it, and mainland readers may be
   undercounted where Cloudflare is slow.
2. **Make it findable.** Done 10-24: the weekly digest, an issue per week in
   both languages with its own address and a feed (ADR-0039), so there is
   something to send and to share. Next: a sitemap and Open Graph tags.
3. **Build a list.** A free English newsletter and a Chinese 公众号, both
   linking to the digest. Owner accounts.
4. **Test paying.** When the English list is a few hundred readers, add a
   paid monthly with the owner's commentary and deeper charts.
5. **Data tier**, only for sources the review clears.

## What the owner needs to decide

- Analytics: not for now (10-24).
- Whether to write commentary personally. The site stays descriptive; a
  newsletter can carry an opinion if it is signed and kept apart.
- Newsletter platform and which language first (English recommended: it is
  where people already pay and where the site has the fewest competitors).
- The legal entity and payments depend on where the owner lives; that is for
  the owner and an adviser, not for this repository.

## Sources

- Futures contract size, 16 tonnes a lot: https://cs.com.cn/tj/02/01/202101/t20210108_6128427.html
- Paid futures analysis needs a licence: https://www.csrc.gov.cn/csrc/c101902/c1039261/content.shtml
- ICP 经营许可证 for paid online services: https://appinchina.co/blog/the-complete-guide-to-chinas-icp-license-b25/ , https://m.sohu.com/a/525091007_120873253
- 卓创资讯 sells subscription commodity data: https://stock.10jqka.com.cn/20260826/c679291434.shtml
- English China-hog sources: https://www.3tres3.com/en/markets_and_prices/china_106/ , https://www.thepigsite.com/news/2018/05/quarterly-china-pork-report-by-iqc-insights-q1-2018-1 , https://www.mysteel.net/analysis/5129448-mysteel-hog-market-daily-national-hog-prices-are-largely-stable-this-morning
- Iowa State's calculator, the model for /calc/: https://www.ipic.iastate.edu/crush-margin-calculator , https://estimatedreturns.econ.iastate.edu/
