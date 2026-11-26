import type { PracticeQuestion } from '../k12Subjects';
import { HUMANITY_G6_BIOMES } from './humanity/g6Biomes';
import { HUMANITY_G6_CIVILIZATIONS } from './humanity/g6Civilizations';
import { HUMANITY_G6_EARLY_HUMANS } from './humanity/g6EarlyHumans';
import { HUMANITY_G6_GEO_SKILLS } from './humanity/g6GeoSkills';
import { HUMANITY_G7_TRACKS } from './humanity/g7Tracks';

export const HUMANITY_QUESTIONS: PracticeQuestion[] = [
  ...HUMANITY_G6_BIOMES,
  ...HUMANITY_G6_EARLY_HUMANS,
  ...HUMANITY_G6_CIVILIZATIONS,
  ...HUMANITY_G6_GEO_SKILLS,
  ...HUMANITY_G7_TRACKS,
];
