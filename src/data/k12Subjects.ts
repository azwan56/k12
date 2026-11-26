import { ENGLISH_QUESTIONS, EXPANDED_ESSAY_PROMPTS } from './questionBanks/englishQuestions';
import { HUMANITY_QUESTIONS } from './questionBanks/humanityQuestions';
import { IG_MATH_QUESTIONS } from './questionBanks/igMathQuestions';
import { SCIENCE_QUESTIONS } from './questionBanks/scienceQuestions';
import { SHANGHAI_MATH_QUESTIONS } from './questionBanks/shanghaiMathQuestions';

export type SubjectId = 'english' | 'ig-math' | 'shanghai-math' | 'humanity' | 'science';
export type GradeLevel = 'G6' | 'G7';
export type PracticeDifficulty = 'foundation' | 'standard' | 'challenge';

export const PRACTICE_DIFFICULTY_META: Record<
  PracticeDifficulty,
  { label: string; shortLabel: string; emoji: string; badgeClass: string; desc: string }
> = {
  foundation: {
    label: '基础巩固',
    shortLabel: '基础',
    emoji: '🌱',
    badgeClass: 'bg-emerald-100 text-emerald-900',
    desc: '核心概念与基本运算达标',
  },
  standard: {
    label: '课标进阶',
    shortLabel: '进阶',
    emoji: '🚀',
    badgeClass: 'bg-sky-100 text-sky-900',
    desc: '多步综合应用与同步提高',
  },
  challenge: {
    label: '培优挑战',
    shortLabel: '培优',
    emoji: '🏆',
    badgeClass: 'bg-violet-100 text-violet-900',
    desc: '综合探究、跨概念应用与竞赛拓展',
  },
};

export interface PracticeQuestion {
  id: string;
  grade: GradeLevel;
  track?: string;
  difficulty?: PracticeDifficulty;
  topic?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
  dynamicSource?: 'procedural' | 'ai';
}

export interface SubTrack {
  id: string;
  name: string;
  nameZh: string;
  emoji: string;
  topics: string[];
}

export interface Subject {
  id: SubjectId;
  name: string;
  nameZh: string;
  emoji: string;
  /** One short line per grade. Keep it under ~20 characters. */
  short: Record<GradeLevel, string>;
  topics: Record<GradeLevel, string[]>;
  tracks?: Partial<Record<GradeLevel, SubTrack[]>>;
  questions: PracticeQuestion[];
}

export interface EssayPrompt {
  id: string;
  grade: GradeLevel;
  genre: string;
  title: string;
  prompt: string;
  words: [number, number];
  tips: string[];
}

export const ESSAY_PROMPTS: EssayPrompt[] = EXPANDED_ESSAY_PROMPTS;

export const SUBJECTS: Subject[] = [
  {
    id: 'english',
    name: 'English',
    nameZh: '英语',
    emoji: '📚',
    short: { G6: '造句 + 作文，一起变强', G7: '学术词汇 + 思辨写作' },
    topics: {
      G6: ['词汇造句', '记叙文', '观点作文', '时态语法'],
      G7: ['学术词汇', '议论文', '说明文', '复杂句型']
    },
    questions: ENGLISH_QUESTIONS
  },
  {
    id: 'ig-math',
    name: 'IG Math',
    nameZh: '国际数学',
    emoji: '🧮',
    short: { G6: 'Stage 7 · 比例/代数/UKMT培优', G7: 'Stage 8 · 函数/几何/AMC8培优' },
    topics: {
      G6: ['Primes & Negatives', 'FDP & Ratios', 'Algebra & Sequences', 'Area, Volume & Prisms', 'Data, Sets & Probability'],
      G7: ['Indices & Standard Form', 'Brackets & Simultaneous Eq.', 'Linear Graphs y=mx+c', 'Pythagoras, Circles & Polygons', 'Compound %, Scale & Tree Probability']
    },
    questions: IG_MATH_QUESTIONS
  },
  {
    id: 'shanghai-math',
    name: '上海数学',
    nameZh: '沪教版',
    emoji: '📐',
    short: { G6: '五四制 · 有理数/比例/圆与方程', G7: '五四制 · 整式/分式/全等与不等式' },
    topics: {
      G6: ['数的整除与分解素因数', '分数裂项与混合运算', '比、比例与浓度工程', '圆、扇形与组合阴影', '有理数、方程组与不等式'],
      G7: ['整式加减与乘法公式', '因式分解与配方最值', '分式化简与增根无解', '实数、图形运动与平行线模型', '全等三角形与等腰多解']
    },
    questions: SHANGHAI_MATH_QUESTIONS
  },
  {
    id: 'humanity',
    name: 'Humanity',
    nameZh: '世界人文',
    emoji: '🌍',
    short: { G6: '生物群落 · 早期人类 · 古文明 · 地图', G7: '历史 + 地理' },
    topics: {
      G6: [],
      G7: []
    },
    tracks: {
      G6: [
        { id: 'biomes', name: 'Unit 1 · Biomes', nameZh: '生物群落与人类影响', emoji: '🌊', topics: ['六大生物群落', '海洋生态系统', '人类影响', '可持续发展'] },
        { id: 'early-humans', name: 'Unit 2 · Early Humans', nameZh: '早期人类与农业革命', emoji: '🦴', topics: ['旧石器狩猎采集', '工具与部落协作', '人类迁徙', '新石器农业革命'] },
        { id: 'civilizations', name: 'Unit 3 · Civilizations', nameZh: '大河与古代文明', emoji: '🏺', topics: ['两河与古埃及', '印度河与早期中国', '希腊罗马与丝路', 'GRAPES 与史料辨析'] },
        { id: 'geography-skills', name: 'Unit 4 · Map Skills', nameZh: '地图与地理探究', emoji: '🧭', topics: ['经纬度与方向', '比例尺与网格坐标', '等高线与地形', '气候图与地图投影'] }
      ],
      G7: [
        { id: 'history', name: 'History', nameZh: '历史', emoji: '🏛️', topics: ['丝绸之路', '中世纪', '文艺复兴', '史料与偏见'] },
        { id: 'geography', name: 'Geography', nameZh: '地理', emoji: '🗺️', topics: ['气候与生物群落', '人口迁移', '城市化', '可持续发展'] }
      ]
    },
    questions: HUMANITY_QUESTIONS
  },
  {
    id: 'science',
    name: 'Science',
    nameZh: '科学',
    emoji: '🔬',
    short: { G6: 'Stage 7 (0893) · 生物 · 化学 · 物理地球', G7: '物理 · 生物 · 化学' },
    topics: { G6: [], G7: [] },
    tracks: {
      G6: [
        { id: 'physics', name: 'Physics & Earth', nameZh: '物理与地球', emoji: '⚡', topics: ['U3 力、重力与能量', 'U3 太阳系与潮汐', 'U6 声波与回声', 'U6 地球结构与板块地震', 'U9 电路与电流'] },
        { id: 'biology', name: 'Biology', nameZh: '生物', emoji: '🌱', topics: ['U1 动植物与特化细胞', 'U1 组织器官系统', 'U4 生物特征与检索表', 'U4 物种与病毒', 'U7 微生物与食物网'] },
        { id: 'chemistry', name: 'Chemistry', nameZh: '化学', emoji: '🧪', topics: ['U2 粒子模型与水循环', 'U2 原子、元素与化合物', 'U5 金属/非金属与酸碱pH', 'U8 化学反应与气体检验', 'U8 混合物分离'] }
      ],
      G7: [
        { id: 'physics', name: 'Physics', nameZh: '物理', emoji: '⚡', topics: ['速度与图像', '能量守恒', '电路', '光与声'] },
        { id: 'biology', name: 'Biology', nameZh: '生物', emoji: '🌱', topics: ['呼吸与循环', '细胞呼吸', '生态系统', '适应与多样性'] },
        { id: 'chemistry', name: 'Chemistry', nameZh: '化学', emoji: '🧪', topics: ['元素周期表', '物理/化学变化', '酸碱与 pH', '中和反应'] }
      ]
    },
    questions: SCIENCE_QUESTIONS
  }
];

export const getSubject = (id?: string) => SUBJECTS.find((s) => s.id === id);

export const gradeLabel = (g: GradeLevel) => (g === 'G6' ? '六年级' : '七年级');
