# 40. A link carries its page; the reader's numbers stay with the reader

Date: 2026-10-25 · Status: Accepted

Builds on [ADR-0038](0038-tools-a-reader-uses.md) (the calculator) and
[ADR-0039](0039-the-week-is-the-difference-between-two-sundays.md) (the
weekly digest). Item 6 of the [next steps](../specs/2026-10-19-next-steps.md),
chosen by the owner on 10-25. Nothing here needs an account or sends
anything anywhere.

## Context

The digest gave the site a page worth sending, but a sent link showed
nothing: no page declared its address, its other language, or a card, so a
chat app unfolded it into a bare URL and a crawler had to guess which of
two languages was which. A mistyped address landed on Next's default
English 404 page.

The calculator asked a farmer to type the same weight, cost and basis on
every visit, and showed the futures curve only as a table, so whether any
contract clears the reader's cost had to be read off row by row.

## Decision

- **Every page states its address, in the production site.** One builder,
  `lib/site.ts`, gives each page its canonical URL, the same page in the
  other language (`hreflang`, English as `x-default`), its feeds, and an
  Open Graph and X card. The address is always
  `https://xlsongc.github.io/hogcycle`, even in a local build, because it
  describes the published page. An issue's card text is its headline.
- **One card image for the whole site**, `public/og.png`, drawn by
  `scripts/og-card.mjs` from the hog price index since 2015 and pictured with
  a local Chrome. It is run by hand, not by the build: the card is the
  site's, not the day's.
- **A sitemap, `/sitemap.xml`**, of every page in both languages (114 on
  10-25), each naming its twin. A finished issue's date is its end.
- **No robots.txt.** Crawlers read it only at the host's root, which belongs
  to the account's user site (`xlsongc.github.io`, which does not exist). The
  sitemap is found when someone submits it to a search console, which is the
  owner's account to open.
- **A 404 page in both languages** (`app/global-not-found.tsx`, behind
  Next's `globalNotFound` flag), since one page answers every wrong address
  and cannot know the reader's language. It offers the overview, this week's
  issue and the data page in each.
- **An issue can be copied as text**: its name, its sentence and its own
  address (never `/week/`, which moves on). WeChat reads a page's card
  unreliably, so the sentence travels as text. Where the browser has a share
  sheet, a second button opens it.
- **The calculator keeps the farm's own numbers** (weight, cost, basis,
  batch size) in the reader's browser, `localStorage`, and says so. Today's
  price is not kept: a stale price would quietly answer last month's
  question. A shared link's numbers win over kept ones, and are not mixed with
  them. The kept numbers can be cleared in one click, which also restores the
  site's figures.
- **The curve against the cost.** Above the futures table, one sentence says
  how many contracts reach the reader's breakeven and the first of them; a
  chart draws today's price and each contract (settle plus basis) against the
  cost as a dashed line, filled points above it, hollow below, the loss side
  shaded. Hand-drawn SVG at its measured width, not ECharts: the page has no
  other chart. It is ADR-0033's case: every input is the reader's.

## Consequences

- A pasted link to an issue shows its title, its sentence and the card in
  apps that read Open Graph (Telegram, Slack, X, iMessage, Discord). WeChat
  may still show only the title; the copy button is the answer there.
- Search engines can tell the two languages apart and find every page, once
  told where the sitemap is. Baidu is a separate matter: github.io is not a
  host it indexes well, and nothing on this site changes that.
- The card does not change with the data. A per-issue card with that week's
  numbers would need a CJK font in the build (several MB) or a picture taken
  per issue; not worth it until a reader asks.
- The 404 page depends on an experimental Next flag. If a Next upgrade drops
  it, the build falls back to Next's default page, which is what the site had
  before.
- Kept calculator numbers live on one device and one browser; a private
  window or cleared site data starts from the site's figures again.
