import type { GradeLevel, SubjectId } from '../data/k12Subjects';
import { type AvatarId, isValidAvatarId, isValidGrade } from './profile';
import {
  type DailyTaskKey,
  type RewardsState,
  TITLES,
  getLocalDateStr,
} from './rewards';
import {
  MAX_PHOTO_URL_LENGTH,
  isValidEmailAddress,
  normalizeEmail,
  sanitizeLinkText,
} from './guardianLinks';
import type { SessionRecord } from '../apps/wordsmith/types';

export type ActivityType = 'practice' | 'wordsmith' | 'mathgenius' | 'essay' | 'humanity';

export const VALID_ACTIVITY_TYPES: readonly ActivityType[] = [
  'practice',
  'wordsmith',
  'mathgenius',
  'essay',
  'humanity',
];

export const VALID_SUBJECT_IDS: readonly SubjectId[] = [
  'english',
  'ig-math',
  'shanghai-math',
  'humanity',
  'science',
];

export interface QuestionReviewItem {
  question: string;
  userAnswer: string;
  correctAnswer: string;
  isCorrect: boolean;
  attempts?: number;
  usedHint?: boolean;
  category?: string;
}

export interface WordsmithReviewItem {
  word: string;
  partOfSpeech?: string;
  userSentence: string;
  score: number;
  feedback: string;
  correction?: string | null;
  isFallback?: boolean;
}

export interface RecordActivityInput {
  id?: string;
  type: ActivityType;
  subjectId: SubjectId;
  title: string;
  grade: GradeLevel;
  score: number;
  maxScore: number;
  accuracyPct?: number;
  durationSec?: number | null;
  summary?: string;
  aiFeedback?: string | null;
  essayContent?: string | null;
  difficulty?: string | null;
  weakPoints?: string[];
  questionItems?: QuestionReviewItem[];
  wordItems?: WordsmithReviewItem[];
  createdAt?: number;
  /** Client-only lifecycle flag: false for per-question in-progress upserts, true/omitted on completion. */
  isComplete?: boolean;
}

export const INCOMPLETE_SUMMARY_PREFIX = '进行中/未完成';

export function isIncompleteActivity(
  act: Pick<StudentActivityRecord, 'type' | 'summary' | 'maxScore' | 'questionItems' | 'wordItems'>
): boolean {
  if (typeof act.summary === 'string' && act.summary.startsWith(INCOMPLETE_SUMMARY_PREFIX)) {
    return true;
  }
  if (act.type === 'practice' || act.type === 'mathgenius' || act.type === 'humanity') {
    return act.maxScore > 0 && act.questionItems.length > 0 && act.questionItems.length < act.maxScore;
  }
  if (act.type === 'wordsmith') {
    return act.maxScore > 0 && act.wordItems.length > 0 && act.wordItems.length * 5 < act.maxScore;
  }
  return false;
}

export function formatInProgressSummary(params: {
  answered: number;
  total: number;
  correct: number;
  unit?: 'question' | 'word';
  maxStarsSoFar?: number;
}): string {
  const { answered, total, correct, unit = 'question', maxStarsSoFar } = params;
  if (unit === 'word') {
    const cap = maxStarsSoFar ?? answered * 5;
    return `${INCOMPLETE_SUMMARY_PREFIX}（已造句 ${answered}/${total} 词，获 ${correct}/${cap} 星）`;
  }
  const wrong = Math.max(0, answered - correct);
  return `${INCOMPLETE_SUMMARY_PREFIX}（已答 ${answered}/${total} 题，答对 ${correct} 题，错 ${wrong} 题）`;
}

export interface StudentActivityRecord {
  id: string;
  studentUid: string;
  studentEmail: string;
  studentEmailEncoded: string;
  type: ActivityType;
  subjectId: SubjectId;
  title: string;
  grade: GradeLevel;
  score: number;
  maxScore: number;
  accuracyPct: number;
  durationSec: number | null;
  summary: string;
  aiFeedback: string | null;
  essayContent: string | null;
  difficulty: string | null;
  weakPoints: string[];
  questionItems: QuestionReviewItem[];
  wordItems: WordsmithReviewItem[];
  createdAt: number;
  updatedAt: number;
}

export interface SubjectStatSummary {
  completedCount: number;
  totalAccuracySum: number;
  avgAccuracyPct: number;
  lastPracticedAt: number;
  lastTitle: string;
}

export interface HumanityProgress {
  s1: number;
  s2: number;
  s3: number;
}

export interface StudentProgressSummary {
  studentUid: string;
  studentEmail: string;
  studentEmailEncoded: string;
  displayName: string;
  avatarId: AvatarId;
  photoURL: string | null;
  grade: GradeLevel;
  updatedAt: number;
  lastActivityAt: number | null;
  rewardsSummary: {
    coins: number;
    xp: number;
    activeTitleId: string;
    streakCurrent: number;
    streakLongest: number;
    lastCompletedDate: string | null;
    dailyDate: string;
    dailyTasks: Record<DailyTaskKey, boolean>;
    dailyGoalAwarded: boolean;
    pendingRedemptionsCount: number;
  };
  subjectStats: Partial<Record<SubjectId, SubjectStatSummary>>;
  mathGeniusProfile: {
    currentDifficulty: string;
    totalQuizzesTaken: number;
    weakCategories: string[];
  } | null;
  wordsmithStats: {
    totalSessions: number;
    totalWords: number;
    avgScore: number;
  } | null;
  humanityProgress: HumanityProgress | null;
}

export function encodeStudentEmailKey(email: string): string {
  return encodeURIComponent(normalizeEmail(email));
}

function cleanStr(raw: unknown, maxLen: number): string {
  if (typeof raw !== 'string') return '';
  return raw
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, '')
    .trim()
    .slice(0, maxLen);
}

function cleanSingleLine(raw: unknown, maxLen: number): string {
  return cleanStr(raw, maxLen).replace(/\s+/g, ' ');
}

function clampNonNegInt(raw: unknown, fallback = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n < 0) return fallback;
  return Math.min(max, Math.floor(n));
}

function clampPositiveInt(raw: unknown, fallback = 0): number {
  const n = Number(raw);
  if (!Number.isFinite(n) || n <= 0) return fallback;
  return Math.floor(n);
}

function isActivityType(val: unknown): val is ActivityType {
  return typeof val === 'string' && (VALID_ACTIVITY_TYPES as readonly string[]).includes(val);
}

function isSubjectId(val: unknown): val is SubjectId {
  return typeof val === 'string' && (VALID_SUBJECT_IDS as readonly string[]).includes(val);
}

export function sanitizeQuestionReviewItem(raw: unknown): QuestionReviewItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const question = cleanStr(obj.question, 600);
  if (!question) return null;

  const item: QuestionReviewItem = {
    question,
    userAnswer: cleanSingleLine(obj.userAnswer, 300),
    correctAnswer: cleanSingleLine(obj.correctAnswer, 300),
    isCorrect: Boolean(obj.isCorrect),
  };

  if (obj.attempts !== undefined && obj.attempts !== null) {
    item.attempts = clampPositiveInt(obj.attempts, 1);
  }
  if (obj.usedHint !== undefined && obj.usedHint !== null) {
    item.usedHint = Boolean(obj.usedHint);
  }
  const cat = cleanSingleLine(obj.category, 80);
  if (cat) {
    item.category = cat;
  }
  return item;
}

export function sanitizeWordsmithReviewItem(raw: unknown): WordsmithReviewItem | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;
  const word = cleanSingleLine(obj.word, 60);
  if (!word) return null;

  const scoreNum = Number(obj.score);
  const score = Number.isFinite(scoreNum) ? Math.min(5, Math.max(0, Math.round(scoreNum))) : 0;

  const item: WordsmithReviewItem = {
    word,
    userSentence: cleanStr(obj.userSentence, 500),
    score,
    feedback: cleanStr(obj.feedback, 800),
    correction: obj.correction === null || obj.correction === undefined
      ? null
      : cleanStr(obj.correction, 500) || null,
    isFallback: Boolean(obj.isFallback),
  };

  const pos = cleanSingleLine(obj.partOfSpeech, 32);
  if (pos) {
    item.partOfSpeech = pos;
  }
  return item;
}

export function sanitizeStudentActivityRecord(
  id: string,
  raw: unknown
): StudentActivityRecord | null {
  const safeId = cleanSingleLine(id, 128).replace(/\//g, '');
  if (!safeId || !raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const studentUid = cleanSingleLine(obj.studentUid, 128);
  const studentEmail = normalizeEmail(obj.studentEmail);
  if (!studentUid || !isValidEmailAddress(studentEmail)) return null;

  const studentEmailEncoded =
    cleanSingleLine(obj.studentEmailEncoded, 320) || encodeStudentEmailKey(studentEmail);

  const type: ActivityType = isActivityType(obj.type) ? obj.type : 'practice';
  const subjectId: SubjectId = isSubjectId(obj.subjectId) ? obj.subjectId : 'english';
  const title = cleanSingleLine(obj.title, 160) || '学习练习';
  const grade: GradeLevel = isValidGrade(obj.grade) ? obj.grade : 'G6';

  const score = clampNonNegInt(obj.score, 0, 100_000);
  const maxScore = clampNonNegInt(obj.maxScore, 0, 100_000);
  const computedAccuracy =
    maxScore > 0 ? Math.min(100, Math.max(0, Math.round((score / maxScore) * 100))) : 0;
  const accuracyPct =
    obj.accuracyPct !== undefined
      ? clampNonNegInt(obj.accuracyPct, computedAccuracy, 100)
      : computedAccuracy;

  const durationSec =
    obj.durationSec === null || obj.durationSec === undefined
      ? null
      : clampNonNegInt(obj.durationSec, 0, 86_400);

  const weakPoints = Array.isArray(obj.weakPoints)
    ? obj.weakPoints
        .map((w) => cleanSingleLine(w, 80))
        .filter(Boolean)
        .slice(0, 10)
    : [];

  const questionItems = Array.isArray(obj.questionItems)
    ? obj.questionItems
        .map(sanitizeQuestionReviewItem)
        .filter((item): item is QuestionReviewItem => item !== null)
        .slice(0, 25)
    : [];

  const wordItems = Array.isArray(obj.wordItems)
    ? obj.wordItems
        .map(sanitizeWordsmithReviewItem)
        .filter((item): item is WordsmithReviewItem => item !== null)
        .slice(0, 25)
    : [];

  const createdAt = clampPositiveInt(obj.createdAt, 1);
  const updatedAt = Math.max(createdAt, clampPositiveInt(obj.updatedAt, createdAt));

  return {
    id: safeId,
    studentUid,
    studentEmail,
    studentEmailEncoded,
    type,
    subjectId,
    title,
    grade,
    score,
    maxScore,
    accuracyPct,
    durationSec,
    summary: cleanSingleLine(obj.summary, 300),
    aiFeedback: obj.aiFeedback === null || obj.aiFeedback === undefined
      ? null
      : cleanStr(obj.aiFeedback, 3000) || null,
    essayContent: obj.essayContent === null || obj.essayContent === undefined
      ? null
      : cleanStr(obj.essayContent, 6000) || null,
    difficulty: obj.difficulty === null || obj.difficulty === undefined
      ? null
      : cleanSingleLine(obj.difficulty, 32) || null,
    weakPoints,
    questionItems,
    wordItems,
    createdAt,
    updatedAt,
  };
}

export function sanitizeSubjectStats(
  raw: unknown
): Partial<Record<SubjectId, SubjectStatSummary>> {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {};
  const obj = raw as Record<string, unknown>;
  const out: Partial<Record<SubjectId, SubjectStatSummary>> = {};

  for (const subjectId of VALID_SUBJECT_IDS) {
    const entry = obj[subjectId];
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) continue;
    const item = entry as Record<string, unknown>;
    const completedCount = clampNonNegInt(item.completedCount, 0, 1_000_000);
    const totalAccuracySum = clampNonNegInt(item.totalAccuracySum, 0, 100_000_000);
    const avgAccuracyPct =
      completedCount > 0
        ? Math.min(100, Math.max(0, Math.round(totalAccuracySum / completedCount)))
        : clampNonNegInt(item.avgAccuracyPct, 0, 100);
    out[subjectId] = {
      completedCount,
      totalAccuracySum,
      avgAccuracyPct,
      lastPracticedAt: clampNonNegInt(item.lastPracticedAt, 0),
      lastTitle: cleanSingleLine(item.lastTitle, 160),
    };
  }
  return out;
}

export function applyActivityToSubjectStats(
  prev: Partial<Record<SubjectId, SubjectStatSummary>>,
  activity: Pick<StudentActivityRecord, 'subjectId' | 'accuracyPct' | 'createdAt' | 'title'> & {
    type?: ActivityType;
  }
): Partial<Record<SubjectId, SubjectStatSummary>> {
  // Extracurricular 中华历史地理大闯关 (type: 'humanity') stays separate from school Humanities mastery.
  if (activity.type === 'humanity') {
    return prev;
  }
  const existing = prev[activity.subjectId];
  const completedCount = (existing?.completedCount ?? 0) + 1;
  const totalAccuracySum = (existing?.totalAccuracySum ?? 0) + clampNonNegInt(activity.accuracyPct, 0, 100);
  const avgAccuracyPct = Math.min(100, Math.max(0, Math.round(totalAccuracySum / completedCount)));

  return {
    ...prev,
    [activity.subjectId]: {
      completedCount,
      totalAccuracySum,
      avgAccuracyPct,
      lastPracticedAt: Math.max(existing?.lastPracticedAt ?? 0, clampPositiveInt(activity.createdAt, 1)),
      lastTitle: cleanSingleLine(activity.title, 160) || existing?.lastTitle || '',
    },
  };
}

export function sanitizeStudentProgressSummary(
  raw: unknown,
  today: string = getLocalDateStr()
): StudentProgressSummary | null {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const obj = raw as Record<string, unknown>;

  const studentUid = cleanSingleLine(obj.studentUid, 128);
  const studentEmail = normalizeEmail(obj.studentEmail);
  if (!studentUid || !isValidEmailAddress(studentEmail)) return null;

  const studentEmailEncoded =
    cleanSingleLine(obj.studentEmailEncoded, 320) || encodeStudentEmailKey(studentEmail);

  const photoURL =
    typeof obj.photoURL === 'string' &&
    obj.photoURL.startsWith('https://') &&
    obj.photoURL.length <= MAX_PHOTO_URL_LENGTH
      ? obj.photoURL
      : null;

  const avatarId: AvatarId = isValidAvatarId(obj.avatarId)
    ? obj.avatarId
    : photoURL
      ? 'google'
      : 'owl';

  const rawRewards =
    obj.rewardsSummary && typeof obj.rewardsSummary === 'object' && !Array.isArray(obj.rewardsSummary)
      ? (obj.rewardsSummary as Record<string, unknown>)
      : {};
  const rawDailyDate =
    typeof rawRewards.dailyDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(rawRewards.dailyDate)
      ? rawRewards.dailyDate
      : today;
  const isToday = rawDailyDate === today;
  const rawDailyTasks =
    rawRewards.dailyTasks && typeof rawRewards.dailyTasks === 'object' && !Array.isArray(rawRewards.dailyTasks)
      ? (rawRewards.dailyTasks as Record<string, unknown>)
      : {};

  const activeTitleId =
    typeof rawRewards.activeTitleId === 'string' && TITLES.some((t) => t.id === rawRewards.activeTitleId)
      ? rawRewards.activeTitleId
      : 'rookie';

  const rawMath =
    obj.mathGeniusProfile && typeof obj.mathGeniusProfile === 'object' && !Array.isArray(obj.mathGeniusProfile)
      ? (obj.mathGeniusProfile as Record<string, unknown>)
      : null;

  const rawWs =
    obj.wordsmithStats && typeof obj.wordsmithStats === 'object' && !Array.isArray(obj.wordsmithStats)
      ? (obj.wordsmithStats as Record<string, unknown>)
      : null;

  const rawHum =
    obj.humanityProgress && typeof obj.humanityProgress === 'object' && !Array.isArray(obj.humanityProgress)
      ? (obj.humanityProgress as Record<string, unknown>)
      : null;

  const avgScoreRaw = rawWs ? Number(rawWs.avgScore) : 0;
  const safeAvgScore =
    Number.isFinite(avgScoreRaw) && avgScoreRaw >= 0
      ? Math.min(5, Math.round(avgScoreRaw * 10) / 10)
      : 0;

  return {
    studentUid,
    studentEmail,
    studentEmailEncoded,
    displayName: sanitizeLinkText(obj.displayName, 64) || studentEmail.split('@')[0] || '同学',
    avatarId,
    photoURL,
    grade: isValidGrade(obj.grade) ? obj.grade : 'G6',
    updatedAt: clampPositiveInt(obj.updatedAt, 1),
    lastActivityAt:
      obj.lastActivityAt === null || obj.lastActivityAt === undefined
        ? null
        : clampPositiveInt(obj.lastActivityAt, 1),
    rewardsSummary: {
      coins: clampNonNegInt(rawRewards.coins, 0),
      xp: clampNonNegInt(rawRewards.xp, 0),
      activeTitleId,
      streakCurrent: clampNonNegInt(rawRewards.streakCurrent, 0),
      streakLongest: clampNonNegInt(rawRewards.streakLongest, 0),
      lastCompletedDate:
        typeof rawRewards.lastCompletedDate === 'string' &&
        /^\d{4}-\d{2}-\d{2}$/.test(rawRewards.lastCompletedDate)
          ? rawRewards.lastCompletedDate
          : null,
      dailyDate: today,
      dailyTasks: isToday
        ? {
            practice: Boolean(rawDailyTasks.practice),
            wordsmith: Boolean(rawDailyTasks.wordsmith),
            challenge: Boolean(rawDailyTasks.challenge),
          }
        : { practice: false, wordsmith: false, challenge: false },
      dailyGoalAwarded: isToday ? Boolean(rawRewards.dailyGoalAwarded) : false,
      pendingRedemptionsCount: clampNonNegInt(rawRewards.pendingRedemptionsCount, 0, 100),
    },
    subjectStats: sanitizeSubjectStats(obj.subjectStats),
    mathGeniusProfile: rawMath
      ? {
          currentDifficulty: cleanSingleLine(rawMath.currentDifficulty, 32) || 'standard',
          totalQuizzesTaken: clampNonNegInt(rawMath.totalQuizzesTaken, 0),
          weakCategories: Array.isArray(rawMath.weakCategories)
            ? rawMath.weakCategories.map((c) => cleanSingleLine(c, 64)).filter(Boolean).slice(0, 10)
            : [],
        }
      : null,
    wordsmithStats: rawWs
      ? {
          totalSessions: clampNonNegInt(rawWs.totalSessions, 0),
          totalWords: clampNonNegInt(rawWs.totalWords, 0),
          avgScore: safeAvgScore,
        }
      : null,
    humanityProgress: rawHum
      ? {
          s1: Math.min(10, Math.max(1, clampPositiveInt(rawHum.s1, 1))),
          s2: Math.min(10, Math.max(1, clampPositiveInt(rawHum.s2, 1))),
          s3: Math.min(10, Math.max(1, clampPositiveInt(rawHum.s3, 1))),
        }
      : null,
  };
}

export function buildRewardsSummary(rewards: RewardsState, today: string = getLocalDateStr()) {
  const isToday = rewards.daily.date === today;
  const activeTitleId = (rewards.activeTitleId || 'rookie').trim().slice(0, 32) || 'rookie';
  const lastCompletedDate =
    typeof rewards.streak.lastCompletedDate === 'string' &&
    /^\d{4}-\d{2}-\d{2}$/.test(rewards.streak.lastCompletedDate)
      ? rewards.streak.lastCompletedDate
      : null;

  return {
    coins: clampNonNegInt(rewards.coins, 0),
    xp: clampNonNegInt(rewards.xp, 0),
    activeTitleId,
    streakCurrent: clampNonNegInt(rewards.streak.current, 0),
    streakLongest: clampNonNegInt(rewards.streak.longest, 0),
    lastCompletedDate,
    dailyDate: today,
    dailyTasks: isToday
      ? {
          practice: Boolean(rewards.daily.tasks.practice),
          wordsmith: Boolean(rewards.daily.tasks.wordsmith),
          challenge: Boolean(rewards.daily.tasks.challenge),
        }
      : { practice: false, wordsmith: false, challenge: false },
    dailyGoalAwarded: isToday ? Boolean(rewards.daily.goalAwarded) : false,
    pendingRedemptionsCount: Math.min(
      1000,
      rewards.redemptions.filter((r) => r.status === 'pending').length
    ),
  };
}

export function computeWordsmithStats(history: SessionRecord[]): StudentProgressSummary['wordsmithStats'] {
  if (!Array.isArray(history) || history.length === 0) {
    return null;
  }
  let totalWords = 0;
  let scoredWords = 0;
  let starSum = 0;
  for (const session of history) {
    const results = Array.isArray(session.results) ? session.results : [];
    totalWords += results.length;
    for (const r of results) {
      if (!r?.evaluation?.isFallback && typeof r?.evaluation?.score === 'number') {
        scoredWords += 1;
        starSum += Math.min(5, Math.max(0, r.evaluation.score));
      }
    }
  }
  const avgScore = scoredWords > 0 ? Math.round((starSum / scoredWords) * 10) / 10 : 0;
  return {
    totalSessions: history.length,
    totalWords,
    avgScore,
  };
}

export function loadLocalHumanityLevels(uid?: string): HumanityProgress {
  const fallback: HumanityProgress = { s1: 1, s2: 1, s3: 1 };
  if (typeof localStorage === 'undefined') return fallback;
  try {
    const key = `k12_humanity_levels_${uid || 'guest'}`;
    const raw = localStorage.getItem(key);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<HumanityProgress>;
      return {
        s1: Math.min(10, Math.max(1, clampPositiveInt(parsed.s1, 1))),
        s2: Math.min(10, Math.max(1, clampPositiveInt(parsed.s2, 1))),
        s3: Math.min(10, Math.max(1, clampPositiveInt(parsed.s3, 1))),
      };
    }
    const legacyS1 = Number(localStorage.getItem('humanity_unlocked_level') || 1);
    const legacyS2 = Number(localStorage.getItem('humanity_s2_unlocked_level') || 1);
    const legacyS3 = Number(localStorage.getItem('humanity_s3_unlocked_level') || 1);
    return {
      s1: Math.min(10, Math.max(1, Number.isFinite(legacyS1) ? Math.floor(legacyS1) : 1)),
      s2: Math.min(10, Math.max(1, Number.isFinite(legacyS2) ? Math.floor(legacyS2) : 1)),
      s3: Math.min(10, Math.max(1, Number.isFinite(legacyS3) ? Math.floor(legacyS3) : 1)),
    };
  } catch {
    return fallback;
  }
}

export function saveLocalHumanityLevels(progress: HumanityProgress, uid?: string): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const clean: HumanityProgress = {
      s1: Math.min(10, Math.max(1, Math.floor(progress.s1 || 1))),
      s2: Math.min(10, Math.max(1, Math.floor(progress.s2 || 1))),
      s3: Math.min(10, Math.max(1, Math.floor(progress.s3 || 1))),
    };
    localStorage.setItem(`k12_humanity_levels_${uid || 'guest'}`, JSON.stringify(clean));
    localStorage.setItem('humanity_unlocked_level', String(clean.s1));
    localStorage.setItem('humanity_s2_unlocked_level', String(clean.s2));
    localStorage.setItem('humanity_s3_unlocked_level', String(clean.s3));
  } catch {
    // Ignore storage quota failures
  }
}
