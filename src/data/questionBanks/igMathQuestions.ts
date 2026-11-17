import type { PracticeQuestion } from '../k12Subjects';
import { IG_MATH_G6_FOUNDATION } from './igMath/g6Foundation';
import { IG_MATH_G6_STANDARD } from './igMath/g6Standard';
import { IG_MATH_G6_CHALLENGE } from './igMath/g6Challenge';
import { IG_MATH_G7_FOUNDATION } from './igMath/g7Foundation';
import { IG_MATH_G7_STANDARD } from './igMath/g7Standard';
import { IG_MATH_G7_CHALLENGE } from './igMath/g7Challenge';

export const IG_MATH_QUESTIONS: PracticeQuestion[] = [
  ...IG_MATH_G6_FOUNDATION,
  ...IG_MATH_G6_STANDARD,
  ...IG_MATH_G6_CHALLENGE,
  ...IG_MATH_G7_FOUNDATION,
  ...IG_MATH_G7_STANDARD,
  ...IG_MATH_G7_CHALLENGE,
];
