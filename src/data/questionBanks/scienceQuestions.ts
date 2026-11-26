import type { PracticeQuestion } from '../k12Subjects';
import { SCIENCE_G6_BIOLOGY } from './science/g6Biology';
import { SCIENCE_G6_CHEMISTRY } from './science/g6Chemistry';
import { SCIENCE_G6_PHYSICS } from './science/g6Physics';
import { SCIENCE_G7_TRACKS } from './science/g7Tracks';

export const SCIENCE_QUESTIONS: PracticeQuestion[] = [
  ...SCIENCE_G6_PHYSICS,
  ...SCIENCE_G6_BIOLOGY,
  ...SCIENCE_G6_CHEMISTRY,
  ...SCIENCE_G7_TRACKS,
];
