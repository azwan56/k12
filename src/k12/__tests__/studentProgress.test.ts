import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  collectDailyMistakes,
  formatMistakesAsMarkdown,
  isActivityLikelyAborted,
  loadLocalDailyMistakes,
  recordLocalDailyMistake,
} from '../dailyMistakes';
import {
  clearGuestPendingActivities,
  enqueuePendingActivity,
  getGuestPendingActivities,
  getPendingActivitiesForUid,
  loadPendingActivities,
  MAX_PENDING_ACTIVITIES,
  removePendingActivity,
} from '../pendingActivityQueue';
import { createInitialRewardsState } from '../rewards';
import {
  applyActivityToSubjectStats,
  buildRewardsSummary,
  encodeStudentEmailKey,
  formatInProgressSummary,
  INCOMPLETE_SUMMARY_PREFIX,
  isIncompleteActivity,
  sanitizeStudentActivityRecord,
  sanitizeStudentProgressSummary,
  type RecordActivityInput,
  type StudentActivityRecord,
} from '../studentProgress';

describe('encodeStudentEmailKey', () => {
  it('normalizes casing/whitespace and URL-encodes the student email consistently with buildGuardianLinkId', () => {
    assert.equal(encodeStudentEmailKey('  Kid.One@Gmail.COM '), 'kid.one%40gmail.com');
    assert.equal(encodeStudentEmailKey('a+b@example.com'), 'a%2Bb%40example.com');
  });
});

describe('sanitizeStudentProgressSummary', () => {
  it('rejects records without valid uid or email', () => {
    assert.equal(sanitizeStudentProgressSummary(null, '2026-11-14'), null);
    assert.equal(
      sanitizeStudentProgressSummary({ studentUid: 'u1', studentEmail: 'invalid-email' }, '2026-11-14'),
      null
    );
    assert.equal(
      sanitizeStudentProgressSummary({ studentUid: '', studentEmail: 'kid@example.com' }, '2026-11-14'),
      null
    );
  });

  it('rolls over dailyTasks and dailyGoalAwarded when dailyDate differs from today', () => {
    const rolled = sanitizeStudentProgressSummary(
      {
        studentUid: 'stu_1',
        studentEmail: 'Kid@Example.com',
        displayName: '  小宇 ',
        avatarId: 'invalid-avatar',
        photoURL: 'javascript:alert(1)',
        grade: 'G7',
        updatedAt: 1700000000000,
        lastActivityAt: 1699999000000,
        rewardsSummary: {
          coins: 120,
          xp: 310,
          activeTitleId: 'scientist',
          streakCurrent: 5,
          streakLongest: 9,
          lastCompletedDate: '2026-11-13',
          dailyDate: '2026-11-13',
          dailyTasks: { practice: true, wordsmith: true, challenge: true },
          dailyGoalAwarded: true,
          pendingRedemptionsCount: 250,
        },
        subjectStats: {},
        mathGeniusProfile: null,
        wordsmithStats: null,
        humanityProgress: { s1: 99, s2: 0, s3: 4 },
      },
      '2026-11-14'
    );

    assert.ok(rolled);
    assert.equal(rolled.studentEmail, 'kid@example.com');
    assert.equal(rolled.studentEmailEncoded, 'kid%40example.com');
    assert.equal(rolled.displayName, '小宇');
    assert.equal(rolled.avatarId, 'owl');
    assert.equal(rolled.photoURL, null);
    assert.equal(rolled.grade, 'G7');
    assert.equal(rolled.rewardsSummary.coins, 120);
    assert.equal(rolled.rewardsSummary.dailyDate, '2026-11-14');
    assert.deepEqual(rolled.rewardsSummary.dailyTasks, {
      practice: false,
      wordsmith: false,
      challenge: false,
    });
    assert.equal(rolled.rewardsSummary.dailyGoalAwarded, false);
    assert.equal(rolled.rewardsSummary.pendingRedemptionsCount, 100);
    assert.deepEqual(rolled.humanityProgress, { s1: 10, s2: 1, s3: 4 });
  });

  it('preserves dailyTasks and google photo when dailyDate matches today', () => {
    const sameDay = sanitizeStudentProgressSummary(
      {
        studentUid: 'stu_2',
        studentEmail: 'alice@example.com',
        avatarId: 'google',
        photoURL: 'https://lh3.googleusercontent.com/a/avatar.png',
        grade: 'INVALID',
        updatedAt: 1700000000000,
        rewardsSummary: {
          coins: -5,
          xp: 55,
          activeTitleId: 'unknown',
          dailyDate: '2026-11-14',
          dailyTasks: { practice: true, wordsmith: false, challenge: true },
          dailyGoalAwarded: true,
        },
        wordsmithStats: { totalSessions: 3, totalWords: 15, avgScore: 8.6 },
      },
      '2026-11-14'
    );

    assert.ok(sameDay);
    assert.equal(sameDay.avatarId, 'google');
    assert.equal(sameDay.photoURL, 'https://lh3.googleusercontent.com/a/avatar.png');
    assert.equal(sameDay.grade, 'G6');
    assert.equal(sameDay.rewardsSummary.coins, 0);
    assert.equal(sameDay.rewardsSummary.activeTitleId, 'rookie');
    assert.deepEqual(sameDay.rewardsSummary.dailyTasks, {
      practice: true,
      wordsmith: false,
      challenge: true,
    });
    assert.equal(sameDay.rewardsSummary.dailyGoalAwarded, true);
    assert.equal(sameDay.wordsmithStats?.avgScore, 5);
  });
});

describe('sanitizeStudentActivityRecord', () => {
  it('clamps scores, caps nested lists, and sanitizes malformed fields', () => {
    const manyQuestions = Array.from({ length: 30 }, (_, i) => ({
      question: `Question ${i + 1}`,
      userAnswer: 'A',
      correctAnswer: 'B',
      isCorrect: false,
    }));
    const manyWords = Array.from({ length: 30 }, (_, i) => ({
      word: `word${i + 1}`,
      userSentence: 'Sentence',
      score: 9,
      feedback: 'Good',
    }));

    const rec = sanitizeStudentActivityRecord('act/123', {
      studentUid: 'stu_1',
      studentEmail: 'Kid@Example.com',
      type: 'mathgenius',
      subjectId: 'ig-math',
      title: 'MathGenius · 代数',
      grade: 'G6',
      score: 8,
      maxScore: 10,
      accuracyPct: 140,
      durationSec: 125,
      weakPoints: Array.from({ length: 12 }, (_, i) => `wp_${i}`),
      questionItems: manyQuestions,
      wordItems: manyWords,
      createdAt: 1000,
      updatedAt: 500,
    });

    assert.ok(rec);
    assert.equal(rec.id, 'act123');
    assert.equal(rec.studentEmailEncoded, 'kid%40example.com');
    assert.equal(rec.accuracyPct, 100);
    assert.equal(rec.updatedAt, 1000);
    assert.equal(rec.weakPoints.length, 10);
    assert.equal(rec.questionItems.length, 25);
    assert.equal(rec.wordItems.length, 25);
    assert.equal(rec.wordItems[0].score, 5);
  });

  it('returns null when student email or id is invalid', () => {
    assert.equal(
      sanitizeStudentActivityRecord('', { studentUid: 'stu_1', studentEmail: 'kid@example.com' }),
      null
    );
    assert.equal(
      sanitizeStudentActivityRecord('act_1', { studentUid: 'stu_1', studentEmail: 'bad' }),
      null
    );
  });
});

describe('applyActivityToSubjectStats', () => {
  it('increments subject count, rolling accuracy sum, average, and latest timestamp', () => {
    const first = applyActivityToSubjectStats(
      {},
      { subjectId: 'ig-math', accuracyPct: 80, createdAt: 1000, title: 'Round 1' }
    );
    assert.deepEqual(first['ig-math'], {
      completedCount: 1,
      totalAccuracySum: 80,
      avgAccuracyPct: 80,
      lastPracticedAt: 1000,
      lastTitle: 'Round 1',
    });

    const second = applyActivityToSubjectStats(first, {
      subjectId: 'ig-math',
      accuracyPct: 95,
      createdAt: 2000,
      title: 'Round 2',
    });
    assert.deepEqual(second['ig-math'], {
      completedCount: 2,
      totalAccuracySum: 175,
      avgAccuracyPct: 88,
      lastPracticedAt: 2000,
      lastTitle: 'Round 2',
    });
  });

  it('excludes extracurricular 中华历史地理大闯关 (type: humanity) from school subjectStats while recording science and humanity practice', () => {
    const afterAdventure = applyActivityToSubjectStats(
      {},
      {
        type: 'humanity',
        subjectId: 'humanity',
        accuracyPct: 100,
        createdAt: 1000,
        title: '中华历史地理大闯关 · 第1季 第1关 名山大川',
      }
    );
    assert.equal(afterAdventure['humanity'], undefined);

    const afterSchool = applyActivityToSubjectStats(afterAdventure, {
      type: 'practice',
      subjectId: 'humanity',
      accuracyPct: 88,
      createdAt: 2000,
      title: 'Humanity · 生物群落与人类影响 · 六年级练习',
    });
    assert.equal(afterSchool['humanity']?.completedCount, 1);
    assert.equal(afterSchool['humanity']?.avgAccuracyPct, 88);

    const afterScience = applyActivityToSubjectStats(afterSchool, {
      type: 'practice',
      subjectId: 'science',
      accuracyPct: 100,
      createdAt: 3000,
      title: 'Science · 生物 · 六年级练习',
    });
    assert.equal(afterScience['science']?.completedCount, 1);
    assert.equal(afterScience['science']?.avgAccuracyPct, 100);
  });
});

describe('buildRewardsSummary', () => {
  it('sanitizes empty or invalid lastCompletedDate to null and falls back blank activeTitleId', () => {
    const base = createInitialRewardsState('2026-11-20');
    const summaryInvalid = buildRewardsSummary(
      {
        ...base,
        activeTitleId: '   ',
        streak: { ...base.streak, lastCompletedDate: 'invalid-date' },
      },
      '2026-11-20'
    );
    assert.equal(summaryInvalid.lastCompletedDate, null);
    assert.equal(summaryInvalid.activeTitleId, 'rookie');

    const summaryEmpty = buildRewardsSummary(
      {
        ...base,
        streak: { ...base.streak, lastCompletedDate: '' },
      },
      '2026-11-20'
    );
    assert.equal(summaryEmpty.lastCompletedDate, null);

    const summaryValid = buildRewardsSummary(
      {
        ...base,
        activeTitleId: 'explorer',
        streak: { ...base.streak, lastCompletedDate: '2026-11-20' },
      },
      '2026-11-20'
    );
    assert.equal(summaryValid.lastCompletedDate, '2026-11-20');
    assert.equal(summaryValid.activeTitleId, 'explorer');
  });
});

describe('pendingActivityQueue outbox', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  });

  const makeInput = (id: string, createdAt: number): RecordActivityInput => ({
    id,
    type: 'practice',
    subjectId: 'ig-math',
    title: `IG Math · 练习 ${id}`,
    grade: 'G6',
    score: 7,
    maxScore: 8,
    accuracyPct: 88,
    createdAt,
  });

  it('isolates uid-scoped pending entries from guest and other uid entries, deduplicates, and caps at 30', () => {
    enqueuePendingActivity('stu_1', makeInput('a1', 1000));
    enqueuePendingActivity('stu_1', makeInput('a1', 1500));
    enqueuePendingActivity('stu_2', makeInput('b1', 2000));
    enqueuePendingActivity(null, makeInput('g1', 3000));

    const stu1 = getPendingActivitiesForUid('stu_1');
    assert.equal(stu1.length, 1);
    assert.equal(stu1[0].id, 'a1');
    assert.equal(stu1[0].queuedAt, 1500);

    const stu2 = getPendingActivitiesForUid('stu_2');
    assert.deepEqual(
      stu2.map((e) => e.id),
      ['b1']
    );

    const guest = getGuestPendingActivities();
    assert.deepEqual(
      guest.map((e) => e.id),
      ['g1']
    );

    removePendingActivity('a1');
    assert.equal(getPendingActivitiesForUid('stu_1').length, 0);

    clearGuestPendingActivities();
    assert.equal(getGuestPendingActivities().length, 0);
    assert.deepEqual(
      getPendingActivitiesForUid('stu_2').map((e) => e.id),
      ['b1']
    );

    for (let i = 1; i <= MAX_PENDING_ACTIVITIES + 5; i++) {
      enqueuePendingActivity('stu_1', makeInput(`cap_${i}`, 10_000 + i));
    }
    const all = loadPendingActivities();
    assert.equal(all.length, MAX_PENDING_ACTIVITIES);
    assert.equal(all[0].id, 'cap_6');
    assert.equal(all[all.length - 1].id, `cap_${MAX_PENDING_ACTIVITIES + 5}`);
  });

  it('guards newer outbox revisions when an earlier in-flight write attempts removal', () => {
    const first = enqueuePendingActivity('stu_1', makeInput('race_1', 1000));
    const second = enqueuePendingActivity('stu_1', { ...makeInput('race_1', 1000), score: 2 });
    assert.ok(second.updatedAt > first.updatedAt);

    // Stale removal using first.updatedAt MUST preserve second
    removePendingActivity('race_1', first.updatedAt);
    const remaining = getPendingActivitiesForUid('stu_1');
    assert.equal(remaining.length, 1);
    assert.equal(remaining[0].input.score, 2);

    // Removal matching second.updatedAt cleans it up
    removePendingActivity('race_1', second.updatedAt);
    assert.equal(getPendingActivitiesForUid('stu_1').length, 0);
  });
});

describe('per-question lifecycle helpers & collectDailyMistakes', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  });

  const makeAct = (overrides: Partial<StudentActivityRecord>): StudentActivityRecord => ({
    id: 'act_1',
    studentUid: 'stu_1',
    studentEmail: 'kid@example.com',
    studentEmailEncoded: 'kid%40example.com',
    type: 'practice',
    subjectId: 'ig-math',
    title: 'IG Math · 六年级练习',
    grade: 'G6',
    score: 1,
    maxScore: 8,
    accuracyPct: 50,
    durationSec: 30,
    summary: formatInProgressSummary({ answered: 2, total: 8, correct: 1 }),
    aiFeedback: null,
    essayContent: null,
    difficulty: 'mixed',
    weakPoints: [],
    questionItems: [
      { question: 'Q1 right', userAnswer: '4', correctAnswer: '4', isCorrect: true },
      { question: 'What is 25% of 80?', userAnswer: '15', correctAnswer: '20', isCorrect: false, category: 'Percentages' },
    ],
    wordItems: [],
    createdAt: new Date(2026, 10, 24, 14, 10, 0).getTime(),
    updatedAt: new Date(2026, 10, 24, 14, 10, 30).getTime(),
    ...overrides,
  });

  it('detects incomplete and likely aborted sessions cleanly', () => {
    const now = new Date(2026, 10, 24, 14, 15, 0);
    const partial = makeAct({ id: 'partial_old', updatedAt: new Date(2026, 10, 24, 14, 11, 0).getTime() });
    assert.equal(isIncompleteActivity(partial), true);
    assert.ok(partial.summary.startsWith(INCOMPLETE_SUMMARY_PREFIX));
    assert.equal(isActivityLikelyAborted(partial, [partial], now.getTime()), true);

    const activeNow = makeAct({ id: 'active_now', updatedAt: now.getTime() - 10_000 });
    assert.equal(isActivityLikelyAborted(activeNow, [activeNow], now.getTime()), false);

    // Abandoned immediately when child starts a new session
    const restarted = makeAct({ id: 'new_round', createdAt: now.getTime() - 2_000, updatedAt: now.getTime() - 1_000 });
    assert.equal(isActivityLikelyAborted(activeNow, [activeNow, restarted], now.getTime()), true);

    const finished = makeAct({
      id: 'done_1',
      maxScore: 2,
      summary: '完成 2 题，答对 1 题',
    });
    assert.equal(isIncompleteActivity(finished), false);
    assert.equal(isActivityLikelyAborted(finished, [finished], now.getTime()), false);
  });

  it('collects same-day mistakes across completed & aborted attempts, deduplicates repeats, and separates subjects', () => {
    const now = new Date(2026, 10, 24, 18, 0, 0);
    const todayAbort = makeAct({ id: 'a_today_1' });
    const todayCompleteRepeat = makeAct({
      id: 'a_today_2',
      summary: '完成 2 题，答对 1 题（正确率 50%）',
      maxScore: 2,
      createdAt: new Date(2026, 10, 24, 15, 0, 0).getTime(),
      updatedAt: new Date(2026, 10, 24, 15, 3, 0).getTime(),
      questionItems: [
        { question: 'What is 25% of 80?', userAnswer: '25', correctAnswer: '20', isCorrect: false, category: 'Percentages' },
        { question: 'Solve x + 3 = 9', userAnswer: '5', correctAnswer: '6', isCorrect: false },
      ],
    });
    const todayAdventure = makeAct({
      id: 'a_adv_1',
      type: 'humanity',
      subjectId: 'humanity',
      title: '中华历史地理大闯关',
      maxScore: 1,
      summary: '完成 1 题',
      createdAt: new Date(2026, 10, 24, 16, 0, 0).getTime(),
      updatedAt: new Date(2026, 10, 24, 16, 1, 0).getTime(),
      questionItems: [{ question: '长江发源地是？', userAnswer: '昆仑山', correctAnswer: '唐古拉山', isCorrect: false }],
    });
    const todayWordsmith = makeAct({
      id: 'ws_1',
      type: 'wordsmith',
      subjectId: 'english',
      title: 'Wordsmith',
      maxScore: 15,
      summary: '完成 3 个单词造句',
      questionItems: [],
      wordItems: [
        { word: 'resilient', userSentence: 'resilient.', score: 1, feedback: 'Write a full sentence.', correction: 'The resilient team won.' },
        { word: 'vibrant', userSentence: 'The city market is vibrant.', score: 5, feedback: 'Great!' },
        { word: 'offline', userSentence: 'Test.', score: 1, feedback: 'Fallback', isFallback: true },
      ],
      createdAt: new Date(2026, 10, 24, 16, 30, 0).getTime(),
      updatedAt: new Date(2026, 10, 24, 16, 35, 0).getTime(),
    });
    const yesterdayAct = makeAct({
      id: 'a_yest',
      summary: '完成 1 题',
      maxScore: 1,
      createdAt: new Date(2026, 10, 23, 20, 0, 0).getTime(),
      updatedAt: new Date(2026, 10, 23, 20, 1, 0).getTime(),
      questionItems: [{ question: 'Yesterday miss', userAnswer: '1', correctAnswer: '2', isCorrect: false }],
    });

    const all = [todayAbort, todayCompleteRepeat, todayAdventure, todayWordsmith, yesterdayAct];
    const todayResult = collectDailyMistakes(all, { mode: 'date', dateKey: '2026-11-24', now });

    assert.equal(todayResult.abortedSessionCount, 1);
    assert.equal(todayResult.completedSessionCount, 3);
    assert.equal(todayResult.answeredQuestionCount, 8);
    assert.equal(todayResult.totalWrongInstances, 5);
    assert.equal(todayResult.uniqueWrongCount, 4);

    const repeated = todayResult.mistakes.find((m) => m.question === 'What is 25% of 80?');
    assert.ok(repeated);
    assert.equal(repeated.wrongCount, 2);
    assert.deepEqual(repeated.previousWrongAnswers, ['15', '25']);
    assert.equal(repeated.isIncompleteSession, true);

    assert.ok(todayResult.mistakes.some((m) => m.kind === 'wordsmith' && m.question.includes('resilient')));
    assert.equal(todayResult.mistakes.some((m) => m.question.includes('offline')), false);
    assert.equal(todayResult.mistakes.some((m) => m.question === 'Yesterday miss'), false);

    // Separating school humanity vs adventure
    const schoolHumanity = collectDailyMistakes(all, {
      mode: 'date',
      dateKey: '2026-11-24',
      subjectFilter: 'humanity',
      now,
    });
    assert.equal(schoolHumanity.uniqueWrongCount, 0);

    const advOnly = collectDailyMistakes(all, {
      mode: 'date',
      dateKey: '2026-11-24',
      subjectFilter: 'adventure',
      now,
    });
    assert.equal(advOnly.uniqueWrongCount, 1);

    const last7 = collectDailyMistakes(all, { mode: 'last7days', now });
    assert.ok(last7.mistakes.some((m) => m.question === 'Yesterday miss'));

    const md = formatMistakesAsMarkdown(todayResult, '小宇', '今日 2026-11-24');
    assert.ok(md.includes('What is 25% of 80?'));
    assert.ok(md.includes('来自中途退出测试'));
  });

  it('persists local daily mistakes without duplicating synced cloud activities', () => {
    const ts = new Date(2026, 10, 24, 10, 0, 0).getTime();
    recordLocalDailyMistake('stu_1', {
      activityId: 'local_1',
      activityType: 'practice',
      subjectId: 'science',
      activityTitle: 'Science · 物理与地球',
      grade: 'G6',
      isIncompleteSession: true,
      timestamp: ts,
      category: 'U3 Gravity',
      question: 'Weight on Earth for 8 kg?',
      userAnswer: '8 N',
      correctAnswer: '80 N',
    });

    const loaded = loadLocalDailyMistakes('stu_1', '2026-11-24');
    assert.equal(loaded.length, 1);

    // Merging when activityId is NOT yet in cloud includes local mistake
    const mergedUnsynced = collectDailyMistakes([], {
      mode: 'date',
      dateKey: '2026-11-24',
      now: new Date(ts),
      extraEntries: loaded,
    });
    assert.equal(mergedUnsynced.uniqueWrongCount, 1);

    // Merging when same activityId IS in cloud avoids double counting
    const cloudAct = makeAct({
      id: 'local_1',
      subjectId: 'science',
      createdAt: ts,
      updatedAt: ts,
      questionItems: [{ question: 'Weight on Earth for 8 kg?', userAnswer: '8 N', correctAnswer: '80 N', isCorrect: false }],
    });
    const mergedSynced = collectDailyMistakes([cloudAct], {
      mode: 'date',
      dateKey: '2026-11-24',
      now: new Date(ts),
      extraEntries: loaded,
    });
    assert.equal(mergedSynced.uniqueWrongCount, 1);
    assert.equal(mergedSynced.mistakes[0].wrongCount, 1);
  });
});
