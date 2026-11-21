import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { GradeLevel, SubjectId } from '../data/k12Subjects';
import { getLearningProfile } from '../apps/mathgenius/services/learningProfileService';
import { getUserHistory } from '../apps/wordsmith/services/storageService';
import type { GuardianLink } from './guardianLinks';
import { MAX_PHOTO_URL_LENGTH, isValidEmailAddress, normalizeEmail } from './guardianLinks';
import { syncStudentLinksProfile } from './guardianLinkService';
import type { AvatarId, PortalProfile } from './profile';
import type { RewardsState } from './rewards';
import {
  type ActivityType,
  type QuestionReviewItem,
  type StudentActivityRecord,
  type StudentProgressSummary,
  type SubjectStatSummary,
  type WordsmithReviewItem,
  applyActivityToSubjectStats,
  buildRewardsSummary,
  computeWordsmithStats,
  encodeStudentEmailKey,
  loadLocalHumanityLevels,
  sanitizeStudentActivityRecord,
  sanitizeStudentProgressSummary,
  sanitizeSubjectStats,
} from './studentProgress';

export const STUDENT_PROGRESS_COLLECTION = 'student_progress';
export const ACTIVITIES_SUBCOLLECTION = 'activities';

export interface StudentSyncMeta {
  profile: PortalProfile;
  resolvedName: string;
  effectiveAvatarId: AvatarId;
  rewards: RewardsState;
}

export interface AuthUserLike {
  uid: string;
  email?: string | null;
  photoURL?: string | null;
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
}

const uidWriteQueues = new Map<string, Promise<unknown>>();

function enqueueUidWrite<T>(uid: string, task: () => Promise<T>): Promise<T> {
  const previous = uidWriteQueues.get(uid) ?? Promise.resolve();
  const next = previous.catch(() => undefined).then(task);
  const tail = next.catch(() => undefined);
  uidWriteQueues.set(uid, tail);
  void tail.finally(() => {
    if (uidWriteQueues.get(uid) === tail) {
      uidWriteQueues.delete(uid);
    }
  });
  return next;
}

function resolveSafePhotoURL(photoURL?: string | null): string | null {
  if (
    typeof photoURL === 'string' &&
    photoURL.startsWith('https://') &&
    photoURL.length <= MAX_PHOTO_URL_LENGTH &&
    !/[\s<>"']/.test(photoURL)
  ) {
    return photoURL;
  }
  return null;
}

function buildMathProfileSummary(uid: string): StudentProgressSummary['mathGeniusProfile'] {
  const mathProfile = getLearningProfile(uid);
  const hasStats =
    mathProfile.totalQuizzesTaken > 0 ||
    Object.keys(mathProfile.categoryStats || {}).length > 0;
  if (!hasStats) return null;
  const totalQuizzes = Number(mathProfile.totalQuizzesTaken);
  return {
    currentDifficulty: String(mathProfile.currentDifficulty || 'standard').trim().slice(0, 32) || 'standard',
    totalQuizzesTaken: Number.isFinite(totalQuizzes) && totalQuizzes >= 0 ? Math.floor(totalQuizzes) : 0,
    weakCategories: Array.isArray(mathProfile.weakCategories)
      ? mathProfile.weakCategories
          .map((c) => String(c).trim().slice(0, 64))
          .filter(Boolean)
          .slice(0, 10)
      : [],
  };
}

function buildSummaryPayload(params: {
  user: AuthUserLike;
  studentEmail: string;
  meta: StudentSyncMeta;
  subjectStats: Partial<Record<SubjectId, SubjectStatSummary>>;
  lastActivityAt: number | null;
  now: number;
}): StudentProgressSummary {
  const { user, studentEmail, meta, subjectStats, lastActivityAt, now } = params;
  const wsHistory = getUserHistory(user.uid);
  return {
    studentUid: user.uid,
    studentEmail,
    studentEmailEncoded: encodeStudentEmailKey(studentEmail),
    displayName: (meta.resolvedName || studentEmail.split('@')[0] || '同学').trim().slice(0, 64),
    avatarId: meta.effectiveAvatarId,
    photoURL: resolveSafePhotoURL(user.photoURL),
    grade: meta.profile.grade,
    updatedAt: now,
    lastActivityAt,
    rewardsSummary: buildRewardsSummary(meta.rewards),
    subjectStats,
    mathGeniusProfile: buildMathProfileSummary(user.uid),
    wordsmithStats: computeWordsmithStats(wsHistory),
    humanityProgress: loadLocalHumanityLevels(user.uid),
  };
}

function buildWordsmithBackfillRecords(
  user: AuthUserLike,
  studentEmail: string,
  studentEmailEncoded: string,
  grade: GradeLevel
): StudentActivityRecord[] {
  const history = getUserHistory(user.uid);
  if (history.length === 0) return [];

  const records: StudentActivityRecord[] = [];
  for (const session of history.slice(0, 10)) {
    const results = Array.isArray(session.results) ? session.results : [];
    const wordItems: WordsmithReviewItem[] = results.map((r) => ({
      word: r.wordChallenge?.word || '',
      partOfSpeech: r.wordChallenge?.partOfSpeech,
      userSentence: r.userSentence || '',
      score: r.evaluation?.score ?? 0,
      feedback: r.evaluation?.feedback || '',
      correction: r.evaluation?.correction ?? null,
      isFallback: Boolean(r.evaluation?.isFallback),
    }));
    const scored = wordItems.filter((w) => !w.isFallback);
    const totalStars = scored.reduce((acc, w) => acc + w.score, 0);
    const maxStars = wordItems.length * 5;
    const accuracyPct = maxStars > 0 ? Math.round((totalStars / maxStars) * 100) : 0;
    const createdAt = typeof session.timestamp === 'number' && session.timestamp > 0 ? session.timestamp : Date.now();
    const record = sanitizeStudentActivityRecord(`ws_${session.id}`, {
      id: `ws_${session.id}`,
      studentUid: user.uid,
      studentEmail,
      studentEmailEncoded,
      type: 'wordsmith',
      subjectId: 'english',
      title: session.mode === 'custom' ? 'Wordsmith · 自定义词单造句' : 'Wordsmith · 随机词汇造句',
      grade,
      score: totalStars,
      maxScore: maxStars,
      accuracyPct,
      durationSec: null,
      summary: `完成 ${wordItems.length} 个单词造句，获 ${totalStars}/${maxStars} 星`,
      aiFeedback: null,
      essayContent: null,
      difficulty: null,
      weakPoints: [],
      questionItems: [],
      wordItems,
      createdAt,
      updatedAt: createdAt,
    });
    if (record) records.push(record);
  }
  return records;
}

export async function syncStudentProgressSnapshot(
  user: AuthUserLike,
  meta: StudentSyncMeta
): Promise<void> {
  const studentEmail = normalizeEmail(user?.email);
  if (!user?.uid || !isValidEmailAddress(studentEmail)) return;
  const studentEmailEncoded = encodeStudentEmailKey(studentEmail);

  await enqueueUidWrite(user.uid, async () => {
    const summaryRef = doc(db, STUDENT_PROGRESS_COLLECTION, user.uid);
    const existingSnap = await getDoc(summaryRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as Record<string, unknown>)
      : null;

    let subjectStats = sanitizeSubjectStats(existingData?.subjectStats);
    let lastActivityAt =
      typeof existingData?.lastActivityAt === 'number' && existingData.lastActivityAt > 0
        ? existingData.lastActivityAt
        : null;

    // Persist an initial summary snapshot right away if the progress doc does not exist yet
    // so guardians never see an access error if historical backfill encounters any issue.
    if (!existingSnap.exists()) {
      const initialPayload = buildSummaryPayload({
        user,
        studentEmail,
        meta,
        subjectStats,
        lastActivityAt,
        now: Date.now(),
      });
      await setDoc(summaryRef, initialPayload);
    }

    const backfillKey = `k12_ws_backfill_v1_${user.uid}`;
    const alreadyBackfilled =
      typeof localStorage !== 'undefined' && localStorage.getItem(backfillKey) === '1';

    if (!alreadyBackfilled) {
      const records = buildWordsmithBackfillRecords(
        user,
        studentEmail,
        studentEmailEncoded,
        meta.profile.grade
      );
      let backfillFailures = 0;
      if (records.length > 0) {
        const shouldRollIntoStats = Object.keys(subjectStats).length === 0;
        for (const rec of records) {
          try {
            await setDoc(
              doc(db, STUDENT_PROGRESS_COLLECTION, user.uid, ACTIVITIES_SUBCOLLECTION, rec.id),
              rec,
              { merge: true }
            );
            if (shouldRollIntoStats) {
              subjectStats = applyActivityToSubjectStats(subjectStats, rec);
            }
            if (!lastActivityAt || rec.createdAt > lastActivityAt) {
              lastActivityAt = rec.createdAt;
            }
          } catch (err) {
            backfillFailures += 1;
            console.warn(`[syncStudentProgressSnapshot] Failed to backfill activity ${rec.id}:`, err);
          }
        }
      }
      if (backfillFailures === 0 && typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(backfillKey, '1');
        } catch {
          // Ignore storage quota issues
        }
      }
    }

    const now = Date.now();
    const payload = buildSummaryPayload({
      user,
      studentEmail,
      meta,
      subjectStats,
      lastActivityAt,
      now,
    });
    await setDoc(summaryRef, payload);

    void syncStudentLinksProfile(user, {
      displayName: meta.resolvedName,
      avatarId: meta.effectiveAvatarId,
    }).catch(() => {});
  });
}

export async function recordStudentActivity(
  user: AuthUserLike | null | undefined,
  meta: StudentSyncMeta,
  input: RecordActivityInput
): Promise<string | null> {
  const studentEmail = normalizeEmail(user?.email);
  if (!user?.uid || !isValidEmailAddress(studentEmail)) return null;
  const studentEmailEncoded = encodeStudentEmailKey(studentEmail);

  const now = Date.now();
  const createdAt =
    typeof input.createdAt === 'number' && input.createdAt > 0 ? Math.floor(input.createdAt) : now;
  const rawId =
    input.id || `${input.type}_${createdAt}_${Math.random().toString(36).slice(2, 6)}`;

  const record = sanitizeStudentActivityRecord(rawId, {
    ...input,
    id: rawId,
    studentUid: user.uid,
    studentEmail,
    studentEmailEncoded,
    createdAt,
    updatedAt: now,
  });
  if (!record) return null;

  let persistedId: string | null = null;

  await enqueueUidWrite(user.uid, async () => {
    const summaryRef = doc(db, STUDENT_PROGRESS_COLLECTION, user.uid);
    const existingSnap = await getDoc(summaryRef);
    const existingData = existingSnap.exists()
      ? (existingSnap.data() as Record<string, unknown>)
      : null;

    const prevStats = sanitizeSubjectStats(existingData?.subjectStats);
    const prevLast =
      typeof existingData?.lastActivityAt === 'number' && existingData.lastActivityAt > 0
        ? existingData.lastActivityAt
        : null;

    let activitySaved = false;
    try {
      await setDoc(
        doc(db, STUDENT_PROGRESS_COLLECTION, user.uid, ACTIVITIES_SUBCOLLECTION, record.id),
        record
      );
      activitySaved = true;
      persistedId = record.id;
    } catch (err) {
      console.warn('[recordStudentActivity] Failed to save activity doc:', err);
    }

    const nextStats = activitySaved ? applyActivityToSubjectStats(prevStats, record) : prevStats;
    const nextLastActivityAt = activitySaved
      ? Math.max(prevLast ?? 0, record.createdAt)
      : prevLast;

    const summaryPayload = buildSummaryPayload({
      user,
      studentEmail,
      meta,
      subjectStats: nextStats,
      lastActivityAt: nextLastActivityAt,
      now: Date.now(),
    });
    await setDoc(summaryRef, summaryPayload);

    void syncStudentLinksProfile(user, {
      displayName: meta.resolvedName,
      avatarId: meta.effectiveAvatarId,
    }).catch(() => {});
  });

  return persistedId;
}

export async function updateStudentActivityFeedback(
  user: AuthUserLike | null | undefined,
  activityId: string,
  aiFeedback: string
): Promise<void> {
  const studentEmail = normalizeEmail(user?.email);
  const trimmed = (aiFeedback || '').trim();
  if (!user?.uid || !isValidEmailAddress(studentEmail) || !activityId || !trimmed) return;

  await enqueueUidWrite(user.uid, async () => {
    const ref = doc(
      db,
      STUDENT_PROGRESS_COLLECTION,
      user.uid,
      ACTIVITIES_SUBCOLLECTION,
      activityId
    );
    await updateDoc(ref, {
      aiFeedback: trimmed.slice(0, 3000),
      updatedAt: Date.now(),
    });
  });
}

export interface LinkedStudentProgressResult {
  summary: StudentProgressSummary | null;
  activities: StudentActivityRecord[];
  syncPending?: boolean;
  activitiesError?: boolean;
}

export async function fetchLinkedStudentProgress(
  link: GuardianLink
): Promise<LinkedStudentProgressResult> {
  if (!link.studentUid) {
    return { summary: null, activities: [] };
  }

  let summary: StudentProgressSummary | null = null;
  try {
    const snap = await getDoc(doc(db, STUDENT_PROGRESS_COLLECTION, link.studentUid));
    if (snap.exists()) {
      summary = sanitizeStudentProgressSummary(snap.data());
    }
  } catch (err) {
    const code = (err as { code?: unknown })?.code;
    if (code === 'permission-denied') {
      return { summary: null, activities: [], syncPending: true };
    }
    throw err;
  }

  if (!summary) {
    return { summary: null, activities: [] };
  }

  try {
    const activitiesQuery = query(
      collection(db, STUDENT_PROGRESS_COLLECTION, summary.studentUid, ACTIVITIES_SUBCOLLECTION),
      orderBy('createdAt', 'desc'),
      limit(40)
    );
    const actSnap = await getDocs(activitiesQuery);
    const activities: StudentActivityRecord[] = [];
    actSnap.forEach((docSnap) => {
      const parsed = sanitizeStudentActivityRecord(docSnap.id, docSnap.data());
      if (parsed) activities.push(parsed);
    });

    return { summary, activities };
  } catch (err) {
    console.warn('[fetchLinkedStudentProgress] Failed to load activities:', err);
    return { summary, activities: [], activitiesError: true };
  }
}
