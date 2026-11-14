import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import {
  createEvaluationFallback,
  normalizeEvaluationResult,
  validateSentenceSubmission
} from '../../apps/wordsmith/wordsmithRules.ts';

describe('validateSentenceSubmission', () => {
  it('rejects empty input, bare word repetition, and single-word entries', () => {
    assert.equal(validateSentenceSubmission('Identical', '   ').ok, false);
    assert.equal(validateSentenceSubmission('Identical', 'Identical').ok, false);
    assert.equal(validateSentenceSubmission('Identical', 'identical.').ok, false);
    assert.equal(validateSentenceSubmission('Identical', 'identical identical').ok, false);
    assert.equal(validateSentenceSubmission('give up', 'give up').ok, false);
  });

  it('accepts valid multi-word English sentences including short 2-word sentences', () => {
    const res = validateSentenceSubmission('Identical', '  The two bikes look identical.  ');
    assert.deepEqual(res, { ok: true, sentence: 'The two bikes look identical.' });
    assert.equal(validateSentenceSubmission('Resilient', 'Stay resilient!').ok, true);
  });
});

describe('createEvaluationFallback & normalizeEvaluationResult', () => {
  it('returns 0 stars, isFallback=true, and empty betterExamples on outage fallback', () => {
    const fb = createEvaluationFallback();
    assert.equal(fb.score, 0);
    assert.equal(fb.isFallback, true);
    assert.deepEqual(fb.betterExamples, []);
  });

  it('falls back safely when payload is malformed or missing positive score', () => {
    assert.equal(normalizeEvaluationResult(null).isFallback, true);
    assert.equal(normalizeEvaluationResult({ score: 0, feedback: 'ok' }).isFallback, true);
    assert.equal(normalizeEvaluationResult({ score: 4, feedback: '   ' }).isFallback, true);
  });

  it('clamps valid AI scores to 1..5 and trims examples/correction', () => {
    const normalized = normalizeEvaluationResult({
      score: 9,
      feedback: ' Great sentence! ',
      correction: ' The two twins look identical. ',
      betterExamples: [
        ' The twins wore identical jackets to school. ',
        '',
        ' Both paintings have identical colors. ',
        ' Third extra example should be trimmed. '
      ]
    });
    assert.deepEqual(normalized, {
      score: 5,
      feedback: 'Great sentence!',
      correction: 'The two twins look identical.',
      betterExamples: [
        'The twins wore identical jackets to school.',
        'Both paintings have identical colors.'
      ]
    });
  });
});
