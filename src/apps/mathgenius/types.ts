export interface Question {
  id: string;
  question: string;
  options: string[];
  correctAnswer: string;
  hint?: string;
  explanation: string;
  category: string;
}

export interface UserAnswer {
  questionId: string;
  answer: string;
  isCorrect: boolean;
  attempts?: number;
  firstAttemptAnswer?: string;
  secondAttemptAnswer?: string;
  usedHint?: boolean;
}

export type DifficultyLevel = 'foundation' | 'standard' | 'challenge';

export interface DifficultyConfig {
  id: DifficultyLevel;
  labelEn: string;
  labelZh: string;
  shortLabelEn: string;
  shortLabelZh: string;
  descriptionEn: string;
  descriptionZh: string;
  badgeClass: string;
  colorClass: string;
}

export const DIFFICULTY_CONFIGS: Record<DifficultyLevel, DifficultyConfig> = {
  foundation: {
    id: 'foundation',
    labelEn: 'Foundation & Basics',
    labelZh: '基础巩固',
    shortLabelEn: 'Foundation',
    shortLabelZh: '基础',
    descriptionEn: 'Core concepts, direct single-step calculations & definition mastery',
    descriptionZh: '核心概念、单步基础运算与公理定理，稳固数学基本功',
    badgeClass: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/30',
    colorClass: 'emerald'
  },
  standard: {
    id: 'standard',
    labelEn: 'Standard Curriculum',
    labelZh: '进阶拓展',
    shortLabelEn: 'Standard',
    shortLabelZh: '进阶',
    descriptionEn: 'Standard Grade 6 curriculum, multi-step problem solving & word problems',
    descriptionZh: '课标标准要求、两步及综合应用题与真实生活情境',
    badgeClass: 'bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30',
    colorClass: 'sky'
  },
  challenge: {
    id: 'challenge',
    labelEn: 'Olympiad & Challenge',
    labelZh: '挑战与奥数',
    shortLabelEn: 'Challenge',
    shortLabelZh: '挑战',
    descriptionEn: 'Deep mathematical reasoning, Olympiad thinking & high-order puzzles',
    descriptionZh: '深度思维拓展、竞赛拔高与跨知识点综合难题',
    badgeClass: 'bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30',
    colorClass: 'purple'
  }
};

export interface CategoryStat {
  totalAttempted: number;
  totalCorrect: number;
  accuracy: number; // 0 - 100 percentage
  recentErrors: number;
  lastPracticedAt: number;
}

export interface StudentLearningProfile {
  studentId: string;
  currentDifficulty: DifficultyLevel;
  adaptiveMode: boolean;
  categoryStats: Record<string, CategoryStat>;
  recentQuizScores: { score: number; total: number; difficulty: DifficultyLevel; date: string }[];
  totalQuizzesTaken: number;
  weakCategories: string[];
}

export interface LevelRecommendation {
  previousLevel: DifficultyLevel;
  newLevel: DifficultyLevel;
  action: 'promoted' | 'demoted' | 'maintained';
  reasonZh: string;
  reasonEn: string;
}

export interface QuizResult {
  score: number;
  totalQuestions: number;
  feedback: string;
  answers: UserAnswer[];
  date: string;
  timeTaken: number; // in milliseconds
  difficulty?: DifficultyLevel;
  levelRecommendation?: LevelRecommendation;
  weakPointsIdentified?: string[];
}

export enum AppState {
  WELCOME = 'WELCOME',
  LOADING = 'LOADING',
  PRACTICE = 'PRACTICE',
  RESULTS = 'RESULTS'
}

export interface TopicCategory {
  id: string;
  labelEn: string;
  labelZh: string;
  descriptionEn: string;
  descriptionZh: string;
  icon: string;
}

export const GRADE_6_CATEGORIES: TopicCategory[] = [
  {
    id: 'all',
    labelEn: 'All Topics Mixed',
    labelZh: '全知识点综合',
    descriptionEn: 'Comprehensive Grade 6 practice covering all core math areas',
    descriptionZh: '覆盖六年级全部核心知识点，适合综合复习与自测',
    icon: 'Sparkles'
  },
  {
    id: 'ratios_percentages',
    labelEn: 'Ratios, Rates & Percentages',
    labelZh: '比、比例与百分数',
    descriptionEn: 'Unit rates, ratio word problems, scales & percentage applications',
    descriptionZh: '比和比例的基本性质、求比值、化简比及百分数应用题',
    icon: 'Percent'
  },
  {
    id: 'fractions_decimals',
    labelEn: 'Fraction & Decimal Operations',
    labelZh: '分数与小数混合运算',
    descriptionEn: 'Fraction multiplication, division, multi-step operations & word problems',
    descriptionZh: '分数乘除法、分小互化与混合四则运算应用',
    icon: 'Divide'
  },
  {
    id: 'algebra_equations',
    labelEn: 'Algebra & Equations',
    labelZh: '代数式与一元一次方程',
    descriptionEn: 'Writing expressions, solving one-step & multi-step equations and inequalities',
    descriptionZh: '用字母表示数、解方程与列方程解决实际问题',
    icon: 'Variable'
  },
  {
    id: 'circles_geometry',
    labelEn: 'Circles & Geometry (Area & Volume)',
    labelZh: '圆与几何立体图形',
    descriptionEn: 'Circumference and area of circles, surface area & volume of 3D prisms',
    descriptionZh: '圆的周长与面积、扇形、长方体/正方体/柱体的表面积与体积',
    icon: 'Shapes'
  },
  {
    id: 'integers_coordinates',
    labelEn: 'Negative Numbers & Coordinates',
    labelZh: '负数与平面直角坐标系',
    descriptionEn: 'Negative integers, absolute values, number lines & coordinate planes',
    descriptionZh: '正负数的认识、数轴、相反数、绝对值与平面直角坐标系',
    icon: 'Compass'
  }
];
