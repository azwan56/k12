import type { GradeLevel, SubjectId } from '../data/k12Subjects';
import { getLocalDateStr } from './rewards';
import {
  type ActivityType,
  type StudentActivityRecord,
  isIncompleteActivity,
} from './studentProgress';

export interface DailyMistakeEntry {
  key: string;
  dateKey: string;
  activityId: string;
  activityType: ActivityType;
  subjectId: SubjectId;
  activityTitle: string;
  grade: GradeLevel;
  isIncompleteSession: boolean;
  timestamp: number;
  category?: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  wrongCount: number;
  previousWrongAnswers: string[];
  kind: 'question' | 'wordsmith';
  wordScore?: number;
  wordFeedback?: string;
  wordCorrection?: string | null;
}

export interface DailyMistakesCollection {
  mistakes: DailyMistakeEntry[];
  totalWrongInstances: number;
  uniqueWrongCount: number;
  abortedSessionCount: number;
  completedSessionCount: number;
  answeredQuestionCount: number;
  availableDates: string[];
}

export type MistakeSubjectFilter = 'all' | SubjectId | 'adventure';

const LOCAL_MISTAKES_PREFIX = 'k12_daily_mistakes_v1_';
const MAX_LOCAL_MISTAKES = 100;
const LOCAL_RETENTION_DAYS = 14;
const ABORTED_INACTIVITY_MS = 90_000;

export function getLocalDateKeyFromTs(ts: number): string {
  const safeTs = Number.isFinite(ts) && ts > 0 ? ts : Date.now();
  return getLocalDateStr(new Date(safeTs));
}

export function isActivityLikelyAborted(
  act: StudentActivityRecord,
  allActivities: readonly StudentActivityRecord[],
  nowMs: number = Date.now()
): boolean {
  if (!isIncompleteActivity(act)) return false;
  if (nowMs - act.updatedAt > ABORTED_INACTIVITY_MS) return true;
  return allActivities.some((other) => other.id !== act.id && other.createdAt > act.createdAt);
}

function getLast7DateKeys(now: Date): Set<string> {
  const keys = new Set<string>();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() - i);
    keys.add(getLocalDateStr(d));
  }
  return keys;
}

function matchesSubjectFilter(
  subjectId: SubjectId,
  activityType: ActivityType,
  filter: MistakeSubjectFilter
): boolean {
  if (filter === 'all') return true;
  if (filter === 'adventure') return activityType === 'humanity';
  if (filter === 'humanity') return subjectId === 'humanity' && activityType !== 'humanity';
  return subjectId === filter;
}

function normalizeQuestionKey(
  subjectId: SubjectId,
  activityType: ActivityType,
  kind: 'question' | 'wordsmith',
  question: string
): string {
  const norm = question.replace(/\s+/g, ' ').trim().toLowerCase();
  const trackGroup = activityType === 'humanity' ? 'adv' : 'sch';
  return `${subjectId}|${trackGroup}|${kind}|${norm}`;
}

function addMistakeToMap(
  map: Map<string, DailyMistakeEntry>,
  incoming: Omit<DailyMistakeEntry, 'key' | 'wrongCount' | 'previousWrongAnswers'>
): void {
  const key = normalizeQuestionKey(
    incoming.subjectId,
    incoming.activityType,
    incoming.kind,
    incoming.question
  );
  const existing = map.get(key);
  const cleanUserAnswer = incoming.userAnswer.trim();

  if (!existing) {
    map.set(key, {
      ...incoming,
      key,
      wrongCount: 1,
      previousWrongAnswers: cleanUserAnswer ? [cleanUserAnswer] : [],
    });
    return;
  }

  const wrongSet = new Set(existing.previousWrongAnswers);
  if (cleanUserAnswer) {
    wrongSet.add(cleanUserAnswer);
  }
  const previousWrongAnswers = Array.from(wrongSet);

  if (incoming.timestamp >= existing.timestamp) {
    map.set(key, {
      ...incoming,
      key,
      wrongCount: existing.wrongCount + 1,
      previousWrongAnswers,
      isIncompleteSession: existing.isIncompleteSession || incoming.isIncompleteSession,
    });
  } else {
    map.set(key, {
      ...existing,
      wrongCount: existing.wrongCount + 1,
      previousWrongAnswers,
      isIncompleteSession: existing.isIncompleteSession || incoming.isIncompleteSession,
    });
  }
}

export function collectDailyMistakes(
  activities: readonly StudentActivityRecord[],
  options?: {
    mode?: 'date' | 'last7days';
    dateKey?: string;
    subjectFilter?: MistakeSubjectFilter;
    now?: Date;
    extraEntries?: readonly DailyMistakeEntry[];
  }
): DailyMistakesCollection {
  const now = options?.now ?? new Date();
  const todayKey = getLocalDateStr(now);
  const mode = options?.mode ?? 'date';
  const targetDateKey = options?.dateKey || todayKey;
  const subjectFilter = options?.subjectFilter ?? 'all';
  const last7Keys = getLast7DateKeys(now);
  const nowMs = now.getTime();

  const dateSet = new Set<string>([todayKey]);
  for (const act of activities) {
    if (act.createdAt > 0) {
      dateSet.add(getLocalDateKeyFromTs(act.createdAt));
    }
  }
  for (const entry of options?.extraEntries ?? []) {
    if (entry.dateKey) {
      dateSet.add(entry.dateKey);
    }
  }
  const availableDates = Array.from(dateSet).sort((a, b) => b.localeCompare(a));

  const inDateRange = (dk: string) =>
    mode === 'last7days' ? last7Keys.has(dk) : dk === targetDateKey;

  const syncedActivityIds = new Set<string>();
  let answeredQuestionCount = 0;
  let completedSessionCount = 0;
  let abortedSessionCount = 0;
  let totalWrongInstances = 0;
  const mistakeMap = new Map<string, DailyMistakeEntry>();

  for (const act of activities) {
    syncedActivityIds.add(act.id);
    const dk = getLocalDateKeyFromTs(act.createdAt);
    if (!inDateRange(dk)) continue;
    if (!matchesSubjectFilter(act.subjectId, act.type, subjectFilter)) continue;

    const incomplete = isIncompleteActivity(act);
    const aborted = isActivityLikelyAborted(act, activities, nowMs);
    if (aborted) {
      abortedSessionCount += 1;
    } else if (!incomplete) {
      completedSessionCount += 1;
    }

    const sessionTs = Math.max(act.createdAt, act.updatedAt || act.createdAt);

    if (act.questionItems.length > 0) {
      answeredQuestionCount += act.questionItems.length;
      for (const qItem of act.questionItems) {
        if (qItem.isCorrect) continue;
        totalWrongInstances += 1;
        addMistakeToMap(mistakeMap, {
          dateKey: dk,
          activityId: act.id,
          activityType: act.type,
          subjectId: act.subjectId,
          activityTitle: act.title,
          grade: act.grade,
          isIncompleteSession: incomplete,
          timestamp: sessionTs,
          category: qItem.category,
          question: qItem.question,
          userAnswer: qItem.userAnswer || '未作答',
          correctAnswer: qItem.correctAnswer || '',
          kind: 'question',
        });
      }
    }

    if (act.wordItems.length > 0) {
      answeredQuestionCount += act.wordItems.length;
      for (const wItem of act.wordItems) {
        if (wItem.isFallback || wItem.score > 2) continue;
        totalWrongInstances += 1;
        addMistakeToMap(mistakeMap, {
          dateKey: dk,
          activityId: act.id,
          activityType: act.type,
          subjectId: act.subjectId,
          activityTitle: act.title,
          grade: act.grade,
          isIncompleteSession: incomplete,
          timestamp: sessionTs,
          category: wItem.partOfSpeech ? `Wordsmith · ${wItem.partOfSpeech}` : 'Wordsmith 造句',
          question: `Wordsmith 造句词：${wItem.word}`,
          userAnswer: wItem.userSentence || '（未填写）',
          correctAnswer: wItem.correction || '请结合老师点评重新造句',
          kind: 'wordsmith',
          wordScore: wItem.score,
          wordFeedback: wItem.feedback,
          wordCorrection: wItem.correction ?? null,
        });
      }
    }
  }

  for (const extra of options?.extraEntries ?? []) {
    if (syncedActivityIds.has(extra.activityId)) continue;
    if (!inDateRange(extra.dateKey)) continue;
    if (!matchesSubjectFilter(extra.subjectId, extra.activityType, subjectFilter)) continue;

    // Avoid duplicating a question already present from cloud activities at roughly the same time
    const key = normalizeQuestionKey(
      extra.subjectId,
      extra.activityType,
      extra.kind,
      extra.question
    );
    const existing = mistakeMap.get(key);
    if (existing && Math.abs(existing.timestamp - extra.timestamp) < 120_000) {
      continue;
    }

    totalWrongInstances += Math.max(1, extra.wrongCount || 1);
    addMistakeToMap(mistakeMap, {
      dateKey: extra.dateKey,
      activityId: extra.activityId,
      activityType: extra.activityType,
      subjectId: extra.subjectId,
      activityTitle: extra.activityTitle,
      grade: extra.grade,
      isIncompleteSession: extra.isIncompleteSession,
      timestamp: extra.timestamp,
      category: extra.category,
      question: extra.question,
      userAnswer: extra.userAnswer,
      correctAnswer: extra.correctAnswer,
      kind: extra.kind,
      wordScore: extra.wordScore,
      wordFeedback: extra.wordFeedback,
      wordCorrection: extra.wordCorrection,
    });
  }

  const mistakes = Array.from(mistakeMap.values()).sort((a, b) => b.timestamp - a.timestamp);

  return {
    mistakes,
    totalWrongInstances,
    uniqueWrongCount: mistakes.length,
    abortedSessionCount,
    completedSessionCount,
    answeredQuestionCount,
    availableDates,
  };
}

export function formatMistakesAsMarkdown(
  collection: DailyMistakesCollection,
  studentName: string,
  rangeLabel: string
): string {
  const header = `# ${studentName} · 错题本（${rangeLabel}）`;
  const summary = `作答 ${collection.answeredQuestionCount} 题 | 错题 ${collection.uniqueWrongCount} 道（错答 ${collection.totalWrongInstances} 次）${
    collection.abortedSessionCount > 0 ? ` | 中途退出未完赛 ${collection.abortedSessionCount} 次` : ''
  }`;
  if (collection.mistakes.length === 0) {
    return `${header}\n${summary}\n\n暂无错题记录。`;
  }
  const lines = collection.mistakes.map((m, idx) => {
    const tags = [
      m.activityTitle,
      m.category || '',
      m.isIncompleteSession ? '来自中途退出测试' : '',
      m.wrongCount > 1 ? `错答 ${m.wrongCount} 次` : '',
    ]
      .filter(Boolean)
      .join(' · ');
    const ansLine =
      m.kind === 'wordsmith'
        ? `- 造句评分：${m.wordScore ?? 0}/5 星\n- 孩子造句：${m.userAnswer}\n- 建议表达：${m.correctAnswer}`
        : `- 孩子错答：${m.previousWrongAnswers.join(' / ') || m.userAnswer}\n- 正确答案：${m.correctAnswer}`;
    return `## ${idx + 1}. ${m.question}\n- 来源：${tags}\n${ansLine}`;
  });
  return `${header}\n${summary}\n\n${lines.join('\n\n')}`;
}

function getCutoffDateKey(now: Date = new Date()): string {
  const cutoff = new Date(now);
  cutoff.setDate(now.getDate() - LOCAL_RETENTION_DAYS);
  return getLocalDateStr(cutoff);
}

export function loadLocalDailyMistakes(
  uid: string | null | undefined,
  dateKey?: string
): DailyMistakeEntry[] {
  if (typeof localStorage === 'undefined') return [];
  try {
    const raw = localStorage.getItem(`${LOCAL_MISTAKES_PREFIX}${uid || 'guest'}`);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    const cutoffKey = getCutoffDateKey();
    const list = parsed.filter(
      (item): item is DailyMistakeEntry =>
        Boolean(item) &&
        typeof item === 'object' &&
        typeof item.question === 'string' &&
        typeof item.dateKey === 'string' &&
        item.dateKey >= cutoffKey
    );
    if (!dateKey) return list;
    return list.filter((item) => item.dateKey === dateKey);
  } catch {
    return [];
  }
}

export interface LocalMistakeInput {
  activityId: string;
  activityType: ActivityType;
  subjectId: SubjectId;
  activityTitle: string;
  grade: GradeLevel;
  isIncompleteSession: boolean;
  timestamp?: number;
  category?: string;
  question: string;
  userAnswer: string;
  correctAnswer: string;
  kind?: 'question' | 'wordsmith';
  wordScore?: number;
  wordFeedback?: string;
  wordCorrection?: string | null;
}

export function recordLocalDailyMistake(
  uid: string | null | undefined,
  input: LocalMistakeInput
): void {
  if (typeof localStorage === 'undefined') return;
  const cleanQuestion = (input.question || '').trim();
  if (!cleanQuestion) return;

  try {
    const key = `${LOCAL_MISTAKES_PREFIX}${uid || 'guest'}`;
    const existing = loadLocalDailyMistakes(uid);
    const ts =
      typeof input.timestamp === 'number' && input.timestamp > 0 ? input.timestamp : Date.now();
    const dateKey = getLocalDateKeyFromTs(ts);
    const kind = input.kind ?? 'question';
    const dedupKey = normalizeQuestionKey(input.subjectId, input.activityType, kind, cleanQuestion);

    const entry: DailyMistakeEntry = {
      key: dedupKey,
      dateKey,
      activityId: input.activityId,
      activityType: input.activityType,
      subjectId: input.subjectId,
      activityTitle: input.activityTitle,
      grade: input.grade,
      isIncompleteSession: input.isIncompleteSession,
      timestamp: ts,
      category: input.category,
      question: cleanQuestion,
      userAnswer: input.userAnswer || '未作答',
      correctAnswer: input.correctAnswer || '',
      wrongCount: 1,
      previousWrongAnswers: [input.userAnswer || '未作答'],
      kind,
      wordScore: input.wordScore,
      wordFeedback: input.wordFeedback,
      wordCorrection: input.wordCorrection,
    };

    // Deduplicate same activityId + same question so retries don't bloat storage
    const filtered = existing.filter(
      (item) => !(item.activityId === entry.activityId && item.key === entry.key)
    );
    const next = [...filtered, entry]
      .sort((a, b) => a.timestamp - b.timestamp)
      .slice(-MAX_LOCAL_MISTAKES);
    localStorage.setItem(key, JSON.stringify(next));
  } catch {
    // Ignore storage quota errors
  }
}
