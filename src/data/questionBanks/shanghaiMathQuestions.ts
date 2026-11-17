import type { PracticeQuestion } from '../k12Subjects';
import { SH_MATH_G6_FOUNDATION } from './shanghaiMath/g6Foundation';
import { SH_MATH_G6_STANDARD } from './shanghaiMath/g6Standard';
import { SH_MATH_G6_CHALLENGE } from './shanghaiMath/g6Challenge';
import { SH_MATH_G7_FOUNDATION } from './shanghaiMath/g7Foundation';
import { SH_MATH_G7_STANDARD } from './shanghaiMath/g7Standard';
import { SH_MATH_G7_CHALLENGE } from './shanghaiMath/g7Challenge';

export {
  SH_MATH_G6_FOUNDATION,
  SH_MATH_G6_STANDARD,
  SH_MATH_G6_CHALLENGE,
  SH_MATH_G7_FOUNDATION,
  SH_MATH_G7_STANDARD,
  SH_MATH_G7_CHALLENGE,
};

// 沪教版上海数学五四制（兼顾经典版与 2024/2025 新课标六、七年级上下册）
// 每级 150 题（50 基础巩固 + 50 课标进阶 + 50 一课一练★拓展/市北资优培优），共 300 题。
export const SHANGHAI_MATH_QUESTIONS: PracticeQuestion[] = [
  ...SH_MATH_G6_FOUNDATION,
  ...SH_MATH_G6_STANDARD,
  ...SH_MATH_G6_CHALLENGE,
  ...SH_MATH_G7_FOUNDATION,
  ...SH_MATH_G7_STANDARD,
  ...SH_MATH_G7_CHALLENGE,
];
