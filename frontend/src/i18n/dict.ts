/** Resolve a locale to its dictionary. */

import type { Locale } from "./locale";
import { en, type Dict } from "./en";
import { zh } from "./zh";

const DICTS: Record<Locale, Dict> = { en, zh };

export function dict(locale: Locale): Dict {
  return DICTS[locale];
}

export type { Dict };
