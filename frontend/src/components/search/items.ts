/** What the nav's search needs of each series: its id, both names and its
 *  tier, about 3 KB for all of them, instead of the contract. */

import { contract } from "@/lib/contract";
import type { SearchItem } from "./SeriesSearch";

export const searchItems: SearchItem[] = contract.panels.map((p) => ({
  id: p.id,
  name_zh: p.name_zh,
  name_en: p.name_en,
  tier: p.tier,
}));
