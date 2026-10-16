/**
 * 中文文案。类型来自 en.tsx —— 少一个键就是编译错误，
 * 而不是英文句子出现在中文段落里。
 *
 * 指标名不在这里：它属于指标本身，随契约一起过来（ADR-0014），
 * 因为口径就写在名字里。
 */

import type { Dict } from "./en";
import { shell } from "./zh/shell";
import { overview } from "./zh/overview";
import { series } from "./zh/series";
import { wall } from "./zh/wall";
import { compare } from "./zh/compare";
import { chart } from "./zh/chart";
import { terms } from "./zh/terms";

// 每页一个对象（src/i18n/zh/），各自按 en 的同名部分定型。
export const zh: Dict = {
  ...shell,
  ...overview,
  ...series,
  ...wall,
  ...compare,
  ...chart,
  ...terms,
};
