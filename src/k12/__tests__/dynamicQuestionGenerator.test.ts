import { beforeEach, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { generateDynamicQuestions } from '../../data/dynamicQuestionGenerator';
import {
  SUBJECTS,
  type GradeLevel,
  type PracticeDifficulty,
  type SubjectId,
} from '../../data/k12Subjects';
import { buildLocalDynamicRound, DEFAULT_PRACTICE_ROUND_SIZE } from '../dynamicPracticeService';

describe('dynamicQuestionGenerator & buildLocalDynamicRound', () => {
  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  });

  const targets: Array<{
    subjectId: SubjectId;
    grade: GradeLevel;
    trackId?: string;
    difficulties: Array<'all' | PracticeDifficulty>;
  }> = [
    { subjectId: 'ig-math', grade: 'G6', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'ig-math', grade: 'G7', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'shanghai-math', grade: 'G6', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'shanghai-math', grade: 'G7', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'science', grade: 'G6', trackId: 'physics', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'science', grade: 'G6', trackId: 'biology', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'science', grade: 'G6', trackId: 'chemistry', difficulties: ['all', 'foundation', 'standard', 'challenge'] },
    { subjectId: 'science', grade: 'G7', trackId: 'physics', difficulties: ['all'] },
    { subjectId: 'science', grade: 'G7', trackId: 'biology', difficulties: ['all'] },
    { subjectId: 'science', grade: 'G7', trackId: 'chemistry', difficulties: ['all'] },
    { subjectId: 'humanity', grade: 'G6', trackId: 'geography-skills', difficulties: ['all'] },
    { subjectId: 'humanity', grade: 'G7', trackId: 'geography', difficulties: ['all'] },
  ];

  const badArtifactRe = /\b(?:NaN|undefined|Infinity)\b|再算|不对|等等/;

  it('produces valid, distinct, finite questions matching Firestore field limits across 30 iterations per combo', () => {
    for (const cfg of targets) {
      for (const diff of cfg.difficulties) {
        for (let iter = 0; iter < 30; iter++) {
          const generated = generateDynamicQuestions({
            subjectId: cfg.subjectId,
            grade: cfg.grade,
            trackId: cfg.trackId,
            difficulty: diff,
            count: 5,
          });
          assert.ok(
            generated.length >= 3,
            `${cfg.subjectId}/${cfg.grade}/${cfg.trackId || 'main'}/${diff} generated too few: ${generated.length}`
          );

          for (const q of generated) {
            assert.equal(q.dynamicSource, 'procedural');
            assert.ok(q.question.length > 0 && q.question.length <= 600, `${q.id} question length invalid`);
            assert.equal(badArtifactRe.test(q.question), false, `${q.id} bad value in question: ${q.question}`);
            assert.equal(badArtifactRe.test(q.explanation), false, `${q.id} bad value in explanation: ${q.explanation}`);
            assert.ok(q.topic && q.topic.length > 0 && q.topic.length <= 80, `${q.id} invalid topic`);
            assert.equal(q.options.length, 4, `${q.id} must have 4 options`);
            const trimmed = q.options.map((o) => o.trim());
            assert.ok(trimmed.every((o) => o.length > 0 && o.length <= 300), `${q.id} option length invalid`);
            assert.equal(new Set(trimmed).size, 4, `${q.id} options duplicated: ${JSON.stringify(q.options)}`);
            assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3, `${q.id} invalid answer`);
          }
        }
      }
    }
  });

  it('generates varied math questions across repeated restarts rather than fixed sets', () => {
    const runs = Array.from({ length: 4 }, () =>
      generateDynamicQuestions({
        subjectId: 'ig-math',
        grade: 'G6',
        difficulty: 'all',
        count: 6,
      }).map((q) => q.question)
    );
    const uniqueAll = new Set(runs.flat());
    assert.ok(uniqueAll.size >= 16, `Expected high stem variation across 24 draws, got ${uniqueAll.size}`);

    const shRuns = Array.from({ length: 4 }, () =>
      generateDynamicQuestions({
        subjectId: 'shanghai-math',
        grade: 'G6',
        difficulty: 'all',
        count: 6,
      }).map((q) => q.question)
    );
    const shUnique = new Set(shRuns.flat());
    assert.ok(shUnique.size >= 16, `Expected high shanghai-math variation across 24 draws, got ${shUnique.size}`);
  });

  it('builds complete 8-question local dynamic rounds across every subject & grade', () => {
    for (const subj of SUBJECTS) {
      for (const grade of ['G6', 'G7'] as GradeLevel[]) {
        const track = subj.tracks?.[grade]?.[0];
        const round = buildLocalDynamicRound({
          subject: subj,
          grade,
          trackId: track?.id,
          trackName: track?.nameZh,
          difficulty: 'all',
          uid: 'test_stu',
        });
        assert.equal(
          round.questions.length,
          DEFAULT_PRACTICE_ROUND_SIZE,
          `${subj.id} ${grade} expected ${DEFAULT_PRACTICE_ROUND_SIZE} questions`
        );
        const normStems = new Set(round.questions.map((q) => q.question.trim().toLowerCase()));
        assert.equal(normStems.size, DEFAULT_PRACTICE_ROUND_SIZE, `${subj.id} ${grade} duplicate stems in round`);
        for (const q of round.questions) {
          assert.equal(new Set(q.options.map((o) => o.trim())).size, 4);
          assert.ok(q.answer >= 0 && q.answer < 4);
        }
      }
    }
  });
});
