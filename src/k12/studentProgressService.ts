import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  setDoc,
  type Unsubscribe,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { isCnRegion } from '../lib/region';
import { cnApi } from '../lib/cnApi';
import type { GradeLevel, SubjectId } from '../data/k12Subjects';
import { getLearningProfile } from '../apps/mathgenius/services/learningProfileService';
import { getUserHistory } from '../apps/wordsmith/services/storageService';
import type { GuardianLink } from './guardianLinks';
import { MAX_PHOTO_URL_LENGTH, isValidEmailAddress, normalizeEmail } from './guardianLinks';
import { syncStudentLinksProfile } from './guardianLinkService';
import {
  buildDeterministicActivityId,
  enqueuePendingActivity,
  getGuestPendingActivities,
  getPendingActivitiesForUid,
  removePendingActivity,
} from './pendingActivityQueue';
import type { AvatarId, PortalProfile } from './profile';
import type { RewardsState } from './rewards';
import {
  type QuestionReviewItem,
  type RecordActivityInput,
  type StudentActivityRecord,
  type StudentProgressSummary,
  type SubjectStatSummary,
  type WordsmithReviewItem,
  applyActivityToSubjectStats,
  buildRewardsSummary,
  computeWordsmithStats,
  encodeStudentEmailKey,
  isIncompleteActivity,
  loadLocalHumanityLevels,
  sanitizeStudentActivityRecord,
  sanitizeStudentProgressSummary,
  sanitizeSubjectStats,
} from './studentProgress';

export type { RecordActivityInput };

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
    if (isCnRegion()) {
      const existingRes = await cnApi.getProgressSummary();
      const existingData = existingRes.summary as unknown as Record<string, unknown> | null;
      let subjectStats = sanitizeSubjectStats(existingData?.subjectStats);
      let lastActivityAt =
        typeof existingData?.lastActivityAt === 'number' && existingData.lastActivityAt > 0
          ? existingData.lastActivityAt
          : null;

      if (!existingRes.summary) {
        const initialPayload = buildSummaryPayload({
          user,
          studentEmail,
          meta,
          subjectStats,
          lastActivityAt,
          now: Date.now(),
        });
        await cnApi.putProgressSummary(initialPayload);
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
              if (shouldRollIntoStats) {
                subjectStats = applyActivityToSubjectStats(subjectStats, rec);
              }
              if (!lastActivityAt || rec.createdAt > lastActivityAt) {
                lastActivityAt = rec.createdAt;
              }
              const summarySnap = buildSummaryPayload({
                user,
                studentEmail,
                meta,
                subjectStats,
                lastActivityAt,
                now: Date.now(),
              });
              await cnApi.postActivityBatch({ activity: rec, summary: summarySnap, isComplete: true });
            } catch (err) {
              backfillFailures += 1;
              console.warn(`[syncStudentProgressSnapshot:cn] Failed to backfill ${rec.id}:`, err);
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

      const payload = buildSummaryPayload({
        user,
        studentEmail,
        meta,
        subjectStats,
        lastActivityAt,
        now: Date.now(),
      });
      await cnApi.putProgressSummary(payload);
      return;
    }

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
  const now = Date.now();
  const isComplete = input.isComplete !== false;
  const createdAt =
    typeof input.createdAt === 'number' && input.createdAt > 0 ? Math.floor(input.createdAt) : now;
  const rawId = input.id || buildDeterministicActivityId(input.type, createdAt);

  // Persist into durable local outbox BEFORE network I/O so guest sessions or network drops never lose data.
  const queuedInput: RecordActivityInput = {
    ...input,
    id: rawId,
    createdAt,
  };
  const queuedEntry = enqueuePendingActivity(user?.uid ?? null, queuedInput);

  const studentEmail = normalizeEmail(user?.email);
  if (!user?.uid || !isValidEmailAddress(studentEmail)) return null;
  const studentEmailEncoded = encodeStudentEmailKey(studentEmail);

  const record = sanitizeStudentActivityRecord(rawId, {
    ...queuedInput,
    studentUid: user.uid,
    studentEmail,
    studentEmailEncoded,
    createdAt,
    updatedAt: now,
  });
  if (!record) {
    removePendingActivity(rawId, queuedEntry.updatedAt);
    return null;
  }

  let persistedId: string | null = null;

  await enqueueUidWrite(user.uid, async () => {
    if (isCnRegion()) {
      try {
        const [summaryRes, existingActs] = await Promise.all([
          cnApi.getProgressSummary(),
          cnApi.fetchOwnActivities(150),
        ]);
        const existingAct = existingActs.find((a) => a.id === record.id) ?? null;
        const wasAlreadyCompleted = existingAct !== null && !isIncompleteActivity(existingAct);
        if (existingAct && wasAlreadyCompleted) {
          removePendingActivity(record.id, queuedEntry.updatedAt);
          persistedId = record.id;
          return;
        }
        if (existingAct && !wasAlreadyCompleted && !isComplete) {
          const isStaleOutOfOrder =
            record.type === 'wordsmith'
              ? record.wordItems.length < existingAct.wordItems.length
              : record.questionItems.length < existingAct.questionItems.length;
          if (isStaleOutOfOrder) {
            removePendingActivity(record.id, queuedEntry.updatedAt);
            persistedId = record.id;
            return;
          }
        }
        const writeNow = Date.now();
        const recordToWrite: StudentActivityRecord = existingAct
          ? {
              ...record,
              createdAt: existingAct.createdAt,
              updatedAt: Math.max(writeNow, existingAct.updatedAt, record.updatedAt),
            }
          : record;
        const existingData = summaryRes.summary as unknown as Record<string, unknown> | null;
        const prevStats = sanitizeSubjectStats(existingData?.subjectStats);
        const prevLast =
          typeof existingData?.lastActivityAt === 'number' && existingData.lastActivityAt > 0
            ? existingData.lastActivityAt
            : null;
        const nextStats = isComplete ? applyActivityToSubjectStats(prevStats, recordToWrite) : prevStats;
        const nextLastActivityAt = Math.max(
          prevLast ?? 0,
          recordToWrite.updatedAt,
          recordToWrite.createdAt
        );
        const summaryPayload = buildSummaryPayload({
          user,
          studentEmail,
          meta,
          subjectStats: nextStats,
          lastActivityAt: nextLastActivityAt,
          now: writeNow,
        });
        await cnApi.postActivityBatch({
          activity: recordToWrite,
          summary: summaryPayload,
          isComplete,
        });
        removePendingActivity(record.id, queuedEntry.updatedAt);
        persistedId = record.id;
      } catch (err) {
        console.warn('[recordStudentActivity:cn] Failed to persist batch, kept in outbox:', err);
      }
      return;
    }

    const summaryRef = doc(db, STUDENT_PROGRESS_COLLECTION, user.uid);
    const actRef = doc(db, STUDENT_PROGRESS_COLLECTION, user.uid, ACTIVITIES_SUBCOLLECTION, record.id);

    try {
      const [existingSnap, existingActSnap] = await Promise.all([
        getDoc(summaryRef),
        getDoc(actRef),
      ]);

      const existingAct = existingActSnap.exists()
        ? sanitizeStudentActivityRecord(record.id, existingActSnap.data())
        : null;
      const wasAlreadyCompleted = existingAct !== null && !isIncompleteActivity(existingAct);

      // Idempotency guard: completed records are never overwritten with stale outbox data or double-counted.
      if (existingAct && wasAlreadyCompleted) {
        removePendingActivity(record.id, queuedEntry.updatedAt);
        persistedId = record.id;
        return;
      }

      if (existingAct && !wasAlreadyCompleted && !isComplete) {
        const isStaleOutOfOrder =
          record.type === 'wordsmith'
            ? record.wordItems.length < existingAct.wordItems.length
            : record.questionItems.length < existingAct.questionItems.length;
        if (isStaleOutOfOrder) {
          removePendingActivity(record.id, queuedEntry.updatedAt);
          persistedId = record.id;
          return;
        }
      }

      const writeNow = Date.now();
      const recordToWrite: StudentActivityRecord = existingAct
        ? {
            ...record,
            createdAt: existingAct.createdAt,
            updatedAt: Math.max(writeNow, existingAct.updatedAt, record.updatedAt),
          }
        : record;

      const existingData = existingSnap.exists()
        ? (existingSnap.data() as Record<string, unknown>)
        : null;

      const prevStats = sanitizeSubjectStats(existingData?.subjectStats);
      const prevLast =
        typeof existingData?.lastActivityAt === 'number' && existingData.lastActivityAt > 0
          ? existingData.lastActivityAt
          : null;

      const nextStats = isComplete ? applyActivityToSubjectStats(prevStats, recordToWrite) : prevStats;
      const nextLastActivityAt = Math.max(
        prevLast ?? 0,
        recordToWrite.updatedAt,
        recordToWrite.createdAt
      );

      const summaryPayload = buildSummaryPayload({
        user,
        studentEmail,
        meta,
        subjectStats: nextStats,
        lastActivityAt: nextLastActivityAt,
        now: writeNow,
      });

      const batch = writeBatch(db);
      batch.set(actRef, recordToWrite);
      batch.set(summaryRef, summaryPayload);
      await batch.commit();

      removePendingActivity(record.id, queuedEntry.updatedAt);
      persistedId = record.id;

      if (!existingAct || isComplete) {
        void syncStudentLinksProfile(user, {
          displayName: meta.resolvedName,
          avatarId: meta.effectiveAvatarId,
        }).catch(() => {});
      }
    } catch (err) {
      console.warn('[recordStudentActivity] Failed to commit activity batch, kept in local outbox for retry:', err);
    }
  });

  return persistedId;
}

export async function flushPendingActivitiesForUser(
  user: AuthUserLike | null | undefined,
  meta: StudentSyncMeta
): Promise<{ synced: number; failed: number }> {
  const studentEmail = normalizeEmail(user?.email);
  if (!user?.uid || !isValidEmailAddress(studentEmail)) {
    return { synced: 0, failed: 0 };
  }
  const pending = getPendingActivitiesForUid(user.uid);
  if (pending.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  for (const entry of pending) {
    const id = await recordStudentActivity(user, meta, entry.input);
    if (id) {
      synced += 1;
    } else {
      failed += 1;
    }
  }
  return { synced, failed };
}

export async function claimAndFlushGuestActivities(
  user: AuthUserLike | null | undefined,
  meta: StudentSyncMeta
): Promise<{ synced: number; failed: number }> {
  const studentEmail = normalizeEmail(user?.email);
  if (!user?.uid || !isValidEmailAddress(studentEmail)) {
    return { synced: 0, failed: 0 };
  }
  const guestEntries = getGuestPendingActivities();
  if (guestEntries.length === 0) return { synced: 0, failed: 0 };

  let synced = 0;
  let failed = 0;
  for (const entry of guestEntries) {
    const id = await recordStudentActivity(user, meta, entry.input);
    if (id) {
      synced += 1;
    } else {
      failed += 1;
    }
  }
  return { synced, failed };
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
    if (isCnRegion()) {
      await cnApi.patchActivityFeedback(activityId, trimmed.slice(0, 3000));
      return;
    }
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

  if (isCnRegion()) {
    const data = await cnApi.fetchLinkedStudentProgress(link.studentUid);
    const summary = data.summary ? sanitizeStudentProgressSummary(data.summary) : null;
    const activities = Array.isArray(data.activities)
      ? data.activities
          .map((item) => sanitizeStudentActivityRecord(item.id, item))
          .filter((item): item is StudentActivityRecord => item !== null)
      : [];
    return { summary, activities };
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
      limit(100)
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

export function subscribeLinkedStudentProgress(
  link: GuardianLink,
  onUpdate: (result: LinkedStudentProgressResult) => void,
  onError: (err: unknown) => void
): Unsubscribe {
  if (!link.studentUid) {
    onUpdate({ summary: null, activities: [] });
    return () => {};
  }

  if (isCnRegion()) {
    let disposed = false;
    const pollOnce = () => {
      if (disposed) return;
      void fetchLinkedStudentProgress(link)
        .then((res) => {
          if (!disposed) onUpdate(res);
        })
        .catch((err) => {
          if (!disposed) onError(err);
        });
    };

    pollOnce();
    const timer = window.setInterval(() => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        pollOnce();
      }
    }, 15_000);
    const onVis = () => {
      if (document.visibilityState === 'visible') {
        pollOnce();
      }
    };
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVis);
    }
    return () => {
      disposed = true;
      window.clearInterval(timer);
      if (typeof document !== 'undefined') {
        document.removeEventListener('visibilitychange', onVis);
      }
    };
  }

  let disposed = false;
  let latestSummary: StudentProgressSummary | null = null;
  let latestActivities: StudentActivityRecord[] = [];
  let activitiesError = false;
  let subscribedUid: string | null = null;
  let unsubActivities: Unsubscribe | null = null;

  const teardownActivities = () => {
    if (unsubActivities) {
      unsubActivities();
      unsubActivities = null;
    }
    subscribedUid = null;
    latestActivities = [];
    activitiesError = false;
  };

  const emit = () => {
    if (disposed) return;
    onUpdate({
      summary: latestSummary,
      activities: latestActivities,
      ...(activitiesError ? { activitiesError: true } : {}),
    });
  };

  const summaryRef = doc(db, STUDENT_PROGRESS_COLLECTION, link.studentUid);
  const unsubSummary = onSnapshot(
    summaryRef,
    (snap) => {
      if (disposed) return;
      if (!snap.exists()) {
        latestSummary = null;
        teardownActivities();
        emit();
        return;
      }

      const parsed = sanitizeStudentProgressSummary(snap.data());
      if (!parsed) {
        latestSummary = null;
        teardownActivities();
        emit();
        return;
      }

      latestSummary = parsed;
      emit();

      if (subscribedUid !== parsed.studentUid) {
        teardownActivities();
        subscribedUid = parsed.studentUid;
        const activitiesQuery = query(
          collection(db, STUDENT_PROGRESS_COLLECTION, parsed.studentUid, ACTIVITIES_SUBCOLLECTION),
          orderBy('createdAt', 'desc'),
          limit(100)
        );
        unsubActivities = onSnapshot(
          activitiesQuery,
          (actSnap) => {
            if (disposed) return;
            const list: StudentActivityRecord[] = [];
            actSnap.forEach((docSnap) => {
              const item = sanitizeStudentActivityRecord(docSnap.id, docSnap.data());
              if (item) list.push(item);
            });
            latestActivities = list;
            activitiesError = false;
            emit();
          },
          (err) => {
            if (disposed) return;
            console.warn('[subscribeLinkedStudentProgress] Failed to watch activities:', err);
            activitiesError = true;
            emit();
          }
        );
      }
    },
    (err) => {
      if (disposed) return;
      teardownActivities();
      const code = (err as { code?: unknown })?.code;
      if (code === 'permission-denied') {
        onUpdate({ summary: null, activities: [], syncPending: true });
        return;
      }
      onError(err);
    }
  );

  return () => {
    disposed = true;
    unsubSummary();
    teardownActivities();
  };
}

export async function fetchOwnRecentActivities(
  uid: string,
  maxCount = 100
): Promise<StudentActivityRecord[]> {
  if (!uid) return [];
  if (isCnRegion()) {
    const rawList = await cnApi.fetchOwnActivities(maxCount);
    return rawList
      .map((item) => sanitizeStudentActivityRecord(item.id, item))
      .filter((item): item is StudentActivityRecord => item !== null);
  }
  const activitiesQuery = query(
    collection(db, STUDENT_PROGRESS_COLLECTION, uid, ACTIVITIES_SUBCOLLECTION),
    orderBy('createdAt', 'desc'),
    limit(Math.min(150, Math.max(1, maxCount)))
  );
  const actSnap = await getDocs(activitiesQuery);
  const activities: StudentActivityRecord[] = [];
  actSnap.forEach((docSnap) => {
    const parsed = sanitizeStudentActivityRecord(docSnap.id, docSnap.data());
    if (parsed) activities.push(parsed);
  });
  return activities;
}
