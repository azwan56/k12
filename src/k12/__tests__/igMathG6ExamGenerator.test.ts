import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  IG_MATH_G6_EXAM_SIZE,
  IG_MATH_G6_EXAM_TOPICS,
  IG_MATH_G6_REMEDIATION_SIZE,
  type IgMathG6ExamQuestion,
  analyzeExamPerformance,
  generateIgMathG6ExamPaper,
  generateTargetedRemediationPaper,
} from '../../data/igMathG6ExamGenerator';

const BAD_RE = /\b(?:NaN|undefined|Infinity)\b|\[Alt \d+\]/;

function assertValidExamQuestion(q: IgMathG6ExamQuestion) {
  assert.ok(q.question.length > 0 && q.question.length <= 580, `${q.id} question length invalid`);
  assert.ok(q.topicLabel.length > 0 && q.topicLabel.length <= 80, `${q.id} topicLabel invalid`);
  assert.equal(BAD_RE.test(q.question), false, `${q.id} invalid artifact in question: ${q.question}`);
  assert.equal(BAD_RE.test(q.explanation), false, `${q.id} invalid artifact in explanation`);
  assert.equal(q.options.length, 4, `${q.id} must have 4 options`);
  const trimmed = q.options.map((o) => o.trim());
  assert.ok(trimmed.every((o) => o.length > 0 && o.length <= 280), `${q.id} option length invalid`);
  assert.equal(
    new Set(trimmed).size,
    4,
    `${q.id} duplicate options detected: ${JSON.stringify(q.options)}`
  );
  for (const opt of trimmed) {
    assert.equal(BAD_RE.test(opt), false, `${q.id} invalid artifact in option "${opt}"`);
  }
  assert.ok(Number.isInteger(q.answer) && q.answer >= 0 && q.answer <= 3, `${q.id} invalid answer index`);
  assert.ok(q.explanation.length > 0, `${q.id} missing explanation`);

  if (q.diagram?.kind === 'number_line') {
    assert.ok(q.diagram.min < q.diagram.start && q.diagram.start <= q.diagram.max, `${q.id} number_line start out of bounds`);
    if (q.diagram.mode === 'between') {
      assert.ok(q.diagram.end !== undefined && q.diagram.start < q.diagram.end && q.diagram.end <= q.diagram.max, `${q.id} compound number_line bounds invalid`);
    }
  }
}

describe('igMathG6ExamGenerator (20-question exam + 10-question <80% remediation)', () => {
  it('generates balanced 20-question papers (4 per topic) with valid options & diagrams across 100 runs', () => {
    const firstBatchStems: string[] = [];
    const secondBatchStems: string[] = [];

    for (let iter = 0; iter < 100; iter++) {
      const paper = generateIgMathG6ExamPaper();
      assert.equal(paper.length, IG_MATH_G6_EXAM_SIZE);

      const topicCounts = new Map<string, number>();
      const stemSet = new Set<string>();

      for (const q of paper) {
        assertValidExamQuestion(q);
        topicCounts.set(q.topicId, (topicCounts.get(q.topicId) ?? 0) + 1);
        stemSet.add(q.question.trim().toLowerCase());
      }

      assert.equal(stemSet.size, IG_MATH_G6_EXAM_SIZE, 'Expected 20 distinct stems in one exam');
      for (const meta of IG_MATH_G6_EXAM_TOPICS) {
        assert.equal(topicCounts.get(meta.id), 4, `Expected 4 questions for ${meta.id}`);
      }

      if (iter === 0) firstBatchStems.push(...paper.map((q) => q.question));
      if (iter === 1) secondBatchStems.push(...paper.map((q) => q.question));
    }

    const combined = new Set([...firstBatchStems, ...secondBatchStems]);
    assert.ok(combined.size >= 30, `Expected varied questions across papers, got ${combined.size} unique of 40`);
  });

  it('triggers <80% remediation when score < 16/20 and passes when score >= 16/20', () => {
    const paper = generateIgMathG6ExamPaper();

    // 16/20 = 80% -> passes
    const passResults = paper.map((q, idx) => ({
      questionId: q.id,
      isCorrect: idx < 16,
    }));
    const passDiag = analyzeExamPerformance(paper, passResults);
    assert.equal(passDiag.score, 16);
    assert.equal(passDiag.accuracyPct, 80);
    assert.equal(passDiag.passed80, true);

    // 15/20 = 75% -> fails (<80%): miss 3 in interest, 2 in inequalities
    const failResults = paper.map((q) => {
      const wrongInterest = q.topicId === 'interest' && paper.filter((x) => x.topicId === 'interest').indexOf(q) < 3;
      const wrongIneq = q.topicId === 'inequalities' && paper.filter((x) => x.topicId === 'inequalities').indexOf(q) < 2;
      return {
        questionId: q.id,
        isCorrect: !(wrongInterest || wrongIneq),
      };
    });
    const failDiag = analyzeExamPerformance(paper, failResults);
    assert.equal(failDiag.score, 15);
    assert.equal(failDiag.accuracyPct, 75);
    assert.equal(failDiag.passed80, false);

    const remediation = generateTargetedRemediationPaper(paper, failResults, IG_MATH_G6_REMEDIATION_SIZE);
    assert.equal(remediation.questions.length, 10);

    const allocInterest = remediation.allocation.find((a) => a.topicId === 'interest')?.count ?? 0;
    const allocIneq = remediation.allocation.find((a) => a.topicId === 'inequalities')?.count ?? 0;
    assert.equal(allocInterest, 6);
    assert.equal(allocIneq, 4);

    const stage1Stems = new Set(paper.map((q) => q.question.trim().toLowerCase()));
    for (const rq of remediation.questions) {
      assertValidExamQuestion(rq);
      assert.ok(rq.topicId === 'interest' || rq.topicId === 'inequalities');
      assert.equal(stage1Stems.has(rq.question.trim().toLowerCase()), false, 'Remediation repeated Stage 1 stem');
    }
  });

  it('allocates exact 10 targeted questions when all 5 topics have errors or on 100% bonus drill', () => {
    const paper = generateIgMathG6ExamPaper();

    // 2 wrong per topic -> 10/20 = 50%, should give 2 per topic = 10 total
    const allTopicsFail = paper.map((q) => {
      const idxInTopic = paper.filter((x) => x.topicId === q.topicId).indexOf(q);
      return { questionId: q.id, isCorrect: idxInTopic >= 2 };
    });
    const allWeakRem = generateTargetedRemediationPaper(paper, allTopicsFail, 10);
    assert.equal(allWeakRem.questions.length, 10);
    assert.equal(allWeakRem.allocation.length, 5);
    for (const a of allWeakRem.allocation) {
      assert.equal(a.count, 2);
    }

    // 20/20 -> bonus drill still produces 10 valid questions (2 per topic)
    const perfect = paper.map((q) => ({ questionId: q.id, isCorrect: true }));
    const bonus = generateTargetedRemediationPaper(paper, perfect, 10);
    assert.equal(bonus.questions.length, 10);
    for (const bq of bonus.questions) {
      assertValidExamQuestion(bq);
    }
  });
});
