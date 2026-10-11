/**
 * Which series the instrument header shows. Ids rather than a tier filter:
 * the header is a hand-picked panel, not an exhaustive listing — the wall
 * shows everything.
 *
 * A plain module, not part of Hud.tsx: Hud is a client component, and a
 * constant exported from a client module reaches a server component as a
 * client reference rather than as the value.
 */

export const LEFT = ["sow_inventory", "hog_inventory", "slaughter"];

// 仔猪 is the monthly primary-source print while 玄田's weekly table is dark
// upstream (config: piglet_price.upstream_dark). Swap back once the 500县
// weekly adapter lands.
export const RIGHT = ["hog_price_index", "piglet_price_monthly", "corn_price"];

export const HERO = "sow_inventory";

export const SCALE_OF = "hog_corn_ratio";
