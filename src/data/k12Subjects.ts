import { ENGLISH_QUESTIONS, EXPANDED_ESSAY_PROMPTS } from './questionBanks/englishQuestions';
import { HUMANITY_QUESTIONS } from './questionBanks/humanityQuestions';
import { IG_MATH_QUESTIONS } from './questionBanks/igMathQuestions';
import { SCIENCE_QUESTIONS } from './questionBanks/scienceQuestions';
import { SHANGHAI_MATH_QUESTIONS } from './questionBanks/shanghaiMathQuestions';

export type SubjectId = 'english' | 'ig-math' | 'shanghai-math' | 'humanity' | 'science';
export type GradeLevel = 'G6' | 'G7';

export interface PracticeQuestion {
  id: string;
  grade: GradeLevel;
  track?: string;
  question: string;
  options: string[];
  answer: number;
  explanation: string;
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
    short: { G6: '比例、百分数、代数入门', G7: '方程、函数图像、几何' },
    topics: {
      G6: ['Ratios & %', 'Algebra Basics', 'Area & Perimeter', 'Probability'],
      G7: ['Linear Equations', 'Straight-Line Graphs', 'Angles', 'Volume & Data']
    },
    questions: IG_MATH_QUESTIONS
  },
  {
    id: 'shanghai-math',
    name: '上海数学',
    nameZh: '沪教版',
    emoji: '📐',
    short: { G6: '分数、比例、圆与方程', G7: '整式、分式、几何证明' },
    topics: {
      G6: ['数的整除', '比和比例', '圆与扇形', '一元一次方程'],
      G7: ['整式乘法', '因式分解', '分式', '全等三角形']
    },
    questions: SHANGHAI_MATH_QUESTIONS
  },
  {
    id: 'humanity',
    name: 'Humanity',
    nameZh: '人文',
    emoji: '🌍',
    short: { G6: '古文明与地图', G7: '历史 + 地理' },
    topics: {
      G6: ['大河文明', '地图技能', '史料辨析', '早期贸易'],
      G7: []
    },
    tracks: {
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
    short: { G6: '物理 · 生物 · 化学', G7: '物理 · 生物 · 化学' },
    topics: { G6: [], G7: [] },
    tracks: {
      G6: [
        { id: 'physics', name: 'Physics', nameZh: '物理', emoji: '⚡', topics: ['力与重力', '摩擦力', '简单机械'] },
        { id: 'biology', name: 'Biology', nameZh: '生物', emoji: '🌱', topics: ['动植物细胞', '光合作用', '食物链'] },
        { id: 'chemistry', name: 'Chemistry', nameZh: '化学', emoji: '🧪', topics: ['物质三态', '溶解', '混合物分离'] }
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
