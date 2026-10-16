/**
 * Every string the English page renders.
 *
 * This file is the reference shape: `zh.tsx` is typed against it, so a key
 * that exists here and not there is a compile error rather than a Chinese
 * sentence appearing mid-paragraph on the English page. Indicator names are
 * *not* here — they belong to the indicator and travel in the contract
 * (ADR-0014), because the caliber lives in the name.
 *
 * Prose blocks are JSX rather than strings with a markup convention: the copy
 * carries inline emphasis that is load-bearing (口径, moving baselines, "must
 * not share one line"), and a hand-rolled mini-parser to preserve it would be
 * more code than the emphasis is worth.
 */

import { shell } from "./en/shell";
import { overview } from "./en/overview";
import { series } from "./en/series";
import { wall } from "./en/wall";
import { compare } from "./en/compare";
import { chart } from "./en/chart";
import { terms } from "./en/terms";

// One object per page (src/i18n/en/), so no file grows past the ceiling;
// spread back together, the type is still the whole shape.
export const en = {
  ...shell,
  ...overview,
  ...series,
  ...wall,
  ...compare,
  ...chart,
  ...terms,
};

export type Dict = typeof en;
