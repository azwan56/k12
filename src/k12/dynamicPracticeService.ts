import { generateDynamicQuestions } from '../data/dynamicQuestionGenerator';
import { isCnRegion } from '../lib/region';
import { cnApi } from '../lib/cnApi';
import type {
  GradeLevel,
  PracticeDifficulty,
  PracticeQuestion,
  Subject,
} from '../data/k12Subjects';
import {
  drawUnseenFromStorage,
  getRecentPracticeStems,
  rememberRecentPracticeStems,
  shuffleOptionsWithAnswer,
} from './questionDedupe';

export const DEFAULT_PRACTICE_ROUND_SIZE = 8;
const AI_PRACTICE_TIMEOUT_MS = 9000;
const CN_AI_PRACTICE_TIMEOUT_MS = 14000;

export interface DynamicRoundResult {
  questions: PracticeQuestion[];
  totalPoolSize: number;
  dynamicCount: number;
  aiCount: number;
}

export interface DynamicRoundParams {
  subject: Subject;
  grade: GradeLevel;
  trackId?: string | null;
  trackName?: string;
  topics?: readonly string[];
  difficulty: 'all' | PracticeDifficulty;
  count?: number;
  uid?: string;
}

function normalizeStem(q: string): string {
  return q.replace(/\s+/g, ' ').trim().toLowerCase();
}

function hasProceduralSupport(subjectId: Subject['id'], trackId?: string | null): boolean {
  if (subjectId === 'ig-math' || subjectId === 'shanghai-math' || subjectId === 'science') {
    return true;
  }
  if (subjectId === 'humanity' && (trackId === 'geography-skills' || trackId === 'geography')) {
    return true;
  }
  return false;
}

function drawStaticUnseen(params: {
  basePool: readonly PracticeQuestion[];
  hasDifficultyTiers: boolean;
  difficulty: 'all' | PracticeDifficulty;
  scope: string;
  count: number;
  excludeStems?: Set<string>;
}): PracticeQuestion[] {
  const { basePool, hasDifficultyTiers, difficulty, scope, count, excludeStems } = params;
  if (count <= 0 || basePool.length === 0) return [];

  const excludeSet = excludeStems ?? new Set<string>();
  const filterExcluded = (pool: readonly PracticeQuestion[]) =>
    pool.filter((q) => !excludeSet.has(normalizeStem(q.question)));

  let rawSelected: PracticeQuestion[] = [];

  if (hasDifficultyTiers && difficulty === 'all') {
    const fPool = filterExcluded(basePool.filter((q) => q.difficulty === 'foundation'));
    const sPool = filterExcluded(basePool.filter((q) => q.difficulty === 'standard'));
    const cPool = filterExcluded(basePool.filter((q) => q.difficulty === 'challenge'));

    if (fPool.length > 0 && sPool.length > 0 && cPool.length > 0) {
      const fQuota = Math.max(1, Math.round(count * 0.35));
      const sQuota = Math.max(1, Math.round(count * 0.35));
      const cQuota = Math.max(0, count - fQuota - sQuota);
      const fDraw = drawUnseenFromStorage(`${scope}_foundation`, fPool, (i) => i.id, fQuota);
      const sDraw = drawUnseenFromStorage(`${scope}_standard`, sPool, (i) => i.id, sQuota);
      const cDraw =
        cQuota > 0
          ? drawUnseenFromStorage(`${scope}_challenge`, cPool, (i) => i.id, cQuota)
          : { selected: [] };
      rawSelected = [...fDraw.selected, ...sDraw.selected, ...cDraw.selected];
    }
  }

  if (rawSelected.length === 0) {
    const tierPool =
      hasDifficultyTiers && difficulty !== 'all'
        ? basePool.filter((q) => q.difficulty === difficulty)
        : basePool;
    const filtered = filterExcluded(tierPool.length > 0 ? tierPool : basePool);
    const effective = filtered.length > 0 ? filtered : tierPool.length > 0 ? tierPool : basePool;
    rawSelected = drawUnseenFromStorage(
      hasDifficultyTiers && difficulty !== 'all' ? `${scope}_${difficulty}` : scope,
      effective,
      (i) => i.id,
      count
    ).selected;
  }

  return rawSelected.slice(0, count).map((q) => {
    const shuffled = shuffleOptionsWithAnswer(q.options, q.answer);
    return { ...q, options: shuffled.options, answer: shuffled.answer };
  });
}

function orderByMixedDifficulty(
  questions: readonly PracticeQuestion[],
  shouldOrder: boolean
): PracticeQuestion[] {
  if (!shouldOrder) return [...questions];
  const rank: Record<string, number> = { foundation: 0, standard: 1, challenge: 2 };
  return [...questions].sort((a, b) => {
    const ra = a.difficulty ? (rank[a.difficulty] ?? 1) : 1;
    const rb = b.difficulty ? (rank[b.difficulty] ?? 1) : 1;
    return ra - rb;
  });
}

export function buildLocalDynamicRound(params: DynamicRoundParams): DynamicRoundResult {
  const { subject, grade, trackId, difficulty, count = DEFAULT_PRACTICE_ROUND_SIZE, uid } = params;
  const basePool = subject.questions.filter(
    (q) => q.grade === grade && (!trackId || q.track === trackId)
  );
  const hasDifficultyTiers = basePool.some((q) => Boolean(q.difficulty));
  const scope = `practice_${uid || 'guest'}_${subject.id}_${grade}_${trackId || 'main'}`;

  const proceduralTarget =
    subject.id === 'ig-math' || subject.id === 'shanghai-math'
      ? Math.min(5, count)
      : hasProceduralSupport(subject.id, trackId)
        ? Math.min(3, count)
        : 0;

  const procedural =
    proceduralTarget > 0
      ? generateDynamicQuestions({
          subjectId: subject.id,
          grade,
          trackId,
          difficulty,
          count: proceduralTarget,
        })
      : [];

  const seenStems = new Set<string>();
  const uniqueProc: PracticeQuestion[] = [];
  for (const q of procedural) {
    const norm = normalizeStem(q.question);
    if (!seenStems.has(norm)) {
      seenStems.add(norm);
      uniqueProc.push(q);
    }
  }

  const staticNeeded = Math.max(0, count - uniqueProc.length);
  const staticSelected = drawStaticUnseen({
    basePool,
    hasDifficultyTiers,
    difficulty,
    scope,
    count: staticNeeded,
    excludeStems: seenStems,
  });

  const combined = orderByMixedDifficulty(
    [...uniqueProc, ...staticSelected].slice(0, count),
    hasDifficultyTiers && difficulty === 'all'
  );

  rememberRecentPracticeStems(
    scope,
    combined.map((q) => q.question)
  );

  return {
    questions: combined,
    totalPoolSize: basePool.length,
    dynamicCount: uniqueProc.length,
    aiCount: 0,
  };
}

interface RawAiPracticeItem {
  question?: unknown;
  options?: unknown;
  answerIndex?: unknown;
  explanation?: unknown;
  topic?: unknown;
  difficulty?: unknown;
}

export async function fetchDynamicPracticeRound(
  params: DynamicRoundParams
): Promise<DynamicRoundResult> {
  const {
    subject,
    grade,
    trackId,
    trackName,
    topics,
    difficulty,
    count = DEFAULT_PRACTICE_ROUND_SIZE,
    uid,
  } = params;

  const basePool = subject.questions.filter(
    (q) => q.grade === grade && (!trackId || q.track === trackId)
  );
  const hasDifficultyTiers = basePool.some((q) => Boolean(q.difficulty));
  const scope = `practice_${uid || 'guest'}_${subject.id}_${grade}_${trackId || 'main'}`;

  if (!uid) {
    return buildLocalDynamicRound(params);
  }

  const proceduralSupported = hasProceduralSupport(subject.id, trackId);
  const aiTarget = proceduralSupported ? Math.min(5, count) : Math.min(6, count);
  const procTarget = proceduralSupported ? Math.min(2, Math.max(0, count - aiTarget)) : 0;

  const recentStems = getRecentPracticeStems(scope, 24);
  const stemSet = new Set<string>(recentStems.map((s) => s.toLowerCase()));

  let aiQuestions: PracticeQuestion[] = [];
  try {
    const reqPayload = {
      subjectId: subject.id,
      grade,
      ...(trackId ? { trackId } : {}),
      ...(trackName ? { trackName } : {}),
      topics: topics ? [...topics].slice(0, 8) : [...(subject.topics[grade] ?? [])].slice(0, 8),
      difficulty,
      count: aiTarget,
      recentStems,
    };

    let rawItems: RawAiPracticeItem[] = [];
    if (isCnRegion()) {
      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('AI practice generation timed out')), CN_AI_PRACTICE_TIMEOUT_MS);
      });
      const result = await Promise.race([
        cnApi.generatePracticeQuestions(reqPayload),
        timeoutPromise,
      ]);
      rawItems = Array.isArray(result.questions) ? (result.questions as RawAiPracticeItem[]) : [];
    } else {
      const [{ httpsCallable }, { functions }] = await Promise.all([
        import('firebase/functions'),
        import('../lib/firebase'),
      ]);

      const callable = httpsCallable<
        typeof reqPayload,
        { questions?: RawAiPracticeItem[] }
      >(functions, 'generatePracticeQuestions');

      const timeoutPromise = new Promise<never>((_, reject) => {
        window.setTimeout(() => reject(new Error('AI practice generation timed out')), AI_PRACTICE_TIMEOUT_MS);
      });

      const result = await Promise.race([
        callable(reqPayload),
        timeoutPromise,
      ]);
      rawItems = Array.isArray(result.data?.questions) ? result.data.questions : [];
    }
    const batchStems = new Set<string>();

    for (let i = 0; i < rawItems.length; i++) {
      const raw = rawItems[i];
      if (!raw || typeof raw !== 'object') continue;
      const qText = typeof raw.question === 'string' ? raw.question.replace(/\s+/g, ' ').trim().slice(0, 550) : '';
      if (!qText) continue;
      const normQ = qText.toLowerCase();
      if (batchStems.has(normQ) || stemSet.has(normQ)) continue;

      if (!Array.isArray(raw.options) || raw.options.length !== 4) continue;
      const cleanOpts = raw.options.map((opt) =>
        typeof opt === 'string' ? opt.replace(/\s+/g, ' ').trim().slice(0, 280) : ''
      );
      if (cleanOpts.some((opt) => !opt) || new Set(cleanOpts).size !== 4) continue;

      const ansIdx = Number(raw.answerIndex);
      if (!Number.isInteger(ansIdx) || ansIdx < 0 || ansIdx > 3) continue;

      const expText =
        typeof raw.explanation === 'string'
          ? raw.explanation.replace(/\s+/g, ' ').trim().slice(0, 400)
          : '';
      if (!expText) continue;

      const topicText =
        typeof raw.topic === 'string'
          ? raw.topic.replace(/\s+/g, ' ').trim().slice(0, 70)
          : trackName || subject.name;
      const diffVal: PracticeDifficulty | undefined =
        raw.difficulty === 'foundation' ||
        raw.difficulty === 'standard' ||
        raw.difficulty === 'challenge'
          ? raw.difficulty
          : difficulty === 'all'
            ? 'standard'
            : difficulty;

      const shuffled = shuffleOptionsWithAnswer(cleanOpts, ansIdx);
      batchStems.add(normQ);
      stemSet.add(normQ);

      aiQuestions.push({
        id: `ai_${subject.id}_${grade}_${Date.now()}_${i}`,
        grade,
        ...(trackId ? { track: trackId } : {}),
        ...(diffVal ? { difficulty: diffVal } : {}),
        topic: topicText,
        question: qText,
        options: shuffled.options,
        answer: shuffled.answer,
        explanation: expText,
        dynamicSource: 'ai',
      });
    }
  } catch (err) {
    console.warn('[fetchDynamicPracticeRound] AI generation fell back to local dynamic round:', err);
  }

  if (aiQuestions.length === 0) {
    return buildLocalDynamicRound(params);
  }

  const procQuestions =
    procTarget > 0
      ? generateDynamicQuestions({
          subjectId: subject.id,
          grade,
          trackId,
          difficulty,
          count: Math.max(procTarget, Math.min(3, count - aiQuestions.length)),
        }).filter((q) => {
          const norm = normalizeStem(q.question);
          if (stemSet.has(norm)) return false;
          stemSet.add(norm);
          return true;
        })
      : [];

  const remainingNeeded = Math.max(0, count - aiQuestions.length - procQuestions.length);
  const staticSelected = drawStaticUnseen({
    basePool,
    hasDifficultyTiers,
    difficulty,
    scope,
    count: remainingNeeded,
    excludeStems: stemSet,
  });

  const combined = orderByMixedDifficulty(
    [...aiQuestions, ...procQuestions, ...staticSelected].slice(0, count),
    hasDifficultyTiers && difficulty === 'all'
  );

  rememberRecentPracticeStems(
    scope,
    combined.map((q) => q.question)
  );

  return {
    questions: combined,
    totalPoolSize: basePool.length,
    dynamicCount: aiQuestions.length + procQuestions.length,
    aiCount: aiQuestions.length,
  };
}
