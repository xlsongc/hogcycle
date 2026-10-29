# 41. One futures contract at a time; the site says less

Date: 2026-10-29 · Status: Accepted

Builds on [ADR-0035](0035-the-futures-market-is-a-tier-of-its-own.md) and
[ADR-0036](0036-the-futures-market-is-checked-against-itself.md), and on
[ADR-0037](0037-pixel-type-is-an-accent.md)'s "answers before method". Asked
for by the owner on 10-29. Two things: a page for following one futures
contract, and a site-wide cut of the copy.

## Context

The curve's own page used the template every series has. Its headline was the
furthest contract's settle, with "up three months running, +24.2% on the
year, highest since 2025-09", but those figures compared different delivery
months as if they were one series over time. Its release section described
USDA's calendar, because the curve is flagged `forecast`. Its revisions
section said nothing had changed, on a price that changes every day. The
main continuous page warned readers not to assume a settle was public on its
day. Every contract's path was on the page, but only as thirty-seven lines in
one chart, and the download held one number per delivery month.

The owner's verdict on the copy across the site was that it reads like a
site trying to teach its reader: the same disclaimers repeated ("not a
measurement", "not this site's forecast", "computed in your browser", "the
past only"), method paragraphs ahead of the numbers, and defences of choices
the reader did not ask about.

## Decision

- **The curve's page is a contract view.** It replaces the generic latest
  card and history chart there. It has:
  - A picker: the live contracts as buttons, and the delivered ones in a menu.
  - One line saying where the chosen contract stands:
    - a live one: its latest settle, its change on the week, and its change since its first week;
    - a delivered one: its last settle, and how far its earliest priced horizon was from that.
  - The chart of every contract, with the chosen one drawn heavy. The axes close in on that contract's life, and one button widens them to every contract since 2021. Clicking a line chooses that contract.
  - A delivered contract's last settle, drawn as a dashed line.
  - The contract's settle week by week, each week's change on the week before, and its distance from the reference: the first week for a live contract, the last settle for a delivered one.
  - The choice kept in the address (`?c=LH2709`), so a link can name a contract.
- **It opens on the contract the main continuous price is.** That is the most-traded contract, identified because its settle that day equals the main price's (`lib/futures.ts`). Otherwise it opens on the nearest live contract.
- **Every contract's every day, in one file.** `data/futures/lh_contracts.csv` holds the contract, the delivery month, the date and the settle, written by `export/contracts_csv.py` from silver. A day whose settle did not move has no row, as in silver.
- **The market tier's own page facts.**
  - The release section says 大商所 publishes settles after each trading day's close. That is what the exchange does, not an assumed lag.
  - There is no revisions section.
  - The per-cent unit transforms do not appear on a forecast.
- **The overview's futures card answers first.** It opens with one line, the furthest contract against the nearest. Each contract carries its change on the week, and the track-record line is one sentence.
- **The copy says less, everywhere.**
  - A heading's note says what the numbers are and when. It does not say what they are not, or why the site made a choice.
  - Method stays behind "怎么算的", in one or two sentences, or goes.
  - The wall's eight paragraphs on calibers are now five lines.
  - Glossary chips stay where a term needs them: the wall, and the sow and ratio pages. The overview and every other series page no longer carry them.
  - The longest series descriptions (`config/about.yaml`) are cut to what the series is. They stay in both languages, as ADR-0014 requires.
  - The hard rules still show on the page, in fewer words. An estimate says 估算. A forecast names its source. A stale series is marked.
  - ADR-0033's "and says so" is relaxed. The browser still computes only over what the reader chose, but the page no longer labels each such figure as computed in the browser.

## Consequences

- An analyst can follow LH2709 week by week, or check any delivered contract
  against its last settle by hand, and take the daily file away.
- The week-on-week figures are differences between settles the page already
  shows, computed in the browser like the digest's. Gold still owns the track
  record.
- Fewer words means some reasons are now only in these ADRs. That is the
  intent: the page is for reading the numbers, the ADRs for why they are
  drawn this way.
- `lh_contracts.csv` is about 350 KB and grows by roughly 3,000 rows a year.
