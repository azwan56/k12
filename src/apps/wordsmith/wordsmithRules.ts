import type { EvaluationResult } from './types';

export type SentenceValidationResult =
  | { ok: true; sentence: string }
  | { ok: false; reason: string };

const ENGLISH_WORD_RE = /[A-Za-z]+(?:['’-][A-Za-z]+)*/g;

/**
 * Validates that a student submitted a multi-word sentence rather than a blank string
 * or simply repeating the target vocabulary word.
 */
export function validateSentenceSubmission(
  targetWord: string,
  rawSentence: string
): SentenceValidationResult {
  const sentence = rawSentence.trim();
  if (!sentence) {
    return { ok: false, reason: '请先写一个包含目标单词的句子。' };
  }

  const tokens = sentence.match(ENGLISH_WORD_RE) ?? [];
  const targetTokens = new Set(
    (targetWord.toLowerCase().match(ENGLISH_WORD_RE) ?? []).filter(Boolean)
  );
  const nonTargetTokens = tokens.filter((t) => !targetTokens.has(t.toLowerCase()));

  if (tokens.length < 2 || nonTargetTokens.length === 0) {
    return {
      ok: false,
      reason: `请用「${targetWord.trim() || '这个词'}」写一个完整的英语句子，不能只填单词本身。`
    };
  }

  return { ok: true, sentence };
}

/** Fallback evaluation returned when the scoring Cloud Function cannot be reached. */
export function createEvaluationFallback(): EvaluationResult {
  return {
    score: 0,
    isFallback: true,
    feedback: '暂时未能连接评分服务，已先保存你的句子，可点击下方按钮重新评分。',
    betterExamples: []
  };
}

/** Sanitizes and validates an evaluation payload from the Cloud Function. */
export function normalizeEvaluationResult(raw: unknown): EvaluationResult {
  if (!raw || typeof raw !== 'object') {
    return createEvaluationFallback();
  }
  const obj = raw as Record<string, unknown>;
  const rawScore = Number(obj.score);
  const feedback = typeof obj.feedback === 'string' ? obj.feedback.trim() : '';
  if (!Number.isFinite(rawScore) || rawScore <= 0 || !feedback) {
    return createEvaluationFallback();
  }

  const correction =
    typeof obj.correction === 'string' && obj.correction.trim()
      ? obj.correction.trim()
      : undefined;

  const betterExamples = Array.isArray(obj.betterExamples)
    ? obj.betterExamples
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 2)
    : [];

  return {
    score: Math.max(1, Math.min(5, Math.round(rawScore))),
    feedback,
    ...(correction ? { correction } : {}),
    betterExamples
  };
}
