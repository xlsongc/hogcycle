# 38. Tools a reader uses: a margin calculator and a data page

Date: 2026-10-21 · Status: Accepted

Builds on [ADR-0033](0033-the-browser-computes-only-over-what-the-reader-chose.md)
(the browser computes over what the reader chose),
[ADR-0034](0034-an-estimate-says-it-is-one.md) (the estimated breakeven) and
[ADR-0036](0036-the-futures-market-is-checked-against-itself.md) (the futures
track record). On the owner's instruction to make the site more useful, and
to think about how it could earn money.

## Context

The site shows where the cycle stands. A farmer reading it still has to do
the sum that matters to them: at my weight, my cost and my price, what does
a hog earn now, and what would it earn if I sold forward at the futures
price? Iowa State's *Crush Margin Calculator* and its returns series do this
for US hogs. Nothing public does it for Chinese ones with the futures curve
beside it.

The site also already writes every series as CSV and JSON
(`export/feeds.py`), but the only way to find them was a link to an index
file in the overview's header.

## Decision

- **A calculator page, `/calc/`.** Inputs: live weight, full cost per kg,
  today's price, basis (the reader's price minus the futures price), hogs in
  the batch. Outputs: profit per hog and per batch today, the gap to
  breakeven, the same at each listed contract's latest settle, the lots that
  would cover the batch (16 tonnes a lot), and a 5 × 5 grid of price against
  cost.
  - It starts from the site's own figures and says which: the national
    average weight at sale, the estimated breakeven (an estimate, and it
    says so), and the 500-county hog price, because the breakeven is on that
    price's caliber.
  - **Basis defaults to zero and is never guessed.** The page shows today's
    gap between the 500-county price and the nearest contract, and a button
    to use it. The futures are per tonne of the delivery grade; the reader's
    market differs in grade, place and timing, and only the reader knows by
    how much.
  - The futures track record sits under the futures rows: six months out,
    settles have been 24.6% from where contracts finished.
  - Loss and gain are told apart by sign and weight of type, not red and
    green.
  - The numbers live in the query string, so a calculation can be sent as a
    link. Arithmetic is `lib/margin.ts`, with tests.
  - It says it is arithmetic and not advice.
- **A data page, `/datasets/`.** The stable addresses, what each CSV column
  means, every series with its unit, frequency, latest value and its files,
  and how to cite it. It lists what the export writes; it writes nothing.
- Both pages are in the nav and the footer, in both languages.

## Consequences

- The site has a page a farmer can use rather than read. That is the
  audience the brainstorm (docs/specs/2026-10-21-making-it-pay.md) finds
  largest and least served.
- The calculator inherits the estimate's error: ±45–51 元/head on the
  official months. The default cost is labelled an estimate for that reason,
  and the reader's own cost replaces it.
- The data page makes the API discoverable. If the site ever charges for
  data, this is the page whose free tier would be defined.
