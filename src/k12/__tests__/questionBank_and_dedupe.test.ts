import { describe, it, beforeEach } from 'node:test';
import assert from 'node:assert/strict';
import { ESSAY_PROMPTS, SUBJECTS, type GradeLevel } from '../../data/k12Subjects';
import {
  drawUnseenFromStorage,
  getRecentMathStems,
  rememberRecentMathStems,
  selectUnseenBatch,
  shuffleOptionsWithAnswer,
} from '../questionDedupe';

describe('Expanded K12 question banks and essay prompts', () => {
  it('provides at least 25 distinct valid questions in every subject/grade/track pool and >= 430 total', () => {
    const globalIds = new Set<string>();
    let totalQuestions = 0;

    for (const subj of SUBJECTS) {
      const seenTextsInSubject = new Set<string>();
      for (const q of subj.questions) {
        totalQuestions += 1;
        assert.equal(globalIds.has(q.id), false, `Duplicate question id: ${q.id}`);
        globalIds.add(q.id);

        const normText = q.question.replace(/\s+/g, ' ').trim().toLowerCase();
        assert.equal(
          seenTextsInSubject.has(normText),
          false,
          `Duplicate question prompt in ${subj.id}: ${q.question}`
        );
        seenTextsInSubject.add(normText);

        assert.equal(q.options.length, 4, `${q.id} should have 4 options`);
        assert.equal(
          new Set(q.options.map((o) => o.trim())).size,
          4,
          `${q.id} options should all be distinct`
        );
        assert.ok(q.answer >= 0 && q.answer < q.options.length, `${q.id} invalid answer index`);
        assert.ok(q.explanation.trim().length > 0, `${q.id} missing explanation`);
      }

      for (const grade of ['G6', 'G7'] as GradeLevel[]) {
        const tracks = subj.tracks?.[grade] ?? [];
        if (tracks.length === 0) {
          const pool = subj.questions.filter((q) => q.grade === grade);
          assert.ok(
            pool.length >= 25,
            `${subj.id} ${grade} expected >= 25 questions, got ${pool.length}`
          );
        } else {
          for (const t of tracks) {
            const pool = subj.questions.filter((q) => q.grade === grade && q.track === t.id);
            assert.ok(
              pool.length >= 25,
              `${subj.id} ${grade}/${t.id} expected >= 25 questions, got ${pool.length}`
            );
          }
        }
      }
    }

    assert.ok(totalQuestions >= 430, `Expected >= 430 total questions, got ${totalQuestions}`);
  });

  it('provides at least 12 distinct essay prompts (6 per grade)', () => {
    assert.ok(ESSAY_PROMPTS.length >= 12);
    assert.equal(new Set(ESSAY_PROMPTS.map((p) => p.id)).size, ESSAY_PROMPTS.length);
    assert.ok(ESSAY_PROMPTS.filter((p) => p.grade === 'G6').length >= 6);
    assert.ok(ESSAY_PROMPTS.filter((p) => p.grade === 'G7').length >= 6);
  });
});

describe('selectUnseenBatch & drawUnseenFromStorage', () => {
  const samplePool = Array.from({ length: 10 }, (_, i) => ({ id: `q${i + 1}`, val: i + 1 }));

  beforeEach(() => {
    const store = new Map<string, string>();
    (globalThis as Record<string, unknown>).localStorage = {
      getItem: (k: string) => store.get(k) ?? null,
      setItem: (k: string, v: string) => void store.set(k, String(v)),
      removeItem: (k: string) => void store.delete(k),
      clear: () => store.clear(),
    };
  });

  it('draws completely disjoint unseen batches until the pool is exhausted', () => {
    const first = selectUnseenBatch(samplePool, (q) => q.id, 4, []);
    assert.equal(first.selected.length, 4);
    assert.equal(first.didCycleReset, false);

    const second = selectUnseenBatch(samplePool, (q) => q.id, 4, first.nextSeenIds, first.selected.map((q) => q.id));
    assert.equal(second.selected.length, 4);
    assert.equal(second.didCycleReset, false);

    const combined = new Set([...first.selected, ...second.selected].map((q) => q.id));
    assert.equal(combined.size, 8);

    // Remaining 2 unseen + 2 refilled (avoiding second batch where possible)
    const third = selectUnseenBatch(
      samplePool,
      (q) => q.id,
      4,
      second.nextSeenIds,
      second.selected.map((q) => q.id)
    );
    assert.equal(third.selected.length, 4);
    assert.equal(third.didCycleReset, true);
    assert.equal(new Set(third.selected.map((q) => q.id)).size, 4);

    // The 2 remaining unseen items (not in combined) MUST appear in third
    const remainingUnseen = samplePool.filter((q) => !combined.has(q.id)).map((q) => q.id);
    for (const id of remainingUnseen) {
      assert.ok(third.selected.some((q) => q.id === id), `Expected unseen carry-over ${id}`);
    }
    // And none of second batch should repeat when enough first-batch items exist to refill
    for (const item of second.selected) {
      assert.equal(
        third.selected.some((q) => q.id === item.id),
        false,
        `Should avoid immediately repeating ${item.id} on rollover`
      );
    }
  });

  it('persists seen history across consecutive drawUnseenFromStorage calls', () => {
    const r1 = drawUnseenFromStorage('test_math', samplePool, (q) => q.id, 5);
    const r2 = drawUnseenFromStorage('test_math', samplePool, (q) => q.id, 5);
    assert.equal(r1.totalPoolSize, 10);
    assert.equal(r1.selected.length, 5);
    assert.equal(r2.selected.length, 5);
    const allTen = new Set([...r1.selected, ...r2.selected].map((q) => q.id));
    assert.equal(allTen.size, 10);
  });

  it('remembers and caps recent math stems per uid without duplicates', () => {
    rememberRecentMathStems('u1', ['Q1', 'Q2', 'Q1']);
    rememberRecentMathStems('u1', ['Q3']);
    assert.deepEqual(getRecentMathStems('u1', 10), ['Q2', 'Q1', 'Q3']);
  });
});

describe('shuffleOptionsWithAnswer', () => {
  it('preserves the exact correct option text after shuffling', () => {
    const orig = ['Alpha', 'Beta', 'Gamma', 'Delta'];
    for (let trial = 0; trial < 20; trial++) {
      const res = shuffleOptionsWithAnswer(orig, 2);
      assert.equal(res.options[res.answer], 'Gamma');
      assert.equal(new Set(res.options).size, 4);
    }
  });
});
