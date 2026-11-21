import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createInitialRewardsState } from '../rewards';
import {
  applyActivityToSubjectStats,
  buildRewardsSummary,
  encodeStudentEmailKey,
  sanitizeStudentActivityRecord,
  sanitizeStudentProgressSummary,
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
