/**
 * Finding a series by what a reader types: either language's name, or the id.
 *
 * Every word typed must appear somewhere in one of the three, so "500 价格"
 * narrows to the county prices and "price county" does the same in English.
 * A name that starts with the first word ranks above one that merely holds
 * it; otherwise the order is the registry's, which is the causal chain.
 */

export type Findable = { id: string; name_zh: string; name_en: string };

export function find<T extends Findable>(items: readonly T[], query: string): T[] {
  const words = query.trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [...items];
  const scored: { item: T; rank: number; at: number }[] = [];
  items.forEach((item, at) => {
    const hay = [item.name_zh, item.name_en.toLowerCase(), item.id];
    if (!words.every((w) => hay.some((h) => h.includes(w)))) return;
    const rank = hay.some((h) => h.startsWith(words[0] as string)) ? 0 : 1;
    scored.push({ item, rank, at });
  });
  return scored.sort((a, b) => a.rank - b.rank || a.at - b.at).map((s) => s.item);
}
