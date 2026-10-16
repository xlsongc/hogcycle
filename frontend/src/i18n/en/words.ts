/** Words the English copy builds sentences from. */

/** 1st, 2nd, 3rd, 4th … 11th, 21st. The teens are the exception that makes a
 *  naive `n + "th"` produce "1th" and "43th", which is what it did. */
export function ordinal(n: number): string {
  const teen = n % 100;
  if (teen >= 11 && teen <= 13) return `${n}th`;
  return `${n}${["th", "st", "nd", "rd"][n % 10] ?? "th"}`;
}

/** Plural period words for a run of readings ("down 4 quarters in a row"). */
export const UNIT_EN: Record<string, string> = {
  D: "days",
  W: "weeks",
  M: "months",
  Q: "quarters",
  A: "years",
};
